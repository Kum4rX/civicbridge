import { NgIf } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'cx-pagination',
  standalone: true,
  imports: [NgIf],
  template: `
    <nav class="pager" *ngIf="totalPages > 1" aria-label="Pagination">
      <button class="btn btn--ghost btn--sm" [disabled]="page <= 1" (click)="pageChange.emit(page - 1)">
        ← Prev
      </button>
      <span class="small muted">Page {{ page }} of {{ totalPages }} · {{ total }} results</span>
      <button
        class="btn btn--ghost btn--sm"
        [disabled]="page >= totalPages"
        (click)="pageChange.emit(page + 1)"
      >
        Next →
      </button>
    </nav>
  `,
  styles: [
    `
      .pager {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 16px;
        flex-wrap: wrap;
        padding-top: 8px;
      }
    `,
  ],
})
export class PaginationComponent {
  @Input() page = 1;
  @Input() totalPages = 1;
  @Input() total = 0;
  @Output() pageChange = new EventEmitter<number>();
}
