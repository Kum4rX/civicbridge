import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { API } from '../api/api-endpoints';
import { Paginated } from '../models/api.model';
import {
  GovernanceResponse,
  Petition,
  PetitionPayload,
  PetitionQuery,
  PetitionStatus,
} from '../models/petition.model';
import { toPaginated, toParams } from './http-util';

@Injectable({ providedIn: 'root' })
export class PetitionService {
  private readonly http = inject(HttpClient);

  list(query: PetitionQuery = {}): Observable<Paginated<Petition>> {
    const limit = query.limit ?? environment.defaultPageSize;
    const params = toParams(this.formatQuery({ ...query, limit }));
    return this.http
      .get<unknown>(API.petitions.list, { params })
      .pipe(
        map((raw) => {
          const paginated = toPaginated<any>(raw, limit);
          return {
            ...paginated,
            items: (paginated.items ?? []).map((item) => this.normalisePetition(item)),
          };
        })
      );
  }

  getById(id: string): Observable<Petition> {
    return this.http.get<unknown>(API.petitions.byId(id)).pipe(
      map((res: any) => this.normalisePetition(res?.data?.petition ?? res?.petition ?? res?.data ?? res))
    );
  }

  create(payload: PetitionPayload): Observable<Petition> {
    const body = this.formatPayload(payload);
    return this.http.post<unknown>(API.petitions.create, body).pipe(
      map((res: any) => this.normalisePetition(res?.data?.petition ?? res?.petition ?? res?.data ?? res))
    );
  }

  update(id: string, payload: PetitionPayload): Observable<Petition> {
    const body = this.formatPayload(payload);
    return this.http.put<unknown>(API.petitions.update(id), body).pipe(
      map((res: any) => this.normalisePetition(res?.data?.petition ?? res?.petition ?? res?.data ?? res))
    );
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(API.petitions.remove(id));
  }

  sign(id: string): Observable<Petition> {
    return this.http.post<unknown>(API.petitions.sign(id), {}).pipe(
      map((res: any) => this.normalisePetition(res?.data?.petition ?? res?.petition ?? res?.data ?? res))
    );
  }

  mine(query: PetitionQuery = {}): Observable<Paginated<Petition>> {
    const limit = query.limit ?? environment.defaultPageSize;
    const params = toParams(this.formatQuery({ ...query, limit }));
    return this.http
      .get<unknown>(API.petitions.mine, { params })
      .pipe(
        map((raw) => {
          const paginated = toPaginated<any>(raw, limit);
          return {
            ...paginated,
            items: (paginated.items ?? []).map((item) => this.normalisePetition(item)),
          };
        })
      );
  }

  /** Milestone 4 — petitions signed by the authenticated user */
  signed(query: PetitionQuery = {}): Observable<Paginated<Petition>> {
    const limit = query.limit ?? environment.defaultPageSize;
    const params = toParams(this.formatQuery({ ...query, limit }));
    return this.http
      .get<unknown>(API.petitions.signed, { params })
      .pipe(
        map((raw) => {
          const paginated = toPaginated<any>(raw, limit);
          return {
            ...paginated,
            items: (paginated.items ?? []).map((item) => this.normalisePetition(item)),
          };
        })
      );
  }

  /** Milestone 4 — official governance response */
  respond(id: string, message: string, status?: PetitionStatus): Observable<GovernanceResponse> {
    const payload: Record<string, unknown> = { message };
    if (status) {
      payload['status'] = status.toLowerCase();
    }
    return this.http
      .post<unknown>(API.petitions.respond(id), payload)
      .pipe(
        map((res: any) => {
          const resp = res?.data?.response ?? res?.response ?? res?.data ?? res;
          return {
            id: resp.id ?? resp._id,
            message: resp.message,
            status: resp.status ? (resp.status.toUpperCase() as PetitionStatus) : undefined,
            respondedBy: resp.respondedBy,
            createdAt: resp.createdAt,
          };
        })
      );
  }

  /** Milestone 4 — official status update */
  updateStatus(id: string, status: PetitionStatus): Observable<Petition> {
    return this.http
      .patch<unknown>(API.petitions.status(id), { status: status.toLowerCase() })
      .pipe(
        map((res: any) => this.normalisePetition(res?.data?.petition ?? res?.petition ?? res?.data ?? res))
      );
  }

  /** Mirrors the backend rule: creator + zero signatures. UX only; backend is authoritative. */
  canModify(petition: Petition | null, userId?: string | null): boolean {
    if (!petition || !userId) return false;
    const creatorId = petition.creatorId ?? petition.creator?.id;
    return creatorId === userId && (petition.signaturesCount ?? 0) === 0;
  }

  normalisePetition(raw: any): Petition {
    if (!raw || typeof raw !== 'object') return raw;
    const loc = raw.location && typeof raw.location === 'object' ? raw.location : {};
    const rawStatus = (raw.status ?? 'ACTIVE').toString().toUpperCase();
    const responses = Array.isArray(raw.responses)
      ? raw.responses.map((r: any) => ({
          id: r.id ?? r._id ?? '',
          message: r.message ?? '',
          status: r.status ? (r.status.toUpperCase() as PetitionStatus) : undefined,
          respondedBy: r.officialName
            ? { fullName: r.officialName, id: r.official }
            : r.respondedBy,
          createdAt: r.createdAt ?? null,
        }))
      : [];

    return {
      ...raw,
      id: raw.id ?? raw._id ?? '',
      title: raw.title ?? '',
      description: raw.description ?? '',
      category: raw.category ?? 'Other',
      status: rawStatus as PetitionStatus,
      signaturesCount: Number(raw.signaturesCount) || 0,
      targetSignatures: Number(raw.targetSignatures) || 100,
      city: raw.city ?? loc.city ?? null,
      state: raw.state ?? loc.state ?? null,
      address: raw.address ?? loc.address ?? null,
      pincode: raw.pincode ?? loc.pincode ?? null,
      latitude: raw.latitude ?? loc.latitude ?? null,
      longitude: raw.longitude ?? loc.longitude ?? null,
      creatorId:
        raw.creatorId ??
        raw.creator?.id ??
        raw.creator?._id ??
        (typeof raw.creator === 'string' ? raw.creator : undefined),
      hasSigned: !!raw.hasSigned,
      signedAt: raw.signedAt ?? null,
      responses,
    };
  }

  private formatPayload(payload: PetitionPayload): Record<string, unknown> {
    return {
      title: payload.title,
      description: payload.description,
      category: payload.category,
      tags: payload.tags ?? [],
      targetSignatures: payload.targetSignatures,
      mediaUrls: payload.mediaUrls ?? [],
      location: {
        address: payload.address ?? '',
        city: payload.city ?? '',
        state: payload.state ?? '',
        pincode: payload.pincode ?? '',
        latitude: payload.latitude ?? null,
        longitude: payload.longitude ?? null,
      },
      city: payload.city ?? '',
      state: payload.state ?? '',
      address: payload.address ?? '',
      pincode: payload.pincode ?? '',
    };
  }

  private formatQuery(query: PetitionQuery): Record<string, unknown> {
    const q: Record<string, unknown> = { ...query };
    if (q['status']) {
      q['status'] = String(q['status']).toLowerCase();
    }
    if (q['sort']) {
      const sort = String(q['sort']);
      if (sort === 'newest') {
        q['sortBy'] = 'createdAt';
        q['order'] = 'desc';
      } else if (sort === 'oldest') {
        q['sortBy'] = 'createdAt';
        q['order'] = 'asc';
      } else if (sort === 'signatures') {
        q['sortBy'] = 'signaturesCount';
        q['order'] = 'desc';
      } else if (sort === 'closing') {
        q['sortBy'] = 'targetSignatures';
        q['order'] = 'asc';
      }
      delete q['sort'];
    }
    return q;
  }
}
