import { DecimalPipe, NgFor, NgIf, SlicePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { LoadState, ReportSummary } from '../../core/models/api.model';
import { Petition } from '../../core/models/petition.model';
import { Poll } from '../../core/models/poll.model';
import { AuthService } from '../../core/services/auth.service';
import { apiErrorMessage, isUnavailable } from '../../core/services/http-util';
import { PetitionService } from '../../core/services/petition.service';
import { PollService } from '../../core/services/poll.service';
import { ReportService } from '../../core/services/report.service';
import { StatusBadgeComponent } from '../../shared/components/badge.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state.component';
import { LoaderComponent } from '../../shared/components/loader.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { PetitionCardComponent } from '../../shared/components/petition-card.component';

interface Stat {
  label: string;
  value: number;
  hint: string;
}

@Component({
  selector: 'cx-dashboard',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    DecimalPipe,
    SlicePipe,
    RouterLink,
    PageHeaderComponent,
    PetitionCardComponent,
    StatusBadgeComponent,
    LoaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
  ],
  template: `
    <cx-page-header
      [eyebrow]="greeting()"
      [title]="'Welcome back, ' + firstName()"
      [subtitle]="subtitle()"
    >
      <a class="btn btn--primary" routerLink="/petitions/new">Start a petition</a>
      <a class="btn btn--ghost" routerLink="/polls">Vote in polls</a>
      <a *ngIf="auth.isOfficial()" class="btn btn--subtle" routerLink="/governance">Governance desk</a>
    </cx-page-header>

    <!-- Summary metrics (from /reports/summary) -->
    <section class="stack" style="gap:12px">
      <div class="grid grid-4" *ngIf="statsState() === 'loading'">
        <div class="card" *ngFor="let i of [1, 2, 3, 4]">
          <div class="skeleton" style="height:12px;width:50%"></div>
          <div class="skeleton" style="height:30px;width:40%;margin-top:14px"></div>
        </div>
      </div>
      <div class="grid grid-4" *ngIf="statsState() === 'loaded'">
        <article class="card stat" *ngFor="let s of stats()">
          <span class="stat__label">{{ s.label }}</span>
          <strong class="stat__value">{{ s.value | number }}</strong>
          <span class="muted small">{{ s.hint }}</span>
        </article>
      </div>
      <p class="muted small" *ngIf="statsState() === 'unavailable'">
        Platform metrics are not exposed by the backend yet.
      </p>
      <cx-error-state
        *ngIf="statsState() === 'error'"
        title="Couldn’t load metrics"
        [message]="statsError()"
        (retry)="loadStats()"
      ></cx-error-state>
    </section>

    <div class="two-col">
      <!-- Latest petitions -->
      <section class="stack" style="gap:14px">
        <div class="spread">
          <h2>Latest petitions{{ locationSuffix() }}</h2>
          <a routerLink="/petitions" class="small">View all →</a>
        </div>

        <cx-loader *ngIf="petitionState() === 'loading'" variant="cards" [count]="4"></cx-loader>
        <p class="muted small" *ngIf="petitionState() === 'unavailable'">
          Petitions are not available on the backend yet (Milestone 2).
        </p>
        <cx-error-state
          *ngIf="petitionState() === 'error'"
          title="Couldn’t load petitions"
          [message]="petitionError()"
          (retry)="loadPetitions()"
        ></cx-error-state>
        <cx-empty-state
          *ngIf="petitionState() === 'empty'"
          icon="✎"
          title="No petitions yet"
          message="Be the first to raise an issue for your community."
        >
          <a class="btn btn--primary btn--sm" routerLink="/petitions/new">Start a petition</a>
        </cx-empty-state>
        <div class="grid grid-2" *ngIf="petitionState() === 'loaded'">
          <cx-petition-card *ngFor="let p of petitions()" [petition]="p"></cx-petition-card>
        </div>
      </section>

      <!-- Active polls -->
      <aside class="stack" style="gap:14px">
        <div class="spread">
          <h2>Open polls</h2>
          <a routerLink="/polls" class="small">All polls →</a>
        </div>
        <cx-loader *ngIf="pollState() === 'loading'" variant="rows" [count]="3"></cx-loader>
        <p class="muted small" *ngIf="pollState() === 'unavailable'">
          No open polls are currently available.
        </p>
        <cx-error-state
          *ngIf="pollState() === 'error'"
          title="Couldn’t load polls"
          [message]="pollError()"
          (retry)="loadPolls()"
        ></cx-error-state>
        <cx-empty-state
          *ngIf="pollState() === 'empty'"
          icon="◉"
          title="No open polls"
          message="Officials haven’t published any polls for your area yet."
        ></cx-empty-state>
        <div class="stack" style="gap:10px" *ngIf="pollState() === 'loaded'">
          <a class="card card--interactive poll" *ngFor="let poll of polls()" [routerLink]="['/polls', poll.id]">
            <div class="spread" style="align-items:flex-start">
              <strong class="clamp-2">{{ poll.question }}</strong>
              <cx-status-badge [status]="poll.status"></cx-status-badge>
            </div>
            <div class="row small muted">
              <span>{{ poll.totalVotes ?? 0 | number }} votes</span>
              <span *ngIf="poll.hasVoted" class="badge badge--info">You voted</span>
              <span *ngIf="poll.closingDate">Closes {{ poll.closingDate | slice: 0 : 10 }}</span>
            </div>
          </a>
        </div>
      </aside>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .stat {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .stat__label {
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--c-ink-muted);
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .stat__value {
        font: 700 1.9rem/1.1 var(--font-display);
        color: var(--c-ink);
      }
      .two-col {
        display: grid;
        gap: 24px;
        grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr);
        margin-top: 28px;
      }
      .poll {
        display: flex;
        flex-direction: column;
        gap: 10px;
        color: inherit;
      }
      .poll:hover {
        text-decoration: none;
      }
      @media (max-width: 1024px) {
        .two-col {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class DashboardPage implements OnInit {
  readonly auth = inject(AuthService);
  private readonly petitionsApi = inject(PetitionService);
  private readonly pollsApi = inject(PollService);
  private readonly reportsApi = inject(ReportService);

  readonly statsState = signal<LoadState>('idle');
  readonly statsError = signal('');
  readonly summary = signal<ReportSummary | null>(null);

  readonly petitionState = signal<LoadState>('idle');
  readonly petitionError = signal('');
  readonly petitions = signal<Petition[]>([]);

  readonly pollState = signal<LoadState>('idle');
  readonly pollError = signal('');
  readonly polls = signal<Poll[]>([]);

  readonly firstName = computed(() => (this.auth.user()?.fullName ?? 'there').split(' ')[0]);
  readonly greeting = computed(() => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  });
  readonly locationSuffix = computed(() => {
    const u = this.auth.user();
    return u?.city ? ` in ${u.city}` : '';
  });
  readonly subtitle = computed(() =>
    this.auth.isOfficial()
      ? 'Review what citizens are raising and respond where it matters.'
      : 'Here is what’s happening in your community right now.',
  );

  readonly stats = computed<Stat[]>(() => {
    const s = this.summary();
    if (!s) return [];
    const rows: Stat[] = [];
    if (s.totalPetitions !== undefined)
      rows.push({ label: 'Petitions', value: s.totalPetitions, hint: `${s.activePetitions ?? 0} active` });
    if (s.totalSignatures !== undefined)
      rows.push({ label: 'Signatures', value: s.totalSignatures, hint: 'Collected platform-wide' });
    if (s.totalPolls !== undefined)
      rows.push({ label: 'Polls', value: s.totalPolls, hint: `${s.activePolls ?? 0} open` });
    if (s.totalVotes !== undefined)
      rows.push({ label: 'Votes cast', value: s.totalVotes, hint: 'Across all polls' });
    return rows;
  });

  ngOnInit(): void {
    this.loadStats();
    this.loadPetitions();
    this.loadPolls();
  }

  loadStats(): void {
    this.statsState.set('loading');
    this.reportsApi.summary().subscribe({
      next: (summary) => {
        this.summary.set(summary);
        this.statsState.set(this.stats().length ? 'loaded' : 'unavailable');
      },
      error: (err) => {
        if (isUnavailable(err)) {
          this.statsState.set('unavailable');
          return;
        }
        this.statsError.set(apiErrorMessage(err));
        this.statsState.set('error');
      },
    });
  }

  loadPetitions(): void {
    this.petitionState.set('loading');
    const u = this.auth.user();
    this.petitionsApi
      .list({ limit: 4, sort: 'newest', city: u?.city ?? undefined })
      .subscribe({
        next: (page) => {
          this.petitions.set(page.items);
          this.petitionState.set(page.items.length ? 'loaded' : 'empty');
        },
        error: (err) => {
          if (isUnavailable(err)) {
            this.petitionState.set('unavailable');
            return;
          }
          this.petitionError.set(apiErrorMessage(err));
          this.petitionState.set('error');
        },
      });
  }

  loadPolls(): void {
    this.pollState.set('loading');
    this.pollsApi
      .list({ status: 'ACTIVE', limit: 4 })
      .pipe(finalize(() => void 0))
      .subscribe({
        next: (page) => {
          this.polls.set(page.items);
          this.pollState.set(page.items.length ? 'loaded' : 'empty');
        },
        error: (err) => {
          if (isUnavailable(err)) {
            this.pollState.set('unavailable');
            return;
          }
          this.pollError.set(apiErrorMessage(err));
          this.pollState.set('error');
        },
      });
  }
}

