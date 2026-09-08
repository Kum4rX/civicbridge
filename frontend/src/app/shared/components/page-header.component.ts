import { NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'cx-page-header',
  standalone: true,
  imports: [NgIf],
  template: `
    <header class="ph">
      <div class="ph__text">
        <span class="badge badge--info" *ngIf="eyebrow">{{ eyebrow }}</span>
        <h1>{{ title }}</h1>
        <p class="muted" *ngIf="subtitle">{{ subtitle }}</p>
      </div>
      <div class="ph__actions"><ng-content></ng-content></div>
    </header>
  `,
  styles: [
    `
      .ph {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        gap: 16px;
        flex-wrap: wrap;
        margin-bottom: 24px;
      }
      .ph__text {
        display: flex;
        flex-direction: column;
        gap: 6px;
        align-items: flex-start;
      }
      .ph__actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }
      @media (max-width: 720px) {
        .ph__actions {
          width: 100%;
        }
        .ph__actions > * {
          flex: 1;
        }
      }
    `,
  ],
})
export class PageHeaderComponent {
  @Input({ required: true }) title = '';
  @Input() subtitle = '';
  @Input() eyebrow = '';
}
