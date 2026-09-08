import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PetitionQuery } from '../../core/models/petition.model';
import { PetitionService } from '../../core/services/petition.service';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { PetitionCollectionComponent } from './petition-collection.component';

@Component({
  selector: 'cx-my-petitions',
  standalone: true,
  imports: [RouterLink, PageHeaderComponent, PetitionCollectionComponent],
  template: `
    <cx-page-header
      eyebrow="Petitions"
      title="My petitions"
      subtitle="Everything you have started. Petitions can be edited or withdrawn until the first signature arrives."
    >
      <a class="btn btn--primary" routerLink="/petitions/new">Start a petition</a>
      <a class="btn btn--ghost" routerLink="/petitions/signed">Signed by me</a>
    </cx-page-header>

    <cx-petition-collection
      [source]="source"
      emptyTitle="You haven’t started a petition yet"
      emptyMessage="Raise an issue that matters to your neighbourhood and rally support for it."
      unavailableMessage="The “my petitions” endpoint is not exposed by the backend yet."
    >
      <a class="btn btn--primary btn--sm" routerLink="/petitions/new">Start a petition</a>
    </cx-petition-collection>
  `,
})
export class MyPetitionsPage {
  private readonly petitions = inject(PetitionService);
  readonly source = (q: PetitionQuery) => this.petitions.mine(q);
}
