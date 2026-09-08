import { DecimalPipe, NgFor, NgIf } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CategoryStat, LoadState, MonthlyStat, ReportSummary } from '../../core/models/api.model';
import { AuthService } from '../../core/services/auth.service';
import { apiErrorMessage, isUnavailable } from '../../core/services/http-util';
import { NotificationService } from '../../core/services/notification.service';
import { ReportQuery, ReportService } from '../../core/services/report.service';
import { BarChartComponent } from '../../shared/components/bar-chart.component';
import { DonutChartComponent } from '../../shared/components/donut-chart.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state.component';
import { LoaderComponent } from '../../shared/components/loader.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';

interface Metric {
  label: string;
  value: number;
  hint: string;
}

/**
 * Milestone 4 — reports & analytics.
 * Every section is driven by the real reports API. Endpoints the backend does
 * not expose (404/501) render an explicit "Not available" state — never mock data.
 */
@Component({
  selector: 'cx-reports',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    DecimalPipe,
    FormsModule,
    PageHeaderComponent,
    LoaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    BarChartComponent,
    DonutChartComponent,
  ],
  template: `
    <cx-page-header
      eyebrow="Insights"
      title="Reports & analytics"
      subtitle="Measure civic participation across petitions and polls in your community."
    >
      <button class="btn btn--ghost" (click)="loadAll()">Refresh</button>
      <button
        class="btn btn--primary"
        *ngIf="exportState() !== 'unavailable'"
        [disabled]="exportState() === 'loading'"
        (click)="exportReport('csv')"
      >
        <span class="spinner" *ngIf="exportState() === 'loading'"></span>Export CSV
      </button>
    </cx-page-header>

    <section class="card filters" aria-label="Filter reports">
      <div class="filters__grid">
        <label class="field">
          <span class="field__label">City</span>
          <input class="input" [(ngModel)]="city" placeholder="All cities" />
        </label>
        <label class="field">
          <span class="field__label">State</span>
          <input class="input" [(ngModel)]="state" placeholder="All states" />
        </label>
        <label class="field">
          <span class="field__label">From</span>
          <input class="input" type="date" [(ngModel)]="from" />
        </label>
        <label class="field">
          <span class="field__label">To</span>
          <input class="input" type="date" [(ngModel)]="to" />
        </label>
      </div>
      <div class="row filters__actions">
        <button class="btn btn--primary btn--sm" (click)="loadAll()">Apply</button>
        <button class="btn btn--ghost btn--sm" (click)="useMyLocality()">My locality</button>
        <button class="btn btn--ghost btn--sm" (click)="clear()">Clear</button>
      </div>
    </section>

    <!-- Summary metrics -->
    <cx-loader *ngIf="summaryState() === 'loading'" variant="rows" [count]="2"></cx-loader>

    <cx-error-state
      *ngIf="summaryState() === 'error'"
      title="Couldn’t load the summary"
      [message]="summaryError()"
      (retry)="loadSummary()"
    ></cx-error-state>

    <cx-empty-state
      *ngIf="summaryState() === 'unavailable'"
      icon="⚙"
      title="Summary not available"
      message="The reports summary endpoint is not exposed by the backend yet."
    ></cx-empty-state>

    <section class="grid grid-4 metrics" *ngIf="summaryState() === 'loaded'">
      <div class="card metric" *ngFor="let m of metrics()">
        <span class="muted small">{{ m.label }}</span>
        <strong>{{ m.value | number }}</strong>
        <span class="muted small">{{ m.hint }}</span>
      </div>
    </section>

    <!-- Petition analytics -->
    <section class="grid grid-2 charts">
      <div class="card">
        <h2 class="card__title">Petitions by status</h2>
        <cx-loader
          *ngIf="petitionState() === 'loading'"
          variant="inline"
          label="Loading petition analytics…"
        ></cx-loader>
        <cx-error-state
          *ngIf="petitionState() === 'error'"
          title="Couldn’t load petition analytics"
          [message]="petitionError()"
          (retry)="loadPetitionStats()"
        ></cx-error-state>
        <p class="muted small" *ngIf="petitionState() === 'unavailable'">
          Not available — the backend does not expose petition report analytics.
        </p>
        <cx-donut-chart
          *ngIf="petitionState() === 'loaded'"
          [data]="petitionByStatus()"
          centerLabel="petitions"
          ariaLabel="Petitions by status"
        ></cx-donut-chart>
      </div>

      <div class="card">
        <h2 class="card__title">Petitions by category</h2>
        <cx-loader
          *ngIf="petitionState() === 'loading'"
          variant="inline"
          label="Loading categories…"
        ></cx-loader>
        <p class="muted small" *ngIf="petitionState() === 'unavailable'">
          Not available — the backend does not expose petition report analytics.
        </p>
        <cx-bar-chart
          *ngIf="petitionState() === 'loaded'"
          [data]="petitionByCategory()"
          ariaLabel="Petitions by category"
        ></cx-bar-chart>
      </div>
    </section>

    <!-- Poll analytics -->
    <section class="grid grid-2 charts">
      <div class="card">
        <h2 class="card__title">Polls by status</h2>
        <cx-loader
          *ngIf="pollState() === 'loading'"
          variant="inline"
          label="Loading poll analytics…"
        ></cx-loader>
        <cx-error-state
          *ngIf="pollState() === 'error'"
          title="Couldn’t load poll analytics"
          [message]="pollError()"
          (retry)="loadPollStats()"
        ></cx-error-state>
        <p class="muted small" *ngIf="pollState() === 'unavailable'">
          Not available — the backend does not expose poll report analytics.
        </p>
        <cx-donut-chart
          *ngIf="pollState() === 'loaded'"
          [data]="pollByStatus()"
          centerLabel="polls"
          ariaLabel="Polls by status"
        ></cx-donut-chart>
      </div>

      <div class="card">
        <h2 class="card__title">Poll participation</h2>
        <cx-loader
          *ngIf="pollState() === 'loading'"
          variant="inline"
          label="Loading participation…"
        ></cx-loader>
        <p class="muted small" *ngIf="pollState() === 'unavailable'">
          Not available — the backend does not expose poll report analytics.
        </p>
        <cx-bar-chart
          *ngIf="pollState() === 'loaded'"
          [data]="pollParticipation()"
          color="var(--c-accent, #0f9d8f)"
          ariaLabel="Poll participation"
        ></cx-bar-chart>
      </div>
    </section>

    <!-- Monthly trend -->
    <section class="card" *ngIf="petitionState() === 'loaded' && monthlyTrend().length">
      <h2 class="card__title">Monthly petition activity</h2>
      <cx-bar-chart [data]="monthlyTrend()" ariaLabel="Monthly petition activity"></cx-bar-chart>
    </section>

    <!-- Sentiment (integration point) -->
    <section class="card">
      <h2 class="card__title">Public sentiment trend</h2>
      <cx-loader
        *ngIf="sentimentState() === 'loading'"
        variant="inline"
        label="Loading sentiment…"
      ></cx-loader>
      <cx-error-state
        *ngIf="sentimentState() === 'error'"
        title="Couldn’t load sentiment"
        [message]="sentimentError()"
        (retry)="loadSentiment()"
      ></cx-error-state>
      <cx-empty-state
        *ngIf="sentimentState() === 'unavailable'"
        icon="⚙"
        title="Not available"
        message="This backend does not expose a sentiment endpoint, so no trend is shown."
      ></cx-empty-state>
      <cx-bar-chart
        *ngIf="sentimentState() === 'loaded'"
        [data]="sentimentSeries()"
        color="var(--c-warning, #b25e09)"
        ariaLabel="Public sentiment trend"
      ></cx-bar-chart>
    </section>

    <p class="muted small export-note" *ngIf="exportState() === 'unavailable'">
      Data export is not available — the backend does not expose a report export endpoint.
    </p>
  `,
  styles: [
    `
      .filters {
        margin-bottom: 20px;
      }
      .filters__grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 14px;
      }
      .filters__actions {
        margin-top: 16px;
        flex-wrap: wrap;
      }
      .metrics {
        margin-bottom: 20px;
      }
      .metric {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .metric strong {
        font-size: 1.7rem;
      }
      .charts {
        margin-bottom: 20px;
      }
      .card__title {
        font-size: 1.05rem;
        margin-bottom: 16px;
      }
      .export-note {
        margin-top: 16px;
      }
    `,
  ],
})
export class ReportsPage implements OnInit {
  private readonly reports = inject(ReportService);
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotificationService);

  city = '';
  state = '';
  from = '';
  to = '';

  readonly summaryState = signal<LoadState>('idle');
  readonly summaryError = signal('');
  readonly metrics = signal<Metric[]>([]);

  readonly petitionState = signal<LoadState>('idle');
  readonly petitionError = signal('');
  readonly petitionByStatus = signal<CategoryStat[]>([]);
  readonly petitionByCategory = signal<CategoryStat[]>([]);
  readonly monthlyTrend = signal<CategoryStat[]>([]);

  readonly pollState = signal<LoadState>('idle');
  readonly pollError = signal('');
  readonly pollByStatus = signal<CategoryStat[]>([]);
  readonly pollParticipation = signal<CategoryStat[]>([]);

  readonly sentimentState = signal<LoadState>('idle');
  readonly sentimentError = signal('');
  readonly sentimentSeries = signal<CategoryStat[]>([]);

  readonly exportState = signal<LoadState>('idle');

  ngOnInit(): void {
    const user = this.auth.user();
    this.city = user?.city ?? '';
    this.state = user?.state ?? '';
    this.loadAll();
  }

  private query(): ReportQuery {
    return {
      city: this.city.trim() || undefined,
      state: this.state.trim() || undefined,
      from: this.from || undefined,
      to: this.to || undefined,
    };
  }

  useMyLocality(): void {
    const user = this.auth.user();
    this.city = user?.city ?? '';
    this.state = user?.state ?? '';
    this.loadAll();
  }

  clear(): void {
    this.city = '';
    this.state = '';
    this.from = '';
    this.to = '';
    this.loadAll();
  }

  loadAll(): void {
    this.loadSummary();
    this.loadPetitionStats();
    this.loadPollStats();
    this.loadSentiment();
  }

  loadSummary(): void {
    this.summaryState.set('loading');
    this.summaryError.set('');
    this.reports.summary(this.query()).subscribe({
      next: (summary) => {
        this.metrics.set(this.toMetrics(summary));
        this.summaryState.set(this.metrics().length ? 'loaded' : 'unavailable');
      },
      error: (err) => this.fail(err, this.summaryState, this.summaryError),
    });
  }

  loadPetitionStats(): void {
    this.petitionState.set('loading');
    this.petitionError.set('');
    this.reports.petitionStats(this.query()).subscribe({
      next: (res) => {
        this.petitionByStatus.set(this.clean(res.byStatus));
        this.petitionByCategory.set(this.clean(res.byCategory));
        this.monthlyTrend.set(this.fromMonthly(res.monthly));
        this.petitionState.set('loaded');
      },
      error: (err) => this.fail(err, this.petitionState, this.petitionError),
    });
  }

  loadPollStats(): void {
    this.pollState.set('loading');
    this.pollError.set('');
    this.reports.pollStats(this.query()).subscribe({
      next: (res) => {
        this.pollByStatus.set(this.clean(res.byStatus));
        this.pollParticipation.set(this.clean(res.participation));
        this.pollState.set('loaded');
      },
      error: (err) => this.fail(err, this.pollState, this.pollError),
    });
  }

  loadSentiment(): void {
    this.sentimentState.set('loading');
    this.sentimentError.set('');
    this.reports.sentiment(this.query()).subscribe({
      next: (series) => {
        this.sentimentSeries.set(this.fromMonthly(series));
        this.sentimentState.set(this.sentimentSeries().length ? 'loaded' : 'unavailable');
      },
      error: (err) => this.fail(err, this.sentimentState, this.sentimentError),
    });
  }

  exportReport(format: 'csv' | 'pdf'): void {
    this.exportState.set('loading');
    this.reports.export(format, this.query()).subscribe({
      next: (blob) => {
        this.exportState.set('loaded');
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `civix-report.${format}`;
        link.click();
        URL.revokeObjectURL(url);
        this.notify.success('Report downloaded.');
      },
      error: (err) => {
        if (isUnavailable(err)) {
          this.exportState.set('unavailable');
          this.notify.info('Export is not available on this backend.');
          return;
        }
        this.exportState.set('idle');
        this.notify.error(apiErrorMessage(err, 'Could not export the report.'));
      },
    });
  }

  private fail(
    err: unknown,
    state: { set: (v: LoadState) => void },
    message: { set: (v: string) => void },
  ): void {
    if (isUnavailable(err)) {
      state.set('unavailable');
      return;
    }
    message.set(apiErrorMessage(err));
    state.set('error');
  }

  private clean(stats: CategoryStat[] | undefined): CategoryStat[] {
    return (stats ?? [])
      .filter((s) => s && s.label !== undefined)
      .map((s) => ({ label: this.pretty(String(s.label)), value: Number(s.value) || 0 }));
  }

  private fromMonthly(series: MonthlyStat[] | undefined): CategoryStat[] {
    return (series ?? []).map((m) => ({
      label: m.month,
      value: Number(m.petitions ?? m.signatures ?? m.votes ?? 0) || 0,
    }));
  }

  private pretty(label: string): string {
    return label.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
  }

  private toMetrics(summary: ReportSummary | null): Metric[] {
    if (!summary) return [];
    const defs: { key: string; label: string; hint: string }[] = [
      { key: 'totalPetitions', label: 'Total petitions', hint: 'Raised in this scope' },
      { key: 'activePetitions', label: 'Active petitions', hint: 'Currently collecting support' },
      { key: 'totalSignatures', label: 'Total signatures', hint: 'Citizen endorsements' },
      { key: 'totalPolls', label: 'Total polls', hint: 'Published by officials' },
      { key: 'activePolls', label: 'Active polls', hint: 'Open for voting' },
      { key: 'totalVotes', label: 'Total votes', hint: 'Across all polls' },
      { key: 'underReviewPetitions', label: 'Under review', hint: 'Awaiting official action' },
      { key: 'closedPetitions', label: 'Closed petitions', hint: 'Resolved or expired' },
    ];
    return defs
      .filter((d) => typeof summary[d.key] === 'number')
      .map((d) => ({ label: d.label, value: Number(summary[d.key]), hint: d.hint }));
  }
}
