import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { API } from '../api/api-endpoints';
import { Paginated } from '../models/api.model';
import { Poll, PollPayload, PollQuery, PollResults, PollStatus, PollOption } from '../models/poll.model';
import { AuthService } from './auth.service';
import { toPaginated, toParams } from './http-util';

@Injectable({ providedIn: 'root' })
export class PollService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  list(query: PollQuery = {}): Observable<Paginated<Poll>> {
    const limit = query.limit ?? environment.defaultPageSize;
    const params = toParams(this.formatQuery({ ...query, limit }));
    return this.http
      .get<unknown>(API.polls.list, { params })
      .pipe(
        map((raw) => {
          const paginated = toPaginated<any>(raw, limit);
          return {
            ...paginated,
            items: (paginated.items ?? []).map((item) => this.normalisePoll(item)),
          };
        }),
      );
  }

  getById(id: string): Observable<Poll> {
    return this.http.get<unknown>(API.polls.byId(id)).pipe(
      map((res: any) => this.normalisePoll(res?.data?.poll ?? res?.poll ?? res?.data ?? res)),
    );
  }

  create(payload: PollPayload): Observable<Poll> {
    const body = this.formatPayload(payload);
    return this.http.post<unknown>(API.polls.create, body).pipe(
      map((res: any) => this.normalisePoll(res?.data?.poll ?? res?.poll ?? res?.data ?? res)),
    );
  }

  vote(id: string, optionId: string): Observable<Poll> {
    return this.http.post<unknown>(API.polls.vote(id), { optionId }).pipe(
      map((res: any) => this.normalisePoll(res?.data?.poll ?? res?.poll ?? res?.data ?? res)),
    );
  }

  results(id: string): Observable<PollResults> {
    return this.http.get<unknown>(API.polls.results(id)).pipe(
      map((res: any) => this.normaliseResults(id, res?.data ?? res)),
    );
  }

  updateStatus(id: string, status: 'active' | 'closed' | 'ACTIVE' | 'CLOSED'): Observable<Poll> {
    const formattedStatus = status.toLowerCase();
    return this.http.patch<unknown>(API.polls.status(id), { status: formattedStatus }).pipe(
      map((res: any) => this.normalisePoll(res?.data?.poll ?? res?.poll ?? res?.data ?? res)),
    );
  }

  formatPayload(payload: PollPayload): Record<string, any> {
    const user = this.auth.user();
    const city = (payload.city && payload.city.trim()) || (payload.targetLocation?.city && payload.targetLocation.city.trim()) || user?.city || '';
    const state = (payload.state && payload.state.trim()) || (payload.targetLocation?.state && payload.targetLocation.state.trim()) || user?.state || '';
    const address = (payload.address && payload.address.trim()) || (payload.targetLocation?.address && payload.targetLocation.address.trim()) || user?.address || '';
    const pincode = (payload.pincode && payload.pincode.trim()) || (payload.targetLocation?.pincode && payload.targetLocation.pincode.trim()) || user?.pincode || '';

    const title = (payload.title || payload.question || '').trim();
    const body: Record<string, any> = {
      title,
      question: title,
      options: payload.options.map((o) => ({ text: o.text.trim() })),
      targetLocation: {
        city,
        state,
        address,
        pincode,
      },
      location: {
        city,
        state,
        address,
        pincode,
      },
      city,
      state,
    };

    if (payload.description && payload.description.trim()) {
      body['description'] = payload.description.trim();
    }
    if (payload.category && payload.category.trim()) {
      body['category'] = payload.category.trim();
    }
    const closingDate = payload.closingDate || payload.endDate;
    if (closingDate) {
      body['endDate'] = closingDate;
      body['closingDate'] = closingDate;
    }

    return body;
  }

  formatQuery(query: PollQuery): Record<string, any> {
    const q: Record<string, any> = {};
    if (query.search && query.search.trim()) q['search'] = query.search.trim();
    if (query.category && query.category.trim()) q['category'] = query.category.trim();
    if (query.city && query.city.trim()) q['city'] = query.city.trim();
    if (query.state && query.state.trim()) q['state'] = query.state.trim();
    if (query.status) {
      q['status'] = query.status.toLowerCase();
    }
    if (query.page) q['page'] = query.page;
    if (query.limit) q['limit'] = query.limit;
    if (query.sortBy) q['sortBy'] = query.sortBy;
    if (query.order) q['order'] = query.order;
    return q;
  }

  normalisePoll(raw: unknown): Poll {
    if (!raw || typeof raw !== 'object') return raw as Poll;
    const p = raw as Record<string, any>;
    const id = String(p['id'] ?? p['_id'] ?? '');
    const question = String(p['question'] ?? p['title'] ?? '');
    const statusRaw = String(p['status'] ?? 'active').toUpperCase();
    const status: PollStatus = statusRaw === 'CLOSED' ? 'CLOSED' : 'ACTIVE';
    const loc = (p['targetLocation'] || p['location'] || {}) as Record<string, any>;
    const optionsRaw = (p['options'] ?? []) as Array<Record<string, any>>;
    const options: PollOption[] = optionsRaw.map((o) => ({
      id: String(o['id'] ?? o['_id'] ?? ''),
      _id: String(o['_id'] ?? o['id'] ?? ''),
      text: String(o['text'] ?? ''),
      votes: Number(o['votes'] ?? o['votesCount'] ?? 0),
      votesCount: Number(o['votesCount'] ?? o['votes'] ?? 0),
    }));
    const creator = p['creator'] || p['createdBy'];
    return {
      id,
      _id: id,
      question,
      title: question,
      description: p['description'] ?? '',
      options,
      status,
      totalVotes: Number(p['totalVotes'] ?? options.reduce((sum, o) => sum + (o.votes || 0), 0)),
      category: p['category'] ?? '',
      hasVoted: Boolean(p['hasVoted']),
      votedOptionId: p['votedOptionId'] ? String(p['votedOptionId']) : null,
      closingDate: p['closingDate'] ?? p['endDate'] ?? null,
      endDate: p['endDate'] ?? p['closingDate'] ?? null,
      city: p['city'] ?? loc['city'] ?? null,
      state: p['state'] ?? loc['state'] ?? null,
      address: p['address'] ?? loc['address'] ?? null,
      pincode: p['pincode'] ?? loc['pincode'] ?? null,
      targetLocation: {
        city: p['city'] ?? loc['city'] ?? null,
        state: p['state'] ?? loc['state'] ?? null,
        address: p['address'] ?? loc['address'] ?? null,
        pincode: p['pincode'] ?? loc['pincode'] ?? null,
      },
      createdBy: creator
        ? {
            id: String(creator['id'] ?? creator['_id'] ?? ''),
            _id: String(creator['_id'] ?? creator['id'] ?? ''),
            fullName: String(creator['fullName'] ?? creator['name'] ?? ''),
            name: String(creator['name'] ?? creator['fullName'] ?? ''),
          }
        : undefined,
      creator: creator
        ? {
            id: String(creator['id'] ?? creator['_id'] ?? ''),
            _id: String(creator['_id'] ?? creator['id'] ?? ''),
            fullName: String(creator['fullName'] ?? creator['name'] ?? ''),
            name: String(creator['name'] ?? creator['fullName'] ?? ''),
          }
        : undefined,
      createdAt: p['createdAt'] ?? null,
    };
  }

  normaliseResults(id: string, raw: unknown): PollResults {
    const body = (raw ?? {}) as Record<string, any>;
    const options = (body['options'] ?? body['results'] ?? []) as Array<Record<string, any>>;
    const total = Number(body['totalVotes'] ?? options.reduce((sum, o) => sum + Number(o['votes'] ?? 0), 0));
    const statusRaw = String(body['status'] ?? 'ACTIVE').toUpperCase();
    const status: PollStatus = statusRaw === 'CLOSED' ? 'CLOSED' : 'ACTIVE';
    const loc = (body['targetLocation'] || body['location'] || {}) as Record<string, any>;
    return {
      pollId: String(body['pollId'] ?? body['id'] ?? body['_id'] ?? id),
      question: String(body['question'] ?? body['title'] ?? ''),
      title: String(body['title'] ?? body['question'] ?? ''),
      status,
      totalVotes: total,
      city: body['city'] ?? loc['city'] ?? null,
      state: body['state'] ?? loc['state'] ?? null,
      location: {
        city: body['city'] ?? loc['city'] ?? null,
        state: body['state'] ?? loc['state'] ?? null,
      },
      options: options.map((o) => {
        const votes = Number(o['votes'] ?? o['votesCount'] ?? o['count'] ?? 0);
        return {
          id: String(o['id'] ?? o['_id'] ?? ''),
          _id: String(o['_id'] ?? o['id'] ?? ''),
          text: String(o['text'] ?? o['option'] ?? ''),
          votes,
          percentage:
            o['percentage'] !== undefined
              ? Number(o['percentage'])
              : total > 0
                ? Math.round((votes / total) * 1000) / 10
                : 0,
        };
      }),
    };
  }
}