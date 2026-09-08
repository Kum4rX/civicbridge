import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Shared split-screen frame for the sign-in / sign-up pages. */
@Component({
  selector: 'cx-auth-panel',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="auth">
      <aside class="auth__aside">
        <a class="brand" routerLink="/"><span class="brand__mark">C</span>Civix</a>
        <h2>{{ headline }}</h2>
        <p>{{ blurb }}</p>
        <ul>
          <li>Verified, location-aware civic participation</li>
          <li>Petitions and polls with transparent outcomes</li>
          <li>Official responses tracked in public</li>
        </ul>
      </aside>
      <section class="auth__main">
        <div class="auth__card">
          <ng-content />
        </div>
      </section>
    </div>
  `,
  styles: [
    `
      .auth {
        min-height: 100vh;
        display: grid;
        grid-template-columns: 0.95fr 1.05fr;
      }
      .auth__aside {
        padding: 44px 40px;
        color: #fff;
        background: linear-gradient(150deg, #14307a, var(--c-primary) 55%, var(--c-accent));
        display: flex;
        flex-direction: column;
        gap: 18px;
        justify-content: center;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 10px;
        color: #fff;
        text-decoration: none;
        font-family: var(--font-display);
        font-weight: 700;
        font-size: 1.2rem;
      }
      .brand__mark {
        width: 34px;
        height: 34px;
        border-radius: 10px;
        display: grid;
        place-items: center;
        background: rgba(255, 255, 255, 0.18);
      }
      .auth__aside h2 {
        font-size: clamp(1.6rem, 3vw, 2.4rem);
        line-height: 1.15;
        color: #fff;
      }
      .auth__aside p {
        max-width: 42ch;
        opacity: 0.88;
      }
      .auth__aside ul {
        margin: 8px 0 0 18px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        opacity: 0.9;
        font-size: 0.9rem;
      }
      .auth__main {
        display: grid;
        place-items: center;
        padding: 40px 20px;
        background: var(--c-bg);
      }
      .auth__card {
        width: min(460px, 100%);
        background: var(--c-surface);
        border: 1px solid var(--c-border);
        border-radius: var(--r-lg);
        box-shadow: var(--e-2);
        padding: 28px;
      }
      @media (max-width: 900px) {
        .auth {
          grid-template-columns: 1fr;
        }
        .auth__aside {
          padding: 28px 20px;
        }
        .auth__aside ul,
        .auth__aside p {
          display: none;
        }
      }
    `,
  ],
})
export class AuthPanelComponent {
  @Input() headline = 'Welcome back';
  @Input() blurb = '';
}
