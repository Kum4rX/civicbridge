import { NgIf } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'cx-confirm-dialog',
  standalone: true,
  imports: [NgIf],
  template: `
    <div class="backdrop" *ngIf="open" (click)="cancel.emit()">
      <div class="dialog" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
        <h3>{{ title }}</h3>
        <p class="muted small" style="margin-top:8px">{{ message }}</p>
        <div class="row" style="justify-content:flex-end;margin-top:24px">
          <button class="btn btn--ghost" (click)="cancel.emit()">Cancel</button>
          <button
            class="btn"
            [class.btn--danger]="destructive"
            [class.btn--primary]="!destructive"
            [disabled]="busy"
            (click)="confirm.emit()"
          >
            <span class="spinner" *ngIf="busy"></span>{{ confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class ConfirmDialogComponent {
  @Input() open = false;
  @Input() title = 'Are you sure?';
  @Input() message = '';
  @Input() confirmLabel = 'Confirm';
  @Input() destructive = false;
  @Input() busy = false;
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
}
