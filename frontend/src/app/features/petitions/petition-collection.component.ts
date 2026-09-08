import { NgIf, NgFor } from '@angular/common';
import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { LoadState, Paginated } from '../../core/models/api.model';
import { Petition, PetitionQuery } from '../../core/models/petition.model';
import { apiErrorMessage, isUnavailable } from '../../core/services/http-util';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state.component';
import { LoaderComponent } from '../../shared/components/loader.component';
import { PaginationComponent } from '../../shared/components/pagination.component';
import { PetitionCardComponent } from '../../shared/components/petition-card.component';

/**
 * Reusable paginated petition grid used by "My petitions" and "Signed petitions".
 * The parent supplies the data source; this component owns load/empty/error/unavailable states.
 */
@Component({
  selector: 'cx-petition-collection',
  standalone: true,
  imports: [NgIf, NgFor, RouterLink, PetitionCardComponent, LoaderComponent, EmptyStateComponent, ErrorStateComponent, PaginationComponent],
  template: `
    <cx-loader *ngIf="state() === 'loading'" variant="cards" [count]="6"></cx-loader>

    <cx-error-state
      *ngIf="state() === 'error'"
      [title]="errorTitle"
      [message]="error()"
      (retry)="load()"
    ></cx-error-state>

    <cx-empty-state *ngIf="state() === 'unavailable'" icon="⚙" title="Not available yet" [message]="unavailableMessage">
      <a class="btn btn--ghost btn--sm" routerLink="/petitions">Browse all petitions</a>
    </cx-empty-state>

    <cx-empty-state *ngIf="state() === 'empty'" [icon]="emptyIcon" [title]="emptyTitle" [message]="emptyMessage">
      <ng-content></ng-content>
    </cx-empty-state>

    <ng-container *ngIf="state() === 'loaded'">
      <p class="muted small" style="margin-bottom:14px">{{ total() }} petition{{ total() === 1 ? '' : 's' }}</p>
      <div class="grid grid-3">
        <cx-petition-card *ngFor="let p of items(); trackBy: trackId" [petition]="p"></cx-petition-card>
      </div>
      <cx-pagination [page]="page()" [totalPages]="totalPages()" [total]="total()" (pageChange)="goTo($event)"></cx-pagination>
    </ng-container>
  `,
})
export class PetitionCollectionComponent implements OnInit {
  @Input({ required: true }) source!: (query: PetitionQuery) => Observable<Paginated<Petition>>;
  @Input() errorTitle = 'Couldn’t load petitions';
  @Input() emptyIcon = '✎';
  @Input() emptyTitle = 'Nothing here yet';
  @Input() emptyMessage = '';
  @Input() unavailableMessage = 'This list is not exposed by the backend yet.';

  readonly state = signal<LoadState>('idle');
  readonly error = signal('');
  readonly items = signal<Petition[]>([]);
  readonly page = signal(1);
  readonly totalPages = signal(1);
  readonly total = signal(0);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.state.set('loading');
    this.source({ page: this.page() }).subscribe({
      next: (res) => {
        this.items.set(res.items);
        this.total.set(res.total);
        this.totalPages.set(res.totalPages);
        this.state.set(res.items.length ? 'loaded' : 'empty');
      },
      error: (err) => {
        if (isUnavailable(err)) {
          this.state.set('unavailable');
          return;
        }
        this.error.set(apiErrorMessage(err));
        this.state.set('error');
      },
    });
  }

  goTo(page: number): void {
    this.page.set(page);
    this.load();
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  trackId(_: number, p: Petition): string {
    return p.id;
  }
}
