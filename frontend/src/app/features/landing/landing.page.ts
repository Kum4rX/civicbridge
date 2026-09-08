import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'cx-landing',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="land">
      <header class="land__bar container">
        <span class="brand"><span class="brand__mark">C</span>Civix</span>
        <nav class="row">
          @if (auth.isAuthenticated()) {
            <a class="btn btn--primary btn--sm" routerLink="/dashboard">Open dashboard</a>
          } @else {
            <a class="btn btn--ghost btn--sm" routerLink="/login">Sign in</a>
            <a class="btn btn--primary btn--sm" routerLink="/register">Create account</a>
          }
        </nav>
      </header>

      <section class="hero container">
        <div>
          <span class="badge badge--info">Digital civic engagement</span>
          <h1>Turn local concerns into measurable public action.</h1>
          <p class="muted">
            Raise petitions, gather verified signatures, vote in neighbourhood polls and follow
            every official response — all in one transparent civic workspace.
          </p>
          <div class="row">
            <a class="btn btn--primary" routerLink="/register">Get started</a>
            <a class="btn btn--ghost" routerLink="/login">I already have an account</a>
          </div>
        </div>
        <div class="hero__panel card">
          <h3>How Civix works</h3>
          <ol class="steps">
            <li><strong>Raise</strong> a petition for your city or ward.</li>
            <li><strong>Rally</strong> signatures from verified residents.</li>
            <li><strong>Vote</strong> in official polls on local decisions.</li>
            <li><strong>Track</strong> governance responses and status changes.</li>
          </ol>
        </div>
      </section>

      <section class="container grid grid-3 pillars">
        <div class="card">
          <h4>Petitions with accountability</h4>
          <p class="muted small">
            Every petition carries a signature target, a location and a public status trail.
          </p>
        </div>
        <div class="card">
          <h4>Polls that reflect the ward</h4>
          <p class="muted small">
            One vote per resident, live percentages and transparent result breakdowns.
          </p>
        </div>
        <div class="card">
          <h4>Reports for officials</h4>
          <p class="muted small">
            Governance dashboards summarise participation, categories and outcomes over time.
          </p>
        </div>
      </section>

      <footer class="land__foot container muted small">
        Civix — Digital Civic Engagement &amp; Petition Platform
      </footer>
    </div>
  `,
  styles: [
    `
      .land {
        min-height: 100vh;
        background:
          radial-gradient(1000px 460px at 78% -12%, var(--c-primary-soft), transparent),
          var(--c-bg);
        display: flex;
        flex-direction: column;
        gap: 48px;
        padding-bottom: 40px;
      }
      .land__bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-top: 20px;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 10px;
        font-family: var(--font-display);
        font-weight: 700;
        font-size: 1.15rem;
      }
      .brand__mark {
        width: 32px;
        height: 32px;
        border-radius: 10px;
        display: grid;
        place-items: center;
        color: #fff;
        background: linear-gradient(135deg, var(--c-primary), var(--c-accent));
      }
      .hero {
        display: grid;
        gap: 32px;
        grid-template-columns: 1.15fr 0.85fr;
        align-items: center;
        padding-top: 24px;
      }
      h1 {
        font-size: clamp(2rem, 4.4vw, 3.1rem);
        line-height: 1.08;
        margin: 14px 0 12px;
      }
      .hero p {
        max-width: 52ch;
        margin-bottom: 22px;
      }
      .steps {
        margin: 12px 0 0 18px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        color: var(--c-ink-soft);
        font-size: 0.92rem;
      }
      .pillars h4 {
        margin-bottom: 6px;
      }
      .land__foot {
        padding-top: 20px;
        border-top: 1px solid var(--c-border);
      }
      @media (max-width: 860px) {
        .hero {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class LandingPage {
  readonly auth = inject(AuthService);
}
