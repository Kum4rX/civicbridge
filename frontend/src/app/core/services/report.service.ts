import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { API } from '../api/api-endpoints';
import { CategoryStat, MonthlyStat, ReportSummary } from '../models/api.model';
import { toParams } from './http-util';

export interface ReportQuery {
  city?: string;
  state?: string;
  from?: string;
  to?: string;
}

@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly http = inject(HttpClient);

  private unavailable<T>(msg = 'Reports and analytics will be available in Milestone 4'): Observable<T> {
    return throwError(
      () =>
        new HttpErrorResponse({
          status: 501,
          statusText: 'Not Implemented',
          error: { message: msg },
        }),
    );
  }

  summary(query: ReportQuery = {}): Observable<ReportSummary> {
    return this.unavailable<ReportSummary>();
  }

  petitionStats(query: ReportQuery = {}): Observable<{
    byStatus?: CategoryStat[];
    byCategory?: CategoryStat[];
    monthly?: MonthlyStat[];
  }> {
    return this.unavailable<{
      byStatus?: CategoryStat[];
      byCategory?: CategoryStat[];
      monthly?: MonthlyStat[];
    }>();
  }

  pollStats(query: ReportQuery = {}): Observable<{
    byStatus?: CategoryStat[];
    participation?: CategoryStat[];
    monthly?: MonthlyStat[];
  }> {
    return this.unavailable<{
      byStatus?: CategoryStat[];
      participation?: CategoryStat[];
      monthly?: MonthlyStat[];
    }>();
  }

  sentiment(query: ReportQuery = {}): Observable<MonthlyStat[]> {
    return this.unavailable<MonthlyStat[]>();
  }

  export(format: 'csv' | 'pdf', query: ReportQuery = {}): Observable<Blob> {
    return this.unavailable<Blob>();
  }
}
