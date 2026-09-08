import { NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'cx-empty-state',
  standalone: true,
  imports: [NgIf],
  template: `
    <div class="empty">
      <div class="empty__icon" aria-hidden="true">{{ icon }}</div>
      <h3>{{ title }}</h3>
      <p class="muted small" *ngIf="message">{{ message }}</p>
      <ng-content></ng-content>
    </div>
  `,
  styles: [
    `
      .empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        text-align: center;
        padding: 48px 24px;
        border: 1px dashed var(--c-border-strong);
        border-radius: var(--r-lg);
        background: var(--c-surface-alt);
      }
      .empty__icon {
        width: 52px;
        height: 52px;
        display: grid;
        place-items: center;
        border-radius: 50%;
        background: var(--c-primary-soft);
        font-size: 1.4rem;
      }
      p {
        max-width: 42ch;
      }
    `,
  ],
})
export class EmptyStateComponent {
  @Input() icon = '◎';
  @Input({ required: true }) title = '';
  @Input() message = '';
}
