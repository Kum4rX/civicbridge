import { DatePipe, DecimalPipe, NgFor, NgIf } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LoadState } from '../../core/models/api.model';
import { PETITION_STATUSES, Petition, PetitionStatus } from '../../core/models/petition.model';
import { AuthService } from '../../core/services/auth.service';
import { apiErrorMessage } from '../../core/services/http-util';
import { NotificationService } from '../../core/services/notification.service';
import { PetitionService } from '../../core/services/petition.service';
import { StatusBadgeComponent } from '../../shared/components/badge.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component';
import { ErrorStateComponent } from '../../shared/components/error-state.component';
import { LoaderComponent } from '../../shared/components/loader.component';

@Component({
  selector: 'cx-petition-detail',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    DatePipe,
    DecimalPipe,
    FormsModule,
    RouterLink,
    StatusBadgeComponent,
    ConfirmDialogComponent,
    ErrorStateComponent,
    LoaderComponent,
  ],
  template: `
    <a routerLink="/petitions" class="back">← Back to petitions</a>

    <cx-loader *ngIf="state() === 'loading'" variant="rows" [count]="4"></cx-loader>

    <cx-error-state
      *ngIf="state() === 'error'"
      title="Couldn’t load this petition"
      [message]="error()"
      (retry)="load()"
    ></cx-error-state>

    <ng-container *ngIf="state() === 'loaded' && petition() as p">
      <div class="layout">
        <!-- Main column -->
        <article class="stack" style="gap:20px">
          <header class="card head">
            <div class="row" style="flex-wrap:wrap;gap:8px">
              <cx-status-badge [status]="p.status"></cx-status-badge>
              <span class="badge">{{ p.category }}</span>
              <span class="badge badge--tag" *ngFor="let t of p.tags ?? []">#{{ t }}</span>
            </div>
            <h1>{{ p.title }}</h1>
            <p class="muted small meta">
              <span *ngIf="p.creator?.fullName">Started by <strong>{{ p.creator?.fullName }}</strong></span>
              <span *ngIf="p.createdAt"> · {{ p.createdAt | date: 'mediumDate' }}</span>
              <span *ngIf="location()"> · {{ location() }}</span>
            </p>
          </header>

          <section class="card">
            <h2 class="section-title">About this petition</h2>
            <p class="body">{{ p.description }}</p>

            <div class="media" *ngIf="p.mediaUrls?.length">
              <a *ngFor="let url of p.mediaUrls" [href]="url" target="_blank" rel="noopener">
                <img [src]="url" alt="Petition attachment" loading="lazy" />
              </a>
            </div>
          </section>

          <section class="card" id="responses">
            <div class="spread">
              <h2 class="section-title">Official responses</h2>
              <span class="badge badge--info">{{ p.responses?.length ?? 0 }}</span>
            </div>
            <p class="muted small" *ngIf="!p.responses?.length">
              No official response yet. Officials in {{ p.city || 'your locality' }} are notified as the petition gains support.
            </p>
            <ol class="timeline" *ngIf="p.responses?.length">
              <li *ngFor="let r of p.responses">
                <div class="timeline__dot"></div>
                <div class="timeline__body">
                  <div class="row" style="flex-wrap:wrap;gap:8px">
                    <strong>{{ r.respondedBy?.fullName || 'Official' }}</strong>
                    <cx-status-badge *ngIf="r.status" [status]="r.status"></cx-status-badge>
                    <span class="muted small" *ngIf="r.createdAt">{{ r.createdAt | date: 'medium' }}</span>
                  </div>
                  <p>{{ r.message }}</p>
                </div>
              </li>
            </ol>
          </section>
        </article>

        <!-- Side column -->
        <aside class="stack" style="gap:16px">
          <div class="card sign">
            <div class="spread">
              <strong class="big">{{ p.signaturesCount | number }}</strong>
              <span class="muted small">of {{ p.targetSignatures | number }} goal</span>
            </div>
            <div class="progress" role="progressbar" [attr.aria-valuenow]="pct()" aria-valuemin="0" aria-valuemax="100">
              <div class="progress__bar" [style.width.%]="pct()"></div>
            </div>
            <p class="muted small">{{ pct() }}% of the goal · {{ remaining() | number }} more needed</p>

            <ng-container *ngIf="auth.isCitizen()">
              <button
                *ngIf="!p.hasSigned"
                class="btn btn--primary btn--block"
                [disabled]="signing() || p.status !== 'ACTIVE'"
                (click)="sign()"
              >
                <span class="spinner" *ngIf="signing()"></span>
                {{ p.status === 'ACTIVE' ? 'Sign this petition' : 'Signing closed' }}
              </button>
              <div class="signed" *ngIf="p.hasSigned">
                <span aria-hidden="true">✓</span>
                <div>
                  <strong>You signed this petition</strong>
                  <p class="muted small" *ngIf="p.signedAt">{{ p.signedAt | date: 'mediumDate' }}</p>
                </div>
              </div>
            </ng-container>

            <p class="muted small" *ngIf="auth.isOfficial()">
              Officials review petitions from the Governance dashboard.
            </p>
            <a class="btn btn--subtle btn--block" *ngIf="auth.isOfficial()" routerLink="/governance">Open governance</a>
          </div>

          <div class="card" *ngIf="isOwner()">
            <h3 class="section-title">Manage</h3>
            <p class="muted small" *ngIf="!canModify()">
              Petitions can only be edited or deleted while they have zero signatures.
            </p>
            <div class="stack" style="gap:8px;margin-top:10px">
              <a class="btn btn--ghost btn--block" [routerLink]="['/petitions', p.id, 'edit']" *ngIf="canModify()">Edit petition</a>
              <button class="btn btn--danger btn--block" *ngIf="canModify()" (click)="confirmDelete.set(true)">Delete petition</button>
            </div>
          </div>

          <div class="card" *ngIf="auth.isOfficial()">
            <h3 class="section-title">Official status</h3>
            <p class="muted small" style="margin-top:8px">
              Official petition status changes will be available in Milestone 4.
            </p>
          </div>

          <div class="card details">
            <h3 class="section-title">Details</h3>
            <dl>
              <dt>Category</dt><dd>{{ p.category }}</dd>
              <dt>Location</dt><dd>{{ location() || '—' }}</dd>
              <dt *ngIf="p.pincode">Pincode</dt><dd *ngIf="p.pincode">{{ p.pincode }}</dd>
              <dt>Created</dt><dd>{{ p.createdAt ? (p.createdAt | date: 'mediumDate') : '—' }}</dd>
              <dt *ngIf="p.updatedAt">Updated</dt><dd *ngIf="p.updatedAt">{{ p.updatedAt | date: 'mediumDate' }}</dd>
            </dl>
          </div>
        </aside>
      </div>
    </ng-container>

    <cx-confirm-dialog
      [open]="confirmDelete()"
      title="Delete this petition?"
      message="This permanently removes the petition. This action cannot be undone."
      confirmLabel="Delete"
      [destructive]="true"
      [busy]="deleting()"
      (confirm)="remove()"
      (cancel)="confirmDelete.set(false)"
    ></cx-confirm-dialog>
  `,
  styles: [
    `
      .back { display: inline-block; margin-bottom: 16px; font-size: 0.85rem; font-weight: 600; color: var(--c-primary); }
      .layout { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 20px; align-items: start; }
      .head h1 { margin: 12px 0 8px; font-size: clamp(1.4rem, 2.5vw, 1.9rem); line-height: 1.2; }
      .meta { display: flex; flex-wrap: wrap; gap: 4px; }
      .section-title { font-size: 1rem; margin-bottom: 10px; }
      .body { white-space: pre-wrap; line-height: 1.65; color: var(--c-ink-soft); }
      .media { display: grid; gap: 10px; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); margin-top: 16px; }
      .media img { width: 100%; aspect-ratio: 4/3; object-fit: cover; border-radius: var(--r-md); border: 1px solid var(--c-border); }
      .sign { display: flex; flex-direction: column; gap: 12px; position: sticky; top: 84px; }
      .big { font-size: 2rem; font-family: var(--font-display); line-height: 1; }
      .signed { display: flex; gap: 12px; align-items: center; padding: 12px 14px; border-radius: var(--r-md); background: var(--c-success-soft); color: var(--c-success); }
      .signed span { font-size: 1.2rem; font-weight: 700; }
      .details dl { display: grid; grid-template-columns: auto 1fr; gap: 8px 16px; font-size: 0.86rem; }
      .details dt { color: var(--c-ink-muted); }
      .details dd { font-weight: 600; text-align: right; }
      .timeline { list-style: none; margin: 12px 0 0; padding: 0; display: flex; flex-direction: column; gap: 18px; }
      .timeline li { display: grid; grid-template-columns: 14px 1fr; gap: 14px; position: relative; }
      .timeline__dot { width: 12px; height: 12px; margin-top: 5px; border-radius: 50%; background: var(--c-primary); box-shadow: 0 0 0 4px var(--c-primary-soft); }
      .timeline li:not(:last-child)::before { content: ''; position: absolute; left: 5px; top: 22px; bottom: -18px; width: 2px; background: var(--c-border); }
      .timeline__body p { margin-top: 6px; color: var(--c-ink-soft); line-height: 1.6; white-space: pre-wrap; }
      @media (max-width: 960px) {
        .layout { grid-template-columns: 1fr; }
        .sign { position: static; }
      }
    `,
  ],
})
export class PetitionDetailPage implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(PetitionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(NotificationService);

  readonly statuses = PETITION_STATUSES;
  readonly state = signal<LoadState>('idle');
  readonly error = signal('');
  readonly petition = signal<Petition | null>(null);
  readonly signing = signal(false);
  readonly deleting = signal(false);
  readonly statusBusy = signal(false);
  readonly confirmDelete = signal(false);
  statusDraft: PetitionStatus = 'ACTIVE';

  readonly pct = computed(() => {
    const p = this.petition();
    if (!p || !p.targetSignatures) return 0;
    return Math.min(100, Math.round((p.signaturesCount / p.targetSignatures) * 100));
  });
  readonly remaining = computed(() => {
    const p = this.petition();
    return p ? Math.max(0, p.targetSignatures - p.signaturesCount) : 0;
  });
  readonly location = computed(() => {
    const p = this.petition();
    return [p?.city, p?.state].filter(Boolean).join(', ');
  });
  readonly isOwner = computed(() => {
    const p = this.petition();
    const uid = this.auth.user()?.id;
    return !!p && !!uid && (p.creatorId ?? p.creator?.id) === uid;
  });
  readonly canModify = computed(() => this.api.canModify(this.petition(), this.auth.user()?.id));

  private get id(): string {
    return this.route.snapshot.paramMap.get('id') ?? '';
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.state.set('loading');
    this.api.getById(this.id).subscribe({
      next: (p) => {
        this.petition.set(p);
        this.statusDraft = p.status;
        this.state.set('loaded');
      },
      error: (err) => {
        this.error.set(apiErrorMessage(err));
        this.state.set('error');
      },
    });
  }

  sign(): void {
    this.signing.set(true);
    this.api.sign(this.id).subscribe({
      next: (updated) => {
        const current = this.petition();
        this.petition.set({
          ...current!,
          ...(updated ?? {}),
          hasSigned: true,
          signaturesCount: updated?.signaturesCount ?? (current?.signaturesCount ?? 0) + 1,
          signedAt: updated?.signedAt ?? new Date().toISOString(),
        });
        this.signing.set(false);
        this.toast.success('Thank you — your signature has been added.');
      },
      error: (err) => {
        this.signing.set(false);
        this.toast.error(apiErrorMessage(err, 'Could not sign this petition.'));
      },
    });
  }

  remove(): void {
    this.deleting.set(true);
    this.api.remove(this.id).subscribe({
      next: () => {
        this.toast.success('Petition deleted.');
        void this.router.navigate(['/petitions/mine']);
      },
      error: (err) => {
        this.deleting.set(false);
        this.confirmDelete.set(false);
        this.toast.error(apiErrorMessage(err, 'Could not delete this petition.'));
      },
    });
  }

  updateStatus(): void {
    this.statusBusy.set(true);
    this.api.updateStatus(this.id, this.statusDraft).subscribe({
      next: (updated) => {
        this.petition.update((p) => (p ? { ...p, ...(updated ?? {}), status: updated?.status ?? this.statusDraft } : p));
        this.statusBusy.set(false);
        this.toast.success('Petition status updated.');
      },
      error: (err) => {
        this.statusBusy.set(false);
        this.toast.error(apiErrorMessage(err, 'Could not update the status.'));
      },
    });
  }
}
