import { CommonModule, NgIf } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { apiErrorMessage } from '../../core/services/http-util';
import { NotificationService } from '../../core/services/notification.service';
import { AuthPanelComponent } from './auth-panel.component';

@Component({
  selector: 'cx-forgot-password',
  standalone: true,
  imports: [CommonModule, NgIf, ReactiveFormsModule, RouterLink, AuthPanelComponent],
  template: `
    <cx-auth-panel
      headline="Account Recovery"
      blurb="Regain secure access to your Civix account to continue raising and signing local petitions."
    >
      <h1 class="h">Forgot password?</h1>
      <p class="muted small mb">
        Enter the email address associated with your account and we’ll send you a password reset link.
      </p>

      <div *ngIf="successMessage()" class="alert alert--success mb" role="alert">
        <svg class="alert-icon" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
        </svg>
        <div>
          <strong>Check your inbox</strong>
          <p class="small" style="margin-top:4px;">{{ successMessage() }}</p>
        </div>
      </div>

      <div *ngIf="errorMessage()" class="alert alert--danger mb" role="alert">
        <svg class="alert-icon" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
        <div>
          <span>{{ errorMessage() }}</span>
        </div>
      </div>

      <form [formGroup]="form" (ngSubmit)="submit()" novalidate *ngIf="!submitted()">
        <div class="field">
          <label for="email">Registered Email Address</label>
          <input
            id="email"
            class="input"
            type="email"
            formControlName="email"
            autocomplete="email"
            placeholder="e.g. citizen@example.com"
            [class.is-invalid]="invalid('email')"
          />
          <span class="error-text" *ngIf="invalid('email')">
            Please enter a valid email address.
          </span>
        </div>

        <button class="btn btn--primary btn--block mt" type="submit" [disabled]="busy()">
          <span class="spinner" *ngIf="busy()"></span>
          {{ busy() ? 'Sending link…' : 'Send password reset link' }}
        </button>
      </form>

      <div *ngIf="submitted()" class="stack mt" style="gap:10px;">
        <button type="button" class="btn btn--ghost btn--block" (click)="resend()">
          Send to another email
        </button>
      </div>

      <p class="muted small mt" style="text-align:center;">
        Remember your password? <a routerLink="/login" class="link">Back to sign in</a>
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
        margin-top: 16px;
      }
      .alert {
        display: flex;
        gap: 12px;
        align-items: flex-start;
        padding: 12px 14px;
        border-radius: var(--r-sm);
        font-size: 0.88rem;
      }
      .alert--success {
        background: var(--c-success-soft);
        color: var(--c-success);
        border: 1px solid rgba(18, 128, 92, 0.2);
      }
      .alert--danger {
        background: var(--c-danger-soft);
        color: var(--c-danger);
        border: 1px solid rgba(180, 35, 24, 0.2);
      }
      .alert-icon {
        width: 20px;
        height: 20px;
        flex-shrink: 0;
        margin-top: 1px;
      }
      .link {
        color: var(--c-primary);
        font-weight: 500;
        text-decoration: none;
      }
      .link:hover {
        text-decoration: underline;
      }
    `,
  ],
})
export class ForgotPasswordPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotificationService);

  readonly busy = signal(false);
  readonly submitted = signal(false);
  readonly successMessage = signal('');
  readonly errorMessage = signal('');

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  invalid(name: 'email'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.dirty || c.touched);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email } = this.form.getRawValue();
    this.busy.set(true);
    this.errorMessage.set('');

    this.auth
      .forgotPassword({ email: email.trim() })
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: (res) => {
          this.submitted.set(true);
          const msg =
            res?.message ||
            'If an account exists with that email address, a password reset link has been sent.';
          this.successMessage.set(msg);
          this.notify.success('Password reset request submitted.');
        },
        error: (err) => {
          this.errorMessage.set(
            apiErrorMessage(err, 'Unable to process password reset request. Please try again.')
          );
        },
      });
  }

  resend(): void {
    this.submitted.set(false);
    this.successMessage.set('');
    this.errorMessage.set('');
    this.form.reset();
  }
}
