import { DatePipe, DecimalPipe, NgIf } from '@angular/common';
import { Component, Input, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Petition } from '../../core/models/petition.model';
import { StatusBadgeComponent } from './badge.component';

@Component({
  selector: 'cx-petition-card',
  standalone: true,
  imports: [NgIf, DatePipe, DecimalPipe, RouterLink, StatusBadgeComponent],
  template: `
    <article class="card card--interactive p-card">
      <header class="spread" style="align-items:flex-start">
        <span class="badge badge--tag" *ngIf="p()?.category">{{ p()!.category }}</span>
        <cx-status-badge [status]="p()?.status || ''"></cx-status-badge>
      </header>

      <h3 style="margin-top:14px">
        <a [routerLink]="['/petitions', p()!.id]" class="title-link clamp-2">{{ p()!.title }}</a>
      </h3>
      <p class="muted small clamp-2" style="margin-top:8px">{{ p()!.description }}</p>

      <div style="margin-top:18px">
        <div class="spread small" style="margin-bottom:6px">
          <strong>{{ signatures() | number }} signatures</strong>
          <span class="muted" *ngIf="goal()">of {{ goal() | number }} goal</span>
        </div>
        <div class="progress" role="progressbar" [attr.aria-valuenow]="percent()" aria-valuemin="0" aria-valuemax="100">
          <div class="progress__bar" [style.width.%]="percent()"></div>
        </div>
      </div>

      <footer class="spread small muted" style="margin-top:16px">
        <span class="truncate">{{ locationLabel() }}</span>
        <span *ngIf="p()!.createdAt">{{ p()!.createdAt | date: 'mediumDate' }}</span>
      </footer>
    </article>
  `,
  styles: [
    `
      .p-card {
        display: flex;
        flex-direction: column;
        height: 100%;
      }
      .title-link {
        color: var(--c-ink);
        font-family: var(--font-display);
      }
      .title-link:hover {
        color: var(--c-primary);
        text-decoration: none;
      }
      footer {
        margin-top: auto;
        padding-top: 16px;
        border-top: 1px solid var(--c-border);
      }
    `,
  ],
})
export class PetitionCardComponent {
  private readonly _p = signal<Petition | null>(null);
  @Input({ required: true }) set petition(value: Petition) {
    this._p.set(value);
  }
  readonly p = this._p.asReadonly();

  readonly signatures = computed(() => this._p()?.signaturesCount ?? 0);
  readonly goal = computed(() => this._p()?.targetSignatures ?? 0);
  readonly percent = computed(() => {
    const goal = this.goal();
    if (!goal) return 0;
    return Math.min(100, Math.round((this.signatures() / goal) * 100));
  });
  readonly locationLabel = computed(() => {
    const p = this._p();
    return [p?.city, p?.state].filter(Boolean).join(', ') || 'Location not specified';
  });
}
