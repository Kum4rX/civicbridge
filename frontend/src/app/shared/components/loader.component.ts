import { NgFor, NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'cx-loader',
  standalone: true,
  imports: [NgFor, NgIf],
  template: `
    <div *ngIf="variant === 'cards'" class="grid grid-3" role="status" aria-live="polite">
      <div class="card" *ngFor="let i of items">
        <div class="skeleton" style="height:14px;width:35%"></div>
        <div class="skeleton" style="height:20px;width:80%;margin-top:14px"></div>
        <div class="skeleton" style="height:12px;width:100%;margin-top:12px"></div>
        <div class="skeleton" style="height:12px;width:70%;margin-top:8px"></div>
        <div class="skeleton" style="height:8px;width:100%;margin-top:22px"></div>
      </div>
      <span class="sr-only">Loading</span>
    </div>

    <div *ngIf="variant === 'rows'" role="status" aria-live="polite">
      <div class="skeleton" *ngFor="let i of items" style="height:56px;margin-bottom:10px"></div>
      <span class="sr-only">Loading</span>
    </div>

    <div *ngIf="variant === 'inline'" class="row" role="status" aria-live="polite">
      <span class="spinner spinner--dark"></span>
      <span class="muted small">{{ label }}</span>
    </div>
  `,
})
export class LoaderComponent {
  @Input() variant: 'cards' | 'rows' | 'inline' = 'cards';
  @Input() label = 'Loading…';
  @Input() set count(value: number) {
    this.items = Array.from({ length: value });
  }
  items: unknown[] = Array.from({ length: 6 });
}
