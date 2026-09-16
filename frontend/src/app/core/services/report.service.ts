import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API } from '../api/api-endpoints';
import { CategoryStat, MonthlyStat, ReportSummary } from '../models/api.model';
import { toParams } from './http-util';

export interface ReportQuery {
  city?: string;
  state?: string;
  from?: string;
  to?: string;
  month?: number | string;
  year?: number | string;
}

@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly http = inject(HttpClient);

  summary(query: ReportQuery = {}): Observable<ReportSummary> {
    const params = toParams(query as Record<string, unknown>);
    return this.http
      .get<unknown>(API.reports.summary, { params })
      .pipe(
        map((res: any) => res?.data?.summary ?? res?.summary ?? res?.data ?? res)
      );
  }

  petitionStats(query: ReportQuery = {}): Observable<{
    byStatus?: CategoryStat[];
    byCategory?: CategoryStat[];
    monthly?: MonthlyStat[];
  }> {
    const params = toParams(query as Record<string, unknown>);
    return this.http
      .get<unknown>(API.reports.petitions, { params })
      .pipe(
        map((res: any) => {
          const data = res?.data ?? res;
          return {
            byStatus: data?.byStatus ?? [],
            byCategory: data?.byCategory ?? [],
            monthly: data?.monthly ?? [],
          };
        })
      );
  }

  pollStats(query: ReportQuery = {}): Observable<{
    byStatus?: CategoryStat[];
    participation?: CategoryStat[];
    monthly?: MonthlyStat[];
  }> {
    const params = toParams(query as Record<string, unknown>);
    return this.http
      .get<unknown>(API.reports.polls, { params })
      .pipe(
        map((res: any) => {
          const data = res?.data ?? res;
          return {
            byStatus: data?.byStatus ?? [],
            participation: data?.participation ?? [],
            monthly: data?.monthly ?? [],
          };
        })
      );
  }

  sentiment(query: ReportQuery = {}): Observable<MonthlyStat[]> {
    const params = toParams(query as Record<string, unknown>);
    return this.http
      .get<unknown>(API.reports.sentiment, { params })
      .pipe(
        map((res: any) => {
          const raw = res?.data?.series ?? res?.data ?? res?.series ?? res;
          return Array.isArray(raw) ? raw : [];
        })
      );
  }

  export(format: 'csv' | 'pdf', query: ReportQuery = {}): Observable<Blob> {
    const params = toParams({ ...(query as Record<string, unknown>), format });
    return this.http.get(API.reports.export, {
      params,
      responseType: 'blob',
    });
  }
}
