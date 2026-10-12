import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { apiErrorMessage } from '../../core/services/http-util';
import { AuthPanelComponent } from './auth-panel.component';

@Component({
  selector: 'cx-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AuthPanelComponent],
  template: `
    <cx-auth-panel
      headline="Your city, your voice."
      blurb="Sign in to raise petitions, sign the ones that matter and vote in local polls."
    >
      <h1 class="h">Sign in</h1>
      <p class="muted small mb">Use the account you registered on Civix.</p>

      @if (error()) {
        <p class="alert">{{ error() }}</p>
      }

      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <div class="field">
          <label for="email">Email</label>
          <input
            id="email"
            class="input"
            type="email"
            formControlName="email"
            autocomplete="email"
            [class.is-invalid]="invalid('email')"
          />
          @if (invalid('email')) {
            <span class="error-text">Enter a valid email address.</span>
          }
        </div>

        <div class="field">
          <label for="password">Password</label>
          <div class="input-group">
            <input
              id="password"
              class="input"
              [type]="show() ? 'text' : 'password'"
              formControlName="password"
              autocomplete="current-password"
              [class.is-invalid]="invalid('password')"
            />
            <button class="input-group__action" type="button" (click)="show.set(!show())">
              {{ show() ? 'Hide' : 'Show' }}
            </button>
          </div>
          @if (invalid('password')) {
            <span class="error-text">Password is required.</span>
          }
        </div>

        <div class="row row--between small" style="margin-top: 4px; margin-bottom: 8px;">
          <label class="row" style="margin: 0; gap: 6px;">
            <input type="checkbox" formControlName="remember" /> Keep me signed in
          </label>
          <a routerLink="/forgot-password" class="small forgot-link">Forgot password?</a>
        </div>

        <button class="btn btn--primary btn--block mt" type="submit" [disabled]="busy()">
          @if (busy()) {
            <span class="spinner"></span>
          }
          {{ busy() ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>

      <p class="muted small mt">
        New to Civix? <a routerLink="/register">Create an account</a>
      </p>
    </cx-auth-panel>
  `,
  styles: [
    `
      .h {
        font-size: 1.6rem;
      }
      .mb {
        margin-bottom: 18px;
      }
      .mt {
        margin-top: 14px;
      }
      .alert {
        background: var(--c-danger-soft);
        color: var(--c-danger);
        padding: 10px 12px;
        border-radius: var(--r-sm);
        font-size: 0.85rem;
        margin-bottom: 14px;
      }
      .forgot-link {
        color: var(--c-primary);
        font-weight: 500;
        text-decoration: none;
      }
      .forgot-link:hover {
        text-decoration: underline;
      }
    `,
  ],
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly notify = inject(NotificationService);

  readonly busy = signal(false);
  readonly show = signal(false);
  readonly error = signal('');

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
    remember: [true],
  });

  invalid(name: string): boolean {
    const c = this.form.get(name);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { email, password, remember } = this.form.getRawValue();
    this.busy.set(true);
    this.error.set('');
    this.auth.login({ email, password }, remember).subscribe({
      next: () => {
        this.busy.set(false);
        this.notify.success('Signed in successfully.');
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/dashboard';
        void this.router.navigateByUrl(returnUrl);
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(apiErrorMessage(err, 'Invalid email or password.'));
      },
    });
  }
}
