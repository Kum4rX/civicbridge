import { DatePipe, DecimalPipe, NgFor, NgIf } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LoadState } from '../../core/models/api.model';
import {
  PETITION_STATUSES,
  Petition,
  PetitionQuery,
  PetitionStatus,
} from '../../core/models/petition.model';
import { AuthService } from '../../core/services/auth.service';
import { apiErrorMessage, isUnavailable } from '../../core/services/http-util';
import { NotificationService } from '../../core/services/notification.service';
import { PetitionService } from '../../core/services/petition.service';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state.component';
import { LoaderComponent } from '../../shared/components/loader.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { PaginationComponent } from '../../shared/components/pagination.component';
import { StatusBadgeComponent } from '../../shared/components/badge.component';

/**
 * Milestone 4 — official governance workspace.
 * Lists petitions in the official's locality (server-side filtered via the
 * existing `GET /petitions` query contract) and lets them respond
 * (`POST /petitions/:id/response`) or change status (`PATCH /petitions/:id/status`).
 */
@Component({
  selector: 'cx-governance',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    DatePipe,
    DecimalPipe,
    FormsModule,
    RouterLink,
    PageHeaderComponent,
    LoaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    PaginationComponent,
    StatusBadgeComponent,
  ],
  template: `
    <cx-page-header
      eyebrow="Officials"
      title="Governance workspace"
      subtitle="Review petitions raised in your locality, publish an official response and keep citizens informed."
    >
      <a class="btn btn--ghost" routerLink="/reports">View reports</a>
      <a class="btn btn--primary" routerLink="/polls/new">Create poll</a>
    </cx-page-header>

    <!-- Locality + status filters -->
    <section class="card filters" aria-label="Filter petitions">
      <div class="filters__grid">
        <label class="field">
          <span class="field__label">Search</span>
          <input
            class="input"
            type="search"
            placeholder="Title, description or tag"
            [(ngModel)]="search"
            (keyup.enter)="applyFilters()"
          />
        </label>
        <label class="field">
          <span class="field__label">City</span>
          <input class="input" [(ngModel)]="city" placeholder="City" />
        </label>
        <label class="field">
          <span class="field__label">State</span>
          <input class="input" [(ngModel)]="state" placeholder="State" />
        </label>
        <label class="field">
          <span class="field__label">Status</span>
          <select class="input" [(ngModel)]="status">
            <option value="">All statuses</option>
            <option *ngFor="let s of statuses" [value]="s">{{ pretty(s) }}</option>
          </select>
        </label>
      </div>
      <div class="row filters__actions">
        <button class="btn btn--primary btn--sm" (click)="applyFilters()">Apply filters</button>
        <button class="btn btn--ghost btn--sm" (click)="resetToMyLocality()">My locality</button>
        <button class="btn btn--ghost btn--sm" (click)="clearFilters()">Clear</button>
      </div>
    </section>

    <!-- Queue summary -->
    <section class="grid grid-4 metrics" *ngIf="state$() === 'loaded'">
      <div class="card metric">
        <span class="muted small">Petitions in view</span>
        <strong>{{ total() | number }}</strong>
      </div>
      <div class="card metric">
        <span class="muted small">Awaiting review</span>
        <strong>{{ countBy('UNDER_REVIEW') | number }}</strong>
      </div>
      <div class="card metric">
        <span class="muted small">Active</span>
        <strong>{{ countBy('ACTIVE') | number }}</strong>
      </div>
      <div class="card metric">
        <span class="muted small">Signatures on page</span>
        <strong>{{ signaturesOnPage() | number }}</strong>
      </div>
    </section>

    <cx-loader *ngIf="state$() === 'loading'" variant="rows" [count]="4"></cx-loader>

    <cx-error-state
      *ngIf="state$() === 'error'"
      title="Couldn’t load the governance queue"
      [message]="error()"
      (retry)="load()"
    ></cx-error-state>

    <cx-empty-state
      *ngIf="state$() === 'unavailable'"
      icon="⚙"
      title="Not available yet"
      message="The petitions endpoint is not exposed by the backend yet."
    ></cx-empty-state>

    <cx-empty-state
      *ngIf="state$() === 'empty'"
      icon="◎"
      title="No petitions match these filters"
      message="Try widening the locality or clearing the status filter."
    >
      <button class="btn btn--ghost btn--sm" (click)="clearFilters()">Clear filters</button>
    </cx-empty-state>

    <section class="queue" *ngIf="state$() === 'loaded'">
      <article class="card item" *ngFor="let p of petitions(); trackBy: trackById">
        <header class="item__head">
          <div class="item__title">
            <a [routerLink]="['/petitions', p.id]"><h3 class="truncate">{{ p.title }}</h3></a>
            <p class="muted small">
              {{ p.category }} · {{ p.city || '—' }}{{ p.state ? ', ' + p.state : '' }} ·
              {{ p.createdAt | date: 'mediumDate' }}
            </p>
          </div>
          <cx-status-badge [status]="p.status"></cx-status-badge>
        </header>

        <p class="item__desc small">{{ p.description }}</p>

        <div class="item__meta small muted">
          <span
            ><strong>{{ p.signaturesCount | number }}</strong> of
            {{ p.targetSignatures | number }} signatures</span
          >
          <span *ngIf="p.creator?.fullName">Raised by {{ p.creator?.fullName }}</span>
          <span *ngIf="p.responses?.length">{{ p.responses?.length }} official response(s)</span>
        </div>

        <div class="progress" aria-hidden="true">
          <div class="progress__fill" [style.width.%]="progress(p)"></div>
        </div>

        <footer class="item__actions">
          <a class="btn btn--ghost btn--sm" [routerLink]="['/petitions', p.id]">Open petition</a>
          <button class="btn btn--primary btn--sm" (click)="openReview(p)">Review & respond</button>
        </footer>

        <!-- Inline review panel -->
        <div class="review" *ngIf="activeId() === p.id">
          <label class="field">
            <span class="field__label">Official response</span>
            <textarea
              class="input"
              rows="4"
              [(ngModel)]="message"
              placeholder="Explain the decision, next steps and timelines for the community."
            ></textarea>
            <span class="field__error" *ngIf="submitted() && !message.trim()"
              >A response message is required.</span
            >
          </label>

          <label class="field">
            <span class="field__label">Update status (optional)</span>
            <select class="input" [(ngModel)]="newStatus">
              <option value="">Keep current status ({{ pretty(p.status) }})</option>
              <option *ngFor="let s of statuses" [value]="s">{{ pretty(s) }}</option>
            </select>
          </label>

          <div class="row review__actions">
            <button class="btn btn--primary btn--sm" [disabled]="busy()" (click)="submit(p)">
              <span class="spinner" *ngIf="busy()"></span>Publish response
            </button>
            <button
              class="btn btn--ghost btn--sm"
              [disabled]="busy() || !newStatus"
              (click)="onlyStatus(p)"
            >
              Update status only
            </button>
            <button class="btn btn--ghost btn--sm" [disabled]="busy()" (click)="closeReview()">
              Cancel
            </button>
          </div>
        </div>
      </article>

      <cx-pagination
        [page]="page()"
        [totalPages]="totalPages()"
        [total]="total()"
        (pageChange)="goToPage($event)"
      ></cx-pagination>
    </section>
  `,
  styles: [
    `
      .filters {
        margin-bottom: 20px;
      }
      .filters__grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
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
        gap: 6px;
      }
      .metric strong {
        font-size: 1.6rem;
      }
      .queue {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .item__head {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: flex-start;
      }
      .item__title h3 {
        font-size: 1.05rem;
      }
      .item__title a {
        color: inherit;
        text-decoration: none;
      }
      .item__title a:hover h3 {
        color: var(--c-primary);
      }
      .item__desc {
        margin-top: 10px;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .item__meta {
        display: flex;
        flex-wrap: wrap;
        gap: 14px;
        margin-top: 12px;
      }
      .progress {
        height: 8px;
        border-radius: var(--r-full);
        background: var(--c-neutral-soft);
        overflow: hidden;
        margin-top: 12px;
      }
      .progress__fill {
        height: 100%;
        background: var(--c-primary);
        transition: width 0.4s ease;
      }
      .item__actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        margin-top: 16px;
      }
      .review {
        margin-top: 18px;
        padding-top: 18px;
        border-top: 1px solid var(--c-border);
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .review__actions {
        flex-wrap: wrap;
      }
      @media (max-width: 640px) {
        .item__actions .btn,
        .review__actions .btn {
          flex: 1;
        }
      }
    `,
  ],
})
export class GovernancePage implements OnInit {
  private readonly petitionsApi = inject(PetitionService);
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotificationService);

  readonly statuses = PETITION_STATUSES;

  search = '';
  city = '';
  state = '';
  status: PetitionStatus | '' = '';

  readonly petitions = signal<Petition[]>([]);
  readonly state$ = signal<LoadState>('idle');
  readonly error = signal('');
  readonly page = signal(1);
  readonly totalPages = signal(1);
  readonly total = signal(0);

  readonly activeId = signal<string | null>(null);
  readonly busy = signal(false);
  readonly submitted = signal(false);
  message = '';
  newStatus: PetitionStatus | '' = '';

  readonly signaturesOnPage = computed(() =>
    this.petitions().reduce((sum, p) => sum + (p.signaturesCount ?? 0), 0),
  );

  ngOnInit(): void {
    this.resetToMyLocality();
  }

  countBy(status: PetitionStatus): number {
    return this.petitions().filter((p) => p.status === status).length;
  }

  progress(p: Petition): number {
    const target = p.targetSignatures || 0;
    if (!target) return 0;
    return Math.min(100, Math.round(((p.signaturesCount ?? 0) / target) * 100));
  }

  pretty(status: string): string {
    return status.toLowerCase().replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
  }

  trackById = (_: number, p: Petition) => p.id;

  resetToMyLocality(): void {
    const user = this.auth.user();
    this.city = user?.city ?? '';
    this.state = user?.state ?? '';
    this.search = '';
    this.status = '';
    this.page.set(1);
    this.load();
  }

  clearFilters(): void {
    this.search = '';
    this.city = '';
    this.state = '';
    this.status = '';
    this.page.set(1);
    this.load();
  }

  applyFilters(): void {
    this.page.set(1);
    this.load();
  }

  goToPage(page: number): void {
    this.page.set(page);
    this.load();
  }

  load(): void {
    this.state$.set('loading');
    this.error.set('');
    const query: PetitionQuery = {
      search: this.search.trim() || undefined,
      city: this.city.trim() || undefined,
      state: this.state.trim() || undefined,
      status: this.status || '',
      sort: 'recent',
      page: this.page(),
    };
    this.petitionsApi.list(query).subscribe({
      next: (res) => {
        this.petitions.set(res.items);
        this.total.set(res.total);
        this.totalPages.set(res.totalPages);
        this.state$.set(res.items.length ? 'loaded' : 'empty');
      },
      error: (err) => {
        if (isUnavailable(err)) {
          this.state$.set('unavailable');
          return;
        }
        this.error.set(apiErrorMessage(err));
        this.state$.set('error');
      },
    });
  }

  openReview(p: Petition): void {
    this.activeId.set(this.activeId() === p.id ? null : p.id);
    this.message = '';
    this.newStatus = '';
    this.submitted.set(false);
  }

  closeReview(): void {
    this.activeId.set(null);
    this.submitted.set(false);
  }

  submit(p: Petition): void {
    this.submitted.set(true);
    if (!this.message.trim()) return;
    this.busy.set(true);
    const status = this.newStatus || undefined;
    this.petitionsApi.respond(p.id, this.message.trim(), status).subscribe({
      next: () => {
        this.busy.set(false);
        this.notify.success('Official response published.');
        this.closeReview();
        this.load();
      },
      error: (err) => {
        this.busy.set(false);
        this.notify.error(apiErrorMessage(err, 'Could not publish the response.'));
      },
    });
  }

  onlyStatus(p: Petition): void {
    if (!this.newStatus) return;
    this.busy.set(true);
    this.petitionsApi.updateStatus(p.id, this.newStatus).subscribe({
      next: () => {
        this.busy.set(false);
        this.notify.success('Petition status updated.');
        this.closeReview();
        this.load();
      },
      error: (err) => {
        this.busy.set(false);
        this.notify.error(apiErrorMessage(err, 'Could not update the status.'));
      },
    });
  }
}
