import { DecimalPipe, NgFor, NgIf } from '@angular/common';
import { Component, Input, computed, signal } from '@angular/core';
import { CategoryStat } from '../../core/models/api.model';

/**
 * Dependency-free horizontal bar chart. Accepts `{ label, value }[]`
 * and scales bars against the largest value.
 */
@Component({
  selector: 'cx-bar-chart',
  standalone: true,
  imports: [NgFor, NgIf, DecimalPipe],
  template: `
    <div class="bars" role="img" [attr.aria-label]="ariaLabel">
      <div class="bar" *ngFor="let row of rows()">
        <span class="bar__label truncate" [title]="row.label">{{ row.label }}</span>
        <div class="bar__track">
          <div class="bar__fill" [style.width.%]="row.pct" [style.background]="color"></div>
        </div>
        <span class="bar__value">{{ row.value | number }}</span>
      </div>
      <p class="muted small" *ngIf="!rows().length">No data for this range.</p>
    </div>
  `,
  styles: [
    `
      .bars {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .bar {
        display: grid;
        grid-template-columns: minmax(80px, 140px) 1fr 48px;
        align-items: center;
        gap: 12px;
        font-size: 0.85rem;
      }
      .bar__label {
        color: var(--c-ink-soft);
      }
      .bar__track {
        height: 12px;
        background: var(--c-neutral-soft);
        border-radius: var(--r-full);
        overflow: hidden;
      }
      .bar__fill {
        height: 100%;
        border-radius: var(--r-full);
        transition: width 0.5s ease;
        min-width: 2px;
      }
      .bar__value {
        text-align: right;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
      }
      @media (max-width: 480px) {
        .bar {
          grid-template-columns: 80px 1fr 40px;
          gap: 8px;
        }
      }
    `,
  ],
})
export class BarChartComponent {
  private readonly _data = signal<CategoryStat[]>([]);
  @Input({ required: true }) set data(value: CategoryStat[] | null | undefined) {
    this._data.set(value ?? []);
  }
  @Input() color = 'var(--c-primary)';
  @Input() ariaLabel = 'Bar chart';

  readonly rows = computed(() => {
    const data = this._data();
    const max = Math.max(1, ...data.map((d) => Number(d.value) || 0));
    return data.map((d) => ({
      label: d.label,
      value: Number(d.value) || 0,
      pct: Math.round(((Number(d.value) || 0) / max) * 100),
    }));
  });
}
