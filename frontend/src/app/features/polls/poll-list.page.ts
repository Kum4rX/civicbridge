import { DatePipe, DecimalPipe, NgFor, NgIf, SlicePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { LoadState, Paginated } from '../../core/models/api.model';
import { Poll, PollQuery, PollStatus } from '../../core/models/poll.model';
import { AuthService } from '../../core/services/auth.service';
import { apiErrorMessage, isUnavailable } from '../../core/services/http-util';
import { PollService } from '../../core/services/poll.service';
import { StatusBadgeComponent } from '../../shared/components/badge.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state.component';
import { LoaderComponent } from '../../shared/components/loader.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { PaginationComponent } from '../../shared/components/pagination.component';

@Component({
  selector: 'cx-poll-list',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    DatePipe,
    DecimalPipe,
    SlicePipe,
    FormsModule,
    RouterLink,
    StatusBadgeComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    LoaderComponent,
    PageHeaderComponent,
    PaginationComponent,
  ],
  template: `
    <cx-page-header
      eyebrow="Polls"
      title="Community polls"
      subtitle="Quick, anonymous votes on local decisions. Officials publish polls; every citizen gets one vote."
    >
      <a *ngIf="auth.isOfficial()" class="btn btn--primary" routerLink="/polls/new">Create poll</a>
      <button
        *ngIf="hasLocation()"
        class="btn btn--ghost"
        type="button"
        [class.btn--subtle]="nearMe"
        (click)="toggleNearMe()"
      >
        {{ nearMe ? '✓ ' : '' }}Near me
      </button>
    </cx-page-header>

    <div class="card filters">
      <div class="toolbar">
        <div class="field" style="margin:0">
          <label for="poll-search">Search</label>
          <input
            id="poll-search"
            class="input"
            type="search"
            placeholder="Search by question..."
            [ngModel]="query.search"
            (ngModelChange)="onSearch($event)"
          />
        </div>
        <div class="field" style="margin:0">
          <label for="poll-status">Status</label>
          <select id="poll-status" class="select" [(ngModel)]="query.status" (ngModelChange)="apply()">
            <option value="">All</option>
            <option value="ACTIVE">Active</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
        <div class="field" style="margin:0">
          <label for="poll-city">City</label>
          <input id="poll-city" class="input" [(ngModel)]="query.city" (change)="apply()" placeholder="Any city" />
        </div>
        <div class="field" style="margin:0">
          <label for="poll-state">State</label>
          <input id="poll-state" class="input" [(ngModel)]="query.state" (change)="apply()" placeholder="Any state" />
        </div>
      </div>
      <div class="row" style="margin-top:12px" *ngIf="isFiltered()">
        <span class="small muted">Filters applied</span>
        <button class="btn btn--ghost btn--sm" type="button" (click)="clear()">Clear all</button>
      </div>
    </div>

    <cx-loader *ngIf="state() === 'loading'" variant="cards" [count]="6"></cx-loader>

    <cx-error-state
      *ngIf="state() === 'error'"
      title="Couldn't load polls"
      [message]="error()"
      (retry)="load()"
    ></cx-error-state>

    <cx-empty-state
      *ngIf="state() === 'unavailable'"
      icon="🗳️"
      title="Unable to load polls"
      message="Could not connect to the polling service right now. Please try again later."
    ></cx-empty-state>

    <cx-empty-state
      *ngIf="state() === 'empty'"
      icon="🗳️"
      [title]="emptyTitle()"
      [message]="emptyMessage()"
    >
      <button *ngIf="isFiltered()" class="btn btn--ghost btn--sm" type="button" (click)="clear()">Clear filters</button>
      <a *ngIf="!isFiltered() && auth.isOfficial()" class="btn btn--primary btn--sm" routerLink="/polls/new">Create poll</a>
    </cx-empty-state>

    <ng-container *ngIf="state() === 'loaded' && page() as pg">
      <p class="small muted result-count">{{ pg.total | number }} poll{{ pg.total === 1 ? '' : 's' }}</p>
      <div class="grid grid-3">
        <a
          class="card card--interactive poll"
          *ngFor="let poll of pg.items; trackBy: trackById"
          [routerLink]="['/polls', poll.id]"
        >
          <div class="card__head">
            <div class="row" style="gap:6px">
              <cx-status-badge [status]="poll.status"></cx-status-badge>
              <span class="badge badge--tag" *ngIf="poll.category">{{ poll.category }}</span>
            </div>
            <span class="badge badge--info" *ngIf="poll.hasVoted">✓ Voted</span>
          </div>
          <h3 class="poll__q clamp-2">{{ poll.question }}</h3>
          <p class="small muted clamp-2" *ngIf="poll.description">{{ poll.description }}</p>
          <ul class="poll__options">
            <li *ngFor="let opt of poll.options | slice: 0 : 3" class="truncate">• {{ opt.text }}</li>
            <li class="muted" *ngIf="poll.options.length > 3">+{{ poll.options.length - 3 }} more</li>
          </ul>
          <div class="poll__meta small muted">
            <span *ngIf="poll.city || poll.state">📍 {{ place(poll) }}</span>
            <span>{{ poll.totalVotes ?? 0 | number }} votes</span>
            <span *ngIf="poll.closingDate">Closes {{ poll.closingDate | date: 'mediumDate' }}</span>
          </div>
        </a>
      </div>
      <cx-pagination
        [page]="pg.page"
        [totalPages]="pg.totalPages"
        [total]="pg.total"
        (pageChange)="goTo($event)"
      ></cx-pagination>
    </ng-container>
  `,
  styles: [
    `
      .filters {
        margin-bottom: 20px;
      }
      .result-count {
        margin-bottom: 12px;
      }
      .poll {
        display: flex;
        flex-direction: column;
        gap: 10px;
        color: inherit;
        text-decoration: none;
      }
      .poll__q {
        font-size: 1.05rem;
        line-height: 1.35;
      }
      .poll__options {
        list-style: none;
        margin: 0;
        padding: 10px 12px;
        border-radius: var(--r-md);
        background: var(--c-surface-alt);
        font-size: 0.84rem;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .poll__meta {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        margin-top: auto;
        padding-top: 8px;
        border-top: 1px solid var(--c-border);
      }
      cx-pagination {
        display: block;
        margin-top: 20px;
      }
    `,
  ],
})
export class PollListPage implements OnInit {
  readonly auth = inject(AuthService);
  private readonly polls = inject(PollService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly search$ = new Subject<string>();

  readonly state = signal<LoadState>('idle');
  readonly error = signal('');
  readonly page = signal<Paginated<Poll> | null>(null);

  query: PollQuery = { search: '', status: '', city: '', state: '', page: 1 };
  nearMe = false;

  readonly emptyTitle = computed(() => {
    return this.isFiltered() ? 'No polls match these filters' : 'No polls yet';
  });

  readonly emptyMessage = computed(() => {
    if (this.isFiltered()) {
      return 'Try widening your search or clearing the filters.';
    }
    if (this.auth.isOfficial()) {
      return 'Publish the first poll to hear from residents in your locality.';
    }
    return 'Officials have not published any polls yet. Check back soon.';
  });

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap;
    this.query = {
      search: qp.get('search') ?? '',
      status: (qp.get('status') ?? '') as PollStatus | '',
      city: qp.get('city') ?? '',
      state: qp.get('state') ?? '',
      page: Number(qp.get('page') ?? 1) || 1,
    };
    const me = this.auth.user();
    this.nearMe = !!me?.city && this.query.city === me.city;
    this.search$.pipe(debounceTime(350), distinctUntilChanged()).subscribe((value) => {
      this.query.search = value;
      this.apply();
    });
    this.load();
  }

  hasLocation(): boolean {
    return !!this.auth.user()?.city;
  }

  isFiltered(): boolean {
    return !!(this.query.search || this.query.status || this.query.city || this.query.state);
  }

  onSearch(value: string): void {
    this.search$.next(value ?? '');
  }

  toggleNearMe(): void {
    const me = this.auth.user();
    this.nearMe = !this.nearMe;
    this.query.city = this.nearMe ? (me?.city ?? '') : '';
    this.query.state = this.nearMe ? (me?.state ?? '') : '';
    this.apply();
  }

  apply(): void {
    this.query.page = 1;
    this.syncUrl();
    this.load();
  }

  clear(): void {
    this.nearMe = false;
    this.query = { search: '', status: '', city: '', state: '', page: 1 };
    this.syncUrl();
    this.load();
  }

  goTo(page: number): void {
    this.query.page = page;
    this.syncUrl();
    this.load();
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  load(): void {
    this.state.set('loading');
    this.error.set('');
    this.polls.list(this.query).subscribe({
      next: (pg) => {
        this.page.set(pg);
        this.state.set(pg.items.length ? 'loaded' : 'empty');
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

  place(poll: Poll): string {
    return [poll.city, poll.state].filter((v) => !!v).join(', ');
  }

  trackById(_: number, poll: Poll): string {
    return poll.id;
  }

  private syncUrl(): void {
    const q = this.query;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        search: q.search || null,
        status: q.status || null,
        city: q.city || null,
        state: q.state || null,
        page: q.page && q.page > 1 ? q.page : null,
      },
      replaceUrl: true,
    });
  }
}