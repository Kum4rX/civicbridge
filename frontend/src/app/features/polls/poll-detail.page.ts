import { DatePipe, DecimalPipe, NgFor, NgIf } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { LoadState } from '../../core/models/api.model';
import { Poll, PollResults } from '../../core/models/poll.model';
import { AuthService } from '../../core/services/auth.service';
import { apiErrorMessage, isUnavailable } from '../../core/services/http-util';
import { NotificationService } from '../../core/services/notification.service';
import { PollService } from '../../core/services/poll.service';
import { StatusBadgeComponent } from '../../shared/components/badge.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state.component';
import { LoaderComponent } from '../../shared/components/loader.component';

const BAR_COLORS = ['#1f4ed8', '#0f9d8f', '#e2703a', '#b25e09', '#7c3aed', '#667085', '#12805c'];

@Component({
  selector: 'cx-poll-detail',
  standalone: true,
  imports: [NgIf, NgFor, DatePipe, DecimalPipe, RouterLink, StatusBadgeComponent, EmptyStateComponent, ErrorStateComponent, LoaderComponent],
  template: `
    <a routerLink="/polls" class="back">← Back to polls</a>

    <cx-loader *ngIf="state() === 'loading'" variant="rows" [count]="5"></cx-loader>

    <cx-empty-state
      *ngIf="state() === 'unavailable'"
      icon="⚠"
      title="Polls are not available"
      message="Community polls will be available in Milestone 3."
    >
      <a class="btn btn--ghost btn--sm" routerLink="/petitions">Browse petitions</a>
    </cx-empty-state>

    <cx-error-state
      *ngIf="state() === 'error'"
      title="Couldn’t load this poll"
      [message]="error()"
      (retry)="load()"
    ></cx-error-state>

    <div class="layout" *ngIf="state() === 'loaded' && poll() as p">
      <section class="stack">
        <header class="card">
          <div class="row" style="gap:6px;margin-bottom:12px">
            <cx-status-badge [status]="p.status"></cx-status-badge>
            <span class="badge badge--tag" *ngIf="p.category">{{ p.category }}</span>
            <span class="badge badge--info" *ngIf="p.hasVoted">✓ You voted</span>
          </div>
          <h1 class="q">{{ p.question }}</h1>
          <p class="muted" *ngIf="p.description" style="margin-top:10px">{{ p.description }}</p>
          <div class="meta small muted">
            <span *ngIf="p.city || p.state">📍 {{ place(p) }}</span>
            <span *ngIf="p.createdBy?.fullName">By {{ p.createdBy?.fullName }}</span>
            <span *ngIf="p.createdAt">Published {{ p.createdAt | date: 'mediumDate' }}</span>
            <span *ngIf="p.closingDate">{{ isClosed() ? 'Closed' : 'Closes' }} {{ p.closingDate | date: 'mediumDate' }}</span>
          </div>
        </header>

        <!-- Voting -->
        <section class="card" *ngIf="canVote()">
          <div class="card__head">
            <div>
              <h2>Cast your vote</h2>
              <p class="small muted">Select one option. Votes are anonymous and cannot be changed.</p>
            </div>
          </div>
          <div class="options" role="radiogroup" aria-label="Poll options">
            <button
              type="button"
              class="choice"
              role="radio"
              *ngFor="let opt of p.options; let i = index"
              [attr.aria-checked]="selected() === optionKey(opt, i)"
              [class.is-selected]="selected() === optionKey(opt, i)"
              [disabled]="voting()"
              (click)="selected.set(optionKey(opt, i))"
            >
              <span class="radio" aria-hidden="true"></span>
              <span class="choice__title">{{ opt.text }}</span>
            </button>
          </div>
          <div class="row" style="justify-content:flex-end;margin-top:16px">
            <button class="btn btn--primary" [disabled]="!selected() || voting()" (click)="vote()">
              <span class="spinner" *ngIf="voting()"></span>Submit vote
            </button>
          </div>
        </section>

        <section class="card notice" *ngIf="!canVote() && !p.hasVoted && auth.isOfficial() && !isClosed()">
          <strong>Officials observe, citizens vote.</strong>
          <p class="small muted">Voting is reserved for citizen accounts. Results update live below.</p>
        </section>

        <!-- Results -->
        <section class="card">
          <div class="card__head">
            <div>
              <h2>Results</h2>
              <p class="small muted" *ngIf="results() as r">{{ r.totalVotes | number }} total vote{{ r.totalVotes === 1 ? '' : 's' }}</p>
            </div>
            <button class="btn btn--ghost btn--sm" type="button" (click)="loadResults()" [disabled]="resultsState() === 'loading'">
              Refresh
            </button>
          </div>

          <cx-loader *ngIf="resultsState() === 'loading'" variant="rows" [count]="3"></cx-loader>

          <cx-error-state
            *ngIf="resultsState() === 'error'"
            title="Results unavailable right now"
            [message]="resultsError()"
            (retry)="loadResults()"
          ></cx-error-state>

          <div class="unavail" *ngIf="resultsState() === 'unavailable'">
            <strong>Results not available</strong>
            <p class="small muted">The backend does not expose a results endpoint for this poll yet.</p>
          </div>

          <ng-container *ngIf="resultsState() === 'loaded' && results() as r">
            <p class="small muted" *ngIf="!r.totalVotes">No votes yet — be the first to weigh in.</p>
            <ul class="results">
              <li *ngFor="let o of r.options; let i = index" [class.is-winner]="isLeading(o.votes, r)">
                <div class="results__row">
                  <span class="results__label">
                    {{ o.text }}
                    <span class="badge badge--info" *ngIf="votedFor(o, i)">Your vote</span>
                    <span class="badge badge--active" *ngIf="isLeading(o.votes, r) && r.totalVotes > 0">Leading</span>
                  </span>
                  <span class="results__pct">{{ o.percentage | number: '1.0-1' }}%</span>
                </div>
                <div class="progress results__bar">
                  <div class="progress__bar" [style.width.%]="o.percentage" [style.background]="colors[i % colors.length]"></div>
                </div>
                <span class="small muted">{{ o.votes | number }} vote{{ o.votes === 1 ? '' : 's' }}</span>
              </li>
            </ul>
          </ng-container>
        </section>
      </section>

      <aside class="stack">
        <div class="card">
          <h3>At a glance</h3>
          <dl class="facts">
            <div><dt>Status</dt><dd><cx-status-badge [status]="p.status"></cx-status-badge></dd></div>
            <div><dt>Options</dt><dd>{{ p.options.length }}</dd></div>
            <div><dt>Total votes</dt><dd>{{ (results()?.totalVotes ?? p.totalVotes ?? 0) | number }}</dd></div>
            <div *ngIf="p.category"><dt>Category</dt><dd>{{ p.category }}</dd></div>
            <div *ngIf="p.city || p.state"><dt>Locality</dt><dd>{{ place(p) }}</dd></div>
            <div *ngIf="p.closingDate"><dt>Closing</dt><dd>{{ p.closingDate | date: 'medium' }}</dd></div>
          </dl>
        </div>
        <div class="card" *ngIf="p.hasVoted">
          <h3>Thanks for voting</h3>
          <p class="small muted">Your response is recorded. Browse other polls to keep shaping local decisions.</p>
          <a routerLink="/polls" class="btn btn--subtle btn--sm" style="margin-top:12px">More polls</a>
        </div>
        <div class="card" *ngIf="isClosed()">
          <h3>This poll is closed</h3>
          <p class="small muted">Voting has ended. Final results are shown on the left.</p>
        </div>
      </aside>
    </div>
  `,
  styles: [
    `
      .back {
        display: inline-block;
        margin-bottom: 16px;
        font-size: 0.85rem;
      }
      .layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 300px;
        gap: 24px;
        align-items: start;
      }
      aside {
        position: sticky;
        top: 88px;
      }
      .q {
        font-size: clamp(1.4rem, 2.4vw, 1.9rem);
        line-height: 1.25;
      }
      .meta {
        display: flex;
        gap: 14px;
        flex-wrap: wrap;
        margin-top: 14px;
        padding-top: 14px;
        border-top: 1px solid var(--c-border);
      }
      .options {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .choice {
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
      }
      .radio {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        border: 2px solid var(--c-border-strong);
        flex: none;
        position: relative;
      }
      .choice.is-selected .radio {
        border-color: var(--c-primary);
      }
      .choice.is-selected .radio::after {
        content: '';
        position: absolute;
        inset: 3px;
        border-radius: 50%;
        background: var(--c-primary);
      }
      .notice,
      .unavail {
        border-left: 4px solid var(--c-warn);
      }
      .results {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .results__row {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: center;
        margin-bottom: 6px;
        font-size: 0.92rem;
      }
      .results__label {
        display: inline-flex;
        gap: 8px;
        align-items: center;
        flex-wrap: wrap;
        font-weight: 600;
      }
      .results__pct {
        font-weight: 700;
        font-variant-numeric: tabular-nums;
        font-family: var(--font-display);
      }
      .results__bar {
        height: 12px;
        margin-bottom: 4px;
      }
      .facts {
        margin: 12px 0 0;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .facts div {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        font-size: 0.86rem;
      }
      .facts dt {
        color: var(--c-ink-muted);
      }
      .facts dd {
        margin: 0;
        font-weight: 600;
        text-align: right;
      }
      @media (max-width: 900px) {
        .layout {
          grid-template-columns: 1fr;
        }
        aside {
          position: static;
        }
      }
    `,
  ],
})
export class PollDetailPage implements OnInit {
  readonly auth = inject(AuthService);
  private readonly polls = inject(PollService);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(NotificationService);

  readonly colors = BAR_COLORS;
  readonly state = signal<LoadState>('idle');
  readonly error = signal('');
  readonly poll = signal<Poll | null>(null);
  readonly results = signal<PollResults | null>(null);
  readonly resultsState = signal<LoadState>('idle');
  readonly resultsError = signal('');
  readonly selected = signal<string | null>(null);
  readonly voting = signal(false);

  readonly isClosed = computed(() => {
    const p = this.poll();
    if (!p) return true;
    if (p.status === 'CLOSED') return true;
    return !!p.closingDate && new Date(p.closingDate).getTime() < Date.now();
  });

  readonly canVote = computed(() => {
    const p = this.poll();
    return !!p && this.auth.isCitizen() && !p.hasVoted && !this.isClosed();
  });

  private id = '';

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.id = params.get('id') ?? '';
      this.load();
    });
  }

  load(): void {
    this.state.set('loading');
    this.error.set('');
    this.polls.getById(this.id).subscribe({
      next: (poll) => {
        this.poll.set(poll);
        this.state.set('loaded');
        this.loadResults();
      },
      error: (err) => {
        if (isUnavailable(err)) {
          this.state.set('unavailable');
          return;
        }
        this.error.set(apiErrorMessage(err));
        this.state.set('error');
      },
    });
  }

  loadResults(): void {
    this.resultsState.set('loading');
    this.resultsError.set('');
    this.polls.results(this.id).subscribe({
      next: (r) => {
        this.results.set(r);
        this.resultsState.set('loaded');
      },
      error: (err) => {
        if (isUnavailable(err)) {
          this.resultsState.set('unavailable');
          return;
        }
        this.resultsError.set(apiErrorMessage(err));
        this.resultsState.set('error');
      },
    });
  }

  optionKey(opt: { id?: string; text: string }, index: number): string {
    return opt.id ?? `${index}`;
  }

  vote(): void {
    const key = this.selected();
    const p = this.poll();
    if (!key || !p) return;
    this.voting.set(true);
    this.polls.vote(p.id, key).subscribe({
      next: (updated) => {
        const merged: Poll = { ...p, ...(updated ?? {}), hasVoted: true, votedOptionId: key };
        this.poll.set(merged);
        this.voting.set(false);
        this.toast.success('Your vote has been recorded.');
        this.loadResults();
      },
      error: (err) => {
        this.voting.set(false);
        const message = apiErrorMessage(err, 'Could not submit your vote.');
        this.toast.error(message);
        // Backend says already voted → reflect that state.
        if (/already/i.test(message)) {
          this.poll.set({ ...p, hasVoted: true });
          this.loadResults();
        }
      },
    });
  }

  votedFor(o: { id?: string }, index: number): boolean {
    const voted = this.poll()?.votedOptionId;
    if (!voted) return false;
    return voted === (o.id ?? `${index}`);
  }

  isLeading(votes: number, r: PollResults): boolean {
    if (!r.totalVotes) return false;
    const max = Math.max(...r.options.map((o) => o.votes));
    return votes === max && votes > 0;
  }

  place(p: Poll): string {
    return [p.city, p.state].filter((v) => !!v).join(', ');
  }
}
