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
          <span class="field__label">Month</span>
          <select class="input" [(ngModel)]="month">
            <option value="">All months</option>
            <option value="1">January</option>
            <option value="2">February</option>
            <option value="3">March</option>
            <option value="4">April</option>
            <option value="5">May</option>
            <option value="6">June</option>
            <option value="7">July</option>
            <option value="8">August</option>
            <option value="9">September</option>
            <option value="10">October</option>
            <option value="11">November</option>
            <option value="12">December</option>
          </select>
        </label>
        <label class="field">
          <span class="field__label">Year</span>
          <select class="input" [(ngModel)]="year">
            <option value="">All years</option>
            <option value="2024">2024</option>
            <option value="2025">2025</option>
            <option value="2026">2026</option>
            <option value="2027">2027</option>
          </select>
        </label>
        <label class="field">
          <span class="field__label">City</span>
          <input class="input" [(ngModel)]="city" placeholder="All cities" />
        </label>
        <label class="field">
          <span class="field__label">State</span>
          <input class="input" [(ngModel)]="state" placeholder="All states" />
        </label>
      </div>
      <div class="row filters__actions">
        <button class="btn btn--primary btn--sm" (click)="loadAll()">Apply filters</button>
        <button class="btn btn--ghost btn--sm" (click)="useMyLocality()">My locality</button>
        <button class="btn btn--ghost btn--sm" (click)="clear()">Clear filters</button>
      </div>
    </section>

    <!-- Summary metrics -->
    <cx-loader *ngIf="summaryState() === 'loading'" variant="rows" [count]="2"></cx-loader>

    <cx-error-state
      *ngIf="summaryState() === 'error'"
      title="Couldn't load the summary"
      [message]="summaryError()"
      (retry)="loadSummary()"
    ></cx-error-state>

    <cx-empty-state
      *ngIf="summaryState() === 'unavailable'"
      icon="&#128202;"
      title="Summary not available"
      message="No engagement records found for the selected scope."
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
          label="Loading petition analytics..."
        ></cx-loader>
        <cx-error-state
          *ngIf="petitionState() === 'error'"
          title="Couldn't load petition analytics"
          [message]="petitionError()"
          (retry)="loadPetitionStats()"
        ></cx-error-state>
        <p class="muted small" *ngIf="petitionState() === 'loaded' && !petitionByStatus().length">
          No petition status data in this scope.
        </p>
        <cx-donut-chart
          *ngIf="petitionState() === 'loaded' && petitionByStatus().length"
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
          label="Loading categories..."
        ></cx-loader>
        <p class="muted small" *ngIf="petitionState() === 'loaded' && !petitionByCategory().length">
          No category distribution data in this scope.
        </p>
        <cx-bar-chart
          *ngIf="petitionState() === 'loaded' && petitionByCategory().length"
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
          label="Loading poll analytics..."
        ></cx-loader>
        <cx-error-state
          *ngIf="pollState() === 'error'"
          title="Couldn't load poll analytics"
          [message]="pollError()"
          (retry)="loadPollStats()"
        ></cx-error-state>
        <p class="muted small" *ngIf="pollState() === 'loaded' && !pollByStatus().length">
          No poll status data in this scope.
        </p>
        <cx-donut-chart
          *ngIf="pollState() === 'loaded' && pollByStatus().length"
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
          label="Loading participation..."
        ></cx-loader>
        <p class="muted small" *ngIf="pollState() === 'loaded' && !pollParticipation().length">
          No poll participation data in this scope.
        </p>
        <cx-bar-chart
          *ngIf="pollState() === 'loaded' && pollParticipation().length"
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

    <!-- Sentiment trend -->
    <section class="card">
      <h2 class="card__title">Public sentiment & voting trend</h2>
      <cx-loader
        *ngIf="sentimentState() === 'loading'"
        variant="inline"
        label="Loading sentiment..."
      ></cx-loader>
      <cx-error-state
        *ngIf="sentimentState() === 'error'"
        title="Couldn't load sentiment"
        [message]="sentimentError()"
        (retry)="loadSentiment()"
      ></cx-error-state>
      <cx-bar-chart
        *ngIf="sentimentState() === 'loaded'"
        [data]="sentimentSeries()"
        color="var(--c-warning, #b25e09)"
        ariaLabel="Public sentiment trend"
      ></cx-bar-chart>
    </section>
  `,
  styles: [
    `
      .filters {
        margin-bottom: 20px;
      }
      .filters__grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
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
    `,
  ],
})
export class ReportsPage implements OnInit {
  private readonly reports = inject(ReportService);
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotificationService);

  month = '';
  year = '2026';
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
      month: this.month ? parseInt(this.month, 10) : undefined,
      year: this.year ? parseInt(this.year, 10) : undefined,
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
    this.month = '';
    this.year = '';
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
        this.summaryState.set('loaded');
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
        this.sentimentState.set('loaded');
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
        const period = this.month && this.year ? `${this.year}-${this.month}` : 'latest';
        link.download = `civicbridge-report-${period}.${format}`;
        link.click();
        URL.revokeObjectURL(url);
        this.notify.success('Report downloaded successfully.');
      },
      error: (err) => {
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
      { key: 'newPetitions', label: 'New petitions', hint: 'In selected period' },
      { key: 'activePetitions', label: 'Active petitions', hint: 'Currently collecting support' },
      { key: 'underReviewPetitions', label: 'Under review', hint: 'Awaiting official action' },
      { key: 'closedPetitions', label: 'Closed petitions', hint: 'Resolved or expired' },
      { key: 'totalSignatures', label: 'Total signatures', hint: 'Citizen endorsements' },
      { key: 'totalResponses', label: 'Official responses', hint: 'Published governance responses' },
      { key: 'totalPolls', label: 'Total polls', hint: 'Published by officials' },
      { key: 'activePolls', label: 'Active polls', hint: 'Open for voting' },
      { key: 'totalVotes', label: 'Total votes', hint: 'Across all polls' },
      { key: 'totalParticipation', label: 'Poll participation', hint: 'Total civic engagements' },
    ];
    return defs
      .filter((d) => typeof summary[d.key] === 'number')
      .map((d) => ({ label: d.label, value: Number(summary[d.key]), hint: d.hint }));
  }
}
