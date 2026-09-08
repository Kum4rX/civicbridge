import { NgFor, NgIf } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { LoadState } from '../../core/models/api.model';
import {
  PETITION_CATEGORIES,
  PETITION_STATUSES,
  Petition,
  PetitionQuery,
  PetitionStatus,
} from '../../core/models/petition.model';
import { AuthService } from '../../core/services/auth.service';
import { apiErrorMessage } from '../../core/services/http-util';
import { PetitionService } from '../../core/services/petition.service';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state.component';
import { LoaderComponent } from '../../shared/components/loader.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { PaginationComponent } from '../../shared/components/pagination.component';
import { PetitionCardComponent } from '../../shared/components/petition-card.component';

const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'signatures', label: 'Most signatures' },
  { value: 'closing', label: 'Closest to goal' },
];

@Component({
  selector: 'cx-petition-list',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    ReactiveFormsModule,
    RouterLink,
    PageHeaderComponent,
    PetitionCardComponent,
    LoaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    PaginationComponent,
  ],
  template: `
    <cx-page-header
      eyebrow="Petitions"
      title="Browse petitions"
      subtitle="Find issues raised in your community, add your signature and follow official responses."
    >
      <a class="btn btn--primary" routerLink="/petitions/new">Start a petition</a>
      <a class="btn btn--ghost" routerLink="/petitions/mine">My petitions</a>
    </cx-page-header>

    <form [formGroup]="filters" class="card filters" (submit)="$event.preventDefault()">
      <div class="search">
        <label class="sr-only" for="search">Search petitions</label>
        <input
          id="search"
          class="input"
          type="search"
          formControlName="search"
          placeholder="Search by title, description or tag…"
          autocomplete="off"
        />
        <button
          type="button"
          class="btn btn--subtle filters-btn"
          (click)="showFilters.set(!showFilters())"
          [attr.aria-expanded]="showFilters()"
          aria-controls="filter-panel"
        >
          Filters<span class="badge badge--info" *ngIf="activeFilterCount()">{{ activeFilterCount() }}</span>
        </button>
      </div>

      <div id="filter-panel" class="toolbar" [class.is-open]="showFilters()">
        <div class="field">
          <label for="category">Category</label>
          <select id="category" class="select" formControlName="category">
            <option value="">All categories</option>
            <option *ngFor="let c of categories" [value]="c">{{ c }}</option>
          </select>
        </div>
        <div class="field">
          <label for="status">Status</label>
          <select id="status" class="select" formControlName="status">
            <option value="">Any status</option>
            <option *ngFor="let s of statuses" [value]="s">{{ statusLabel(s) }}</option>
          </select>
        </div>
        <div class="field">
          <label for="city">City</label>
          <input id="city" class="input" formControlName="city" placeholder="e.g. Pune" />
        </div>
        <div class="field">
          <label for="state">State</label>
          <input id="state" class="input" formControlName="state" placeholder="e.g. Maharashtra" />
        </div>
        <div class="field">
          <label for="tag">Tag</label>
          <input id="tag" class="input" formControlName="tag" placeholder="e.g. potholes" />
        </div>
        <div class="field">
          <label for="sort">Sort by</label>
          <select id="sort" class="select" formControlName="sort">
            <option *ngFor="let s of sorts" [value]="s.value">{{ s.label }}</option>
          </select>
        </div>
      </div>

      <div class="row" style="justify-content:space-between;flex-wrap:wrap">
        <div class="row" style="flex-wrap:wrap;gap:8px">
          <button type="button" class="chip" [class.is-on]="!filters.value.city && !filters.value.state" (click)="clearLocation()">
            Everywhere
          </button>
          <button
            type="button"
            class="chip"
            *ngIf="auth.user()?.city as city"
            [class.is-on]="filters.value.city === city"
            (click)="useMyLocation()"
          >
            Near me · {{ city }}
          </button>
        </div>
        <button type="button" class="btn btn--ghost btn--sm" (click)="resetFilters()" *ngIf="activeFilterCount() || filters.value.search">
          Clear all
        </button>
      </div>
    </form>

    <section class="stack" style="gap:16px;margin-top:20px" aria-live="polite">
      <cx-loader *ngIf="state() === 'loading'" variant="cards" [count]="6"></cx-loader>

      <cx-error-state
        *ngIf="state() === 'error'"
        title="Couldn’t load petitions"
        [message]="error()"
        (retry)="load()"
      ></cx-error-state>

      <cx-empty-state
        *ngIf="state() === 'empty'"
        icon="◎"
        title="No petitions match"
        message="Try widening your filters, or be the first to raise this issue."
      >
        <div class="row">
          <button type="button" class="btn btn--ghost btn--sm" (click)="resetFilters()">Clear filters</button>
          <a class="btn btn--primary btn--sm" routerLink="/petitions/new">Start a petition</a>
        </div>
      </cx-empty-state>

      <ng-container *ngIf="state() === 'loaded'">
        <p class="muted small">{{ total() }} petition{{ total() === 1 ? '' : 's' }} found</p>
        <div class="grid grid-3">
          <cx-petition-card *ngFor="let p of petitions(); trackBy: trackId" [petition]="p"></cx-petition-card>
        </div>
        <cx-pagination [page]="page()" [totalPages]="totalPages()" [total]="total()" (pageChange)="goTo($event)"></cx-pagination>
      </ng-container>
    </section>
  `,
  styles: [
    `
      .filters {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .filters .field {
        margin-bottom: 0;
      }
      .search {
        display: flex;
        gap: 10px;
      }
      .filters-btn {
        display: none;
        white-space: nowrap;
        gap: 8px;
      }
      .chip {
        border: 1px solid var(--c-border-strong);
        background: var(--c-surface);
        border-radius: var(--r-full);
        padding: 6px 14px;
        font-size: 0.8rem;
        font-weight: 600;
        cursor: pointer;
        color: var(--c-ink-soft);
      }
      .chip.is-on {
        background: var(--c-primary-soft);
        border-color: var(--c-primary);
        color: var(--c-primary);
      }
      @media (max-width: 860px) {
        .filters-btn {
          display: inline-flex;
        }
        .toolbar {
          display: none;
        }
        .toolbar.is-open {
          display: grid;
        }
      }
    `,
  ],
})
export class PetitionListPage implements OnInit, OnDestroy {
  readonly auth = inject(AuthService);
  private readonly api = inject(PetitionService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();

  readonly categories = PETITION_CATEGORIES;
  readonly statuses = PETITION_STATUSES;
  readonly sorts = SORTS;

  readonly filters = this.fb.nonNullable.group({
    search: '',
    category: '',
    status: '' as PetitionStatus | '',
    city: '',
    state: '',
    tag: '',
    sort: 'newest',
  });

  readonly showFilters = signal(false);
  readonly state = signal<LoadState>('idle');
  readonly error = signal('');
  readonly petitions = signal<Petition[]>([]);
  readonly page = signal(1);
  readonly totalPages = signal(1);
  readonly total = signal(0);
  readonly activeFilterCount = signal(0);

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap;
    this.filters.patchValue(
      {
        search: qp.get('search') ?? '',
        category: qp.get('category') ?? '',
        status: (qp.get('status') as PetitionStatus | null) ?? '',
        city: qp.get('city') ?? '',
        state: qp.get('state') ?? '',
        tag: qp.get('tag') ?? '',
        sort: qp.get('sort') ?? 'newest',
      },
      { emitEvent: false },
    );
    this.page.set(Number(qp.get('page')) || 1);
    this.recount();
    this.load();

    this.filters.valueChanges
      .pipe(
        debounceTime(350),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
        takeUntil(this.destroy$),
      )
      .subscribe(() => {
        this.page.set(1);
        this.recount();
        this.load();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.state.set('loading');
    const v = this.filters.getRawValue();
    const query: PetitionQuery = { ...v, page: this.page() };
    this.syncUrl(query);
    this.api.list(query).subscribe({
      next: (res) => {
        this.petitions.set(res.items);
        this.total.set(res.total);
        this.totalPages.set(res.totalPages);
        this.state.set(res.items.length ? 'loaded' : 'empty');
      },
      error: (err) => {
        this.error.set(apiErrorMessage(err));
        this.state.set('error');
      },
    });
  }

  goTo(page: number): void {
    this.page.set(page);
    this.load();
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  useMyLocation(): void {
    const u = this.auth.user();
    this.filters.patchValue({ city: u?.city ?? '', state: u?.state ?? '' });
  }

  clearLocation(): void {
    this.filters.patchValue({ city: '', state: '' });
  }

  resetFilters(): void {
    this.filters.reset({ search: '', category: '', status: '', city: '', state: '', tag: '', sort: 'newest' });
  }

  statusLabel(s: PetitionStatus): string {
    return s.toLowerCase().replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
  }

  trackId(_: number, p: Petition): string {
    return p.id;
  }

  private recount(): void {
    const v = this.filters.getRawValue();
    this.activeFilterCount.set(
      [v.category, v.status, v.city, v.state, v.tag].filter(Boolean).length + (v.sort !== 'newest' ? 1 : 0),
    );
  }

  private syncUrl(query: PetitionQuery): void {
    const params: Record<string, string | number> = {};
    Object.entries(query).forEach(([k, val]) => {
      if (val === '' || val === undefined || val === null) return;
      if (k === 'sort' && val === 'newest') return;
      if (k === 'page' && val === 1) return;
      params[k] = val as string | number;
    });
    void this.router.navigate([], { relativeTo: this.route, queryParams: params, replaceUrl: true });
  }
}
