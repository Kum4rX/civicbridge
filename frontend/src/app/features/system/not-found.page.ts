import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'cx-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="wrap">
      <span class="badge badge--info">404</span>
      <h1>This page doesn’t exist</h1>
      <p class="muted">The link may be outdated or the item was removed.</p>
      <a class="btn btn--primary" routerLink="/dashboard">Back to dashboard</a>
    </div>
  `,
  styles: [
    `
      .wrap {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        gap: 14px;
        align-items: flex-start;
        justify-content: center;
        max-width: 560px;
        margin: 0 auto;
        padding: 24px;
      }
    `,
  ],
})
export class NotFoundPage {}
