import { HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { Paginated } from '../models/api.model';

/** Build query params, dropping empty values. */
export function toParams(query: Record<string, unknown>): HttpParams {
  let params = new HttpParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    params = params.set(key, String(value));
  });
  return params;
}

/**
 * Normalises the backend list response into a `Paginated<T>`.
 * Supports: `T[]`, `{ items|data|results, total|count, page, limit, totalPages }`.
 */
export function toPaginated<T>(raw: unknown, fallbackLimit: number): Paginated<T> {
  if (Array.isArray(raw)) {
    return {
      items: raw as T[],
      total: raw.length,
      page: 1,
      limit: fallbackLimit,
      totalPages: 1,
    };
  }
  const obj = (raw ?? {}) as Record<string, any>;
  const data = obj['data'];
  let candidateItems: any = obj['items'] ?? obj['results'] ?? obj['content'];
  let pagination = obj['pagination'];

  if (data && typeof data === 'object') {
    if (Array.isArray(data)) {
      candidateItems = data;
    } else {
      candidateItems =
        data['petitions'] ??
        data['items'] ??
        data['polls'] ??
        data['results'] ??
        candidateItems;
      pagination = data['pagination'] ?? pagination;
    }
  }

  const items: T[] = Array.isArray(candidateItems) ? candidateItems : [];
  const total = Number(
    pagination?.['total'] ??
    obj['total'] ??
    obj['totalItems'] ??
    obj['count'] ??
    items.length
  );
  const limit = Number(
    pagination?.['limit'] ??
    obj['limit'] ??
    obj['pageSize'] ??
    fallbackLimit
  ) || fallbackLimit;
  const page = Number(
    pagination?.['page'] ??
    obj['page'] ??
    obj['currentPage'] ??
    1
  ) || 1;
  const totalPages = Number(
    pagination?.['totalPages'] ??
    obj['totalPages'] ??
    obj['pages'] ??
    Math.max(1, Math.ceil(total / limit))
  ) || 1;

  return { items, total, page, limit, totalPages };
}

/** Extracts a human-readable message from a backend error. */
export function apiErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'Unable to reach the server. Check your connection and try again.';
    if (error.status === 401) return 'Your session has expired. Please sign in again.';
    if (error.status === 403) return 'You do not have permission to perform this action.';
    if (error.status === 404) return 'The requested item could not be found.';
    const body = error.error as Record<string, unknown> | string | null;
    if (typeof body === 'string' && body.trim()) return body;
    if (body && typeof body === 'object') {
      const message = body['message'] ?? body['error'] ?? body['title'];
      if (typeof message === 'string') return message;
      if (Array.isArray(message) && typeof message[0] === 'string') return message[0];
      const errors = body['errors'];
      if (errors && typeof errors === 'object') {
        const first = Object.values(errors as Record<string, unknown>)[0];
        if (typeof first === 'string') return first;
        if (Array.isArray(first) && typeof first[0] === 'string') return first[0];
      }
    }
    return error.message || fallback;
  }
  return fallback;
}

/** True when the backend simply does not expose the endpoint yet. */
export function isUnavailable(error: unknown): boolean {
  return error instanceof HttpErrorResponse && (error.status === 404 || error.status === 501);
}

export function rethrow(error: unknown): Observable<never> {
  return throwError(() => error);
}
