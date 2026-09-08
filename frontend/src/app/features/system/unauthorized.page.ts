import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'cx-unauthorized',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="wrap">
      <span class="badge badge--flagged">403</span>
      <h1>You don’t have access to this area</h1>
      <p class="muted">
        This section is restricted to a different role. Your permissions are enforced by the
        backend — contact an administrator if you believe this is a mistake.
      </p>
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
export class UnauthorizedPage {}
