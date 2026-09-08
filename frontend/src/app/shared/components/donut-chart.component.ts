import { DecimalPipe, NgFor, NgIf } from '@angular/common';
import { Component, Input, computed, signal } from '@angular/core';
import { CategoryStat } from '../../core/models/api.model';

const PALETTE = ['#1f4ed8', '#0f9d8f', '#e2703a', '#b25e09', '#667085', '#7c3aed', '#12805c'];

interface Slice {
  label: string;
  value: number;
  pct: number;
  color: string;
  dash: string;
  offset: number;
}

/** Dependency-free SVG donut chart with legend. */
@Component({
  selector: 'cx-donut-chart',
  standalone: true,
  imports: [NgFor, NgIf, DecimalPipe],
  template: `
    <div class="donut" *ngIf="total() > 0; else empty">
      <svg viewBox="0 0 42 42" class="donut__svg" role="img" [attr.aria-label]="ariaLabel">
        <circle cx="21" cy="21" r="15.9" fill="none" stroke="var(--c-neutral-soft)" stroke-width="5" />
        <circle
          *ngFor="let s of slices()"
          cx="21"
          cy="21"
          r="15.9"
          fill="none"
          [attr.stroke]="s.color"
          stroke-width="5"
          [attr.stroke-dasharray]="s.dash"
          [attr.stroke-dashoffset]="s.offset"
          transform="rotate(-90 21 21)"
        />
        <text x="21" y="20" text-anchor="middle" class="donut__num">{{ total() | number }}</text>
        <text x="21" y="25" text-anchor="middle" class="donut__cap">{{ centerLabel }}</text>
      </svg>
      <ul class="legend">
        <li *ngFor="let s of slices()">
          <span class="dot" [style.background]="s.color"></span>
          <span class="truncate">{{ s.label }}</span>
          <strong>{{ s.value | number }}</strong>
          <span class="muted">{{ s.pct }}%</span>
        </li>
      </ul>
    </div>
    <ng-template #empty><p class="muted small">No data for this range.</p></ng-template>
  `,
  styles: [
    `
      .donut {
        display: grid;
        grid-template-columns: 160px 1fr;
        gap: 20px;
        align-items: center;
      }
      .donut__svg {
        width: 100%;
        max-width: 160px;
      }
      .donut__num {
        font: 700 6px var(--font-display);
        fill: var(--c-ink);
      }
      .donut__cap {
        font: 500 2.6px var(--font-body);
        fill: var(--c-ink-muted);
      }
      .legend {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
        font-size: 0.85rem;
      }
      .legend li {
        display: grid;
        grid-template-columns: 10px 1fr auto 44px;
        gap: 10px;
        align-items: center;
      }
      .legend .muted {
        text-align: right;
      }
      .dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
      }
      @media (max-width: 480px) {
        .donut {
          grid-template-columns: 1fr;
          justify-items: center;
        }
        .legend {
          width: 100%;
        }
      }
    `,
  ],
})
export class DonutChartComponent {
  private readonly _data = signal<CategoryStat[]>([]);
  @Input({ required: true }) set data(value: CategoryStat[] | null | undefined) {
    this._data.set((value ?? []).filter((d) => Number(d.value) > 0));
  }
  @Input() centerLabel = 'total';
  @Input() ariaLabel = 'Donut chart';

  readonly total = computed(() => this._data().reduce((s, d) => s + (Number(d.value) || 0), 0));

  readonly slices = computed<Slice[]>(() => {
    const total = this.total();
    if (!total) return [];
    let consumed = 0;
    return this._data().map((d, i) => {
      const value = Number(d.value) || 0;
      const pctExact = (value / total) * 100;
      const slice: Slice = {
        label: d.label,
        value,
        pct: Math.round(pctExact),
        color: PALETTE[i % PALETTE.length],
        dash: `${pctExact} ${100 - pctExact}`,
        offset: -consumed,
      };
      consumed += pctExact;
      return slice;
    });
  });
}
