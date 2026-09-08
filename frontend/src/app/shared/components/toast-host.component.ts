import { NgFor } from '@angular/common';
import { Component, inject } from '@angular/core';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'cx-toast-host',
  standalone: true,
  imports: [NgFor],
  template: `
    <div class="toasts" aria-live="polite">
      <div class="toast toast--{{ t.kind }}" *ngFor="let t of notify.toasts()">
        <span>{{ t.message }}</span>
        <button
          class="input-group__action"
          style="position:static;transform:none;margin-left:auto"
          (click)="notify.dismiss(t.id)"
          aria-label="Dismiss notification"
        >
          ✕
        </button>
      </div>
    </div>
  `,
})
export class ToastHostComponent {
  readonly notify = inject(NotificationService);
}
