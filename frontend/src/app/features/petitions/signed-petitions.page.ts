import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PetitionQuery } from '../../core/models/petition.model';
import { PetitionService } from '../../core/services/petition.service';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { PetitionCollectionComponent } from './petition-collection.component';

@Component({
  selector: 'cx-signed-petitions',
  standalone: true,
  imports: [RouterLink, PageHeaderComponent, PetitionCollectionComponent],
  template: `
    <cx-page-header
      eyebrow="Petitions"
      title="Petitions I signed"
      subtitle="Track progress and official responses on the causes you supported."
    >
      <a class="btn btn--primary" routerLink="/petitions">Browse petitions</a>
      <a class="btn btn--ghost" routerLink="/petitions/mine">My petitions</a>
    </cx-page-header>

    <cx-petition-collection
      [source]="source"
      emptyIcon="&#9997;"
      emptyTitle="You haven't signed any petitions"
      emptyMessage="Every signature counts. Browse active petitions near you and add your voice."
      unavailableMessage="No signed petitions found in this scope."
    >
      <a class="btn btn--primary btn--sm" routerLink="/petitions">Browse petitions</a>
    </cx-petition-collection>
  `,
})
export class SignedPetitionsPage {
  private readonly petitions = inject(PetitionService);
  readonly source = (q: PetitionQuery) => this.petitions.signed(q);
}
