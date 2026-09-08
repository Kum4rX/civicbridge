import { Component, Input, computed, signal } from '@angular/core';

const MAP: Record<string, { cls: string; label: string }> = {
  ACTIVE: { cls: 'badge--active', label: 'Active' },
  OPEN: { cls: 'badge--active', label: 'Open' },
  UNDER_REVIEW: { cls: 'badge--review', label: 'Under review' },
  IN_REVIEW: { cls: 'badge--review', label: 'Under review' },
  PENDING: { cls: 'badge--review', label: 'Pending' },
  RESPONDED: { cls: 'badge--info', label: 'Responded' },
  APPROVED: { cls: 'badge--active', label: 'Approved' },
  REJECTED: { cls: 'badge--flagged', label: 'Rejected' },
  CLOSED: { cls: 'badge--closed', label: 'Closed' },
  EXPIRED: { cls: 'badge--closed', label: 'Expired' },
  FLAGGED: { cls: 'badge--flagged', label: 'Flagged' },
};

@Component({
  selector: 'cx-status-badge',
  standalone: true,
  template: `<span class="badge {{ cls() }}">{{ label() }}</span>`,
})
export class StatusBadgeComponent {
  private readonly _status = signal<string>('');
  @Input({ required: true }) set status(value: string | null | undefined) {
    this._status.set((value ?? '').toString().toUpperCase().replace(/\s+/g, '_'));
  }

  readonly cls = computed(() => MAP[this._status()]?.cls ?? '');
  readonly label = computed(() => {
    const s = this._status();
    if (!s) return '—';
    const mapped = MAP[s]?.label;
    if (mapped) return mapped;
    const formatted = s.toLowerCase().replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
    return formatted || '—';
  });
}
