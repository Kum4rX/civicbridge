import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { API } from '../api/api-endpoints';
import { Paginated } from '../models/api.model';
import { Poll, PollPayload, PollQuery, PollResults } from '../models/poll.model';
import { toPaginated, toParams } from './http-util';

@Injectable({ providedIn: 'root' })
export class PollService {
  private readonly http = inject(HttpClient);

  private unavailable<T>(msg = 'Polls will be available in Milestone 3'): Observable<T> {
    return throwError(
      () =>
        new HttpErrorResponse({
          status: 501,
          statusText: 'Not Implemented',
          error: { message: msg },
        }),
    );
  }

  list(query: PollQuery = {}): Observable<Paginated<Poll>> {
    return this.unavailable<Paginated<Poll>>();
  }

  getById(id: string): Observable<Poll> {
    return this.unavailable<Poll>();
  }

  create(payload: PollPayload): Observable<Poll> {
    return this.unavailable<Poll>();
  }

  vote(id: string, optionId: string): Observable<Poll> {
    return this.unavailable<Poll>();
  }

  results(id: string): Observable<PollResults> {
    return this.unavailable<PollResults>();
  }

  /** Derives percentages when the backend returns raw counts only. */
  private normalise(id: string, raw: unknown): PollResults {
    const body = (raw ?? {}) as Record<string, any>;
    const options = (body['options'] ?? body['results'] ?? []) as Array<Record<string, any>>;
    const total = Number(body['totalVotes'] ?? options.reduce((sum, o) => sum + Number(o['votes'] ?? 0), 0));
    return {
      pollId: String(body['id'] ?? body['pollId'] ?? id),
      question: String(body['question'] ?? ''),
      status: (body['status'] ?? 'ACTIVE') as PollResults['status'],
      totalVotes: total,
      city: body['city'] ?? null,
      state: body['state'] ?? null,
      options: options.map((o) => {
        const votes = Number(o['votes'] ?? o['count'] ?? 0);
        return {
          id: o['id'],
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
