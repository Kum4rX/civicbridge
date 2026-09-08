import { NgIf } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'cx-error-state',
  standalone: true,
  imports: [NgIf],
  template: `
    <div class="err" role="alert">
      <div class="err__icon" aria-hidden="true">!</div>
      <div>
        <strong>{{ title }}</strong>
        <p class="small muted" *ngIf="message">{{ message }}</p>
      </div>
      <button class="btn btn--ghost btn--sm" *ngIf="retryable" (click)="retry.emit()">
        Try again
      </button>
    </div>
  `,
  styles: [
    `
      .err {
        display: flex;
        gap: 14px;
        align-items: center;
        flex-wrap: wrap;
        padding: 18px;
        border-radius: var(--r-lg);
        border: 1px solid var(--c-danger);
        background: var(--c-danger-soft);
      }
      .err__icon {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        background: var(--c-danger);
        color: #fff;
        font-weight: 700;
        flex: none;
      }
      div > p {
        margin-top: 2px;
      }
      button {
        margin-left: auto;
      }
    `,
  ],
})
export class ErrorStateComponent {
  @Input() title = 'Something went wrong';
  @Input() message = '';
  @Input() retryable = true;
  @Output() retry = new EventEmitter<void>();
}
