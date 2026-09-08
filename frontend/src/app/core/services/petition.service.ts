import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, throwError } from 'rxjs';
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

  /** Milestone 4 — requires a "petitions I signed" endpoint on the backend. */
  signed(query: PetitionQuery = {}): Observable<Paginated<Petition>> {
    return throwError(
      () =>
        new HttpErrorResponse({
          status: 501,
          statusText: 'Not Implemented',
          error: { message: 'Signed petitions will be available in a later milestone' },
        }),
    );
  }

  /** Milestone 4 — official governance response. */
  respond(id: string, message: string, status?: PetitionStatus): Observable<GovernanceResponse> {
    return throwError(
      () =>
        new HttpErrorResponse({
          status: 501,
          statusText: 'Not Implemented',
          error: { message: 'Official governance responses will be available in Milestone 4' },
        }),
    );
  }

  /** Milestone 4 — official status update. */
  updateStatus(id: string, status: PetitionStatus): Observable<Petition> {
    return throwError(
      () =>
        new HttpErrorResponse({
          status: 501,
          statusText: 'Not Implemented',
          error: { message: 'Status updates will be available in Milestone 4' },
        }),
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
    return {
      ...raw,
      id: raw.id ?? raw._id ?? '',
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
