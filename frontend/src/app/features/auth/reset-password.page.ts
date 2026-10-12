import { CommonModule, NgIf } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { apiErrorMessage } from '../../core/services/http-util';
import { NotificationService } from '../../core/services/notification.service';
import { AuthPanelComponent } from './auth-panel.component';

/** Validator ensuring new password and confirm password match */
const resetPasswordsMatchValidator: ValidatorFn = (
  control: AbstractControl
): ValidationErrors | null => {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');
  if (!password || !confirmPassword) return null;
  if (confirmPassword.value && password.value !== confirmPassword.value) {
    confirmPassword.setErrors({ mismatch: true });
    return { mismatch: true };
  } else if (confirmPassword.hasError('mismatch')) {
    delete confirmPassword.errors?.['mismatch'];
    if (!Object.keys(confirmPassword.errors || {}).length) {
      confirmPassword.setErrors(null);
    }
  }
  return null;
};

@Component({
  selector: 'cx-reset-password',
  standalone: true,
  imports: [CommonModule, NgIf, ReactiveFormsModule, RouterLink, AuthPanelComponent],
  template: `
    <cx-auth-panel
      headline="Set New Password"
      blurb="Choose a strong, memorable password to protect your CivicBridge account."
    >
      <h1 class="h">Reset password</h1>
      <p class="muted small mb">Enter and confirm your new password below.</p>

      <!-- Missing / Invalid Token Banner -->
      <div *ngIf="!token()" class="alert alert--danger mb" role="alert">
        <svg class="alert-icon" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
        <div>
          <strong>Invalid Reset Link</strong>
          <p class="small" style="margin-top:4px;">
            No password reset token was provided in the link. Please request a new reset link.
          </p>
          <a routerLink="/forgot-password" class="btn btn--ghost btn--sm mt" style="margin-top:8px;">
            Request new link
          </a>
        </div>
      </div>

      <!-- Success Banner -->
      <div *ngIf="successMessage()" class="alert alert--success mb" role="alert">
        <svg class="alert-icon" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
        </svg>
        <div>
          <strong>Password reset successful!</strong>
          <p class="small" style="margin-top:4px;">{{ successMessage() }}</p>
          <a routerLink="/login" class="btn btn--primary btn--block mt" style="margin-top:12px;">
            Continue to sign in
          </a>
        </div>
      </div>

      <!-- Error Banner -->
      <div *ngIf="errorMessage()" class="alert alert--danger mb" role="alert">
        <svg class="alert-icon" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
        <div>
          <span>{{ errorMessage() }}</span>
        </div>
      </div>

      <!-- Reset Password Form -->
      <form
        *ngIf="token() && !successMessage()"
        [formGroup]="form"
        (ngSubmit)="submit()"
        novalidate
      >
        <div class="field">
          <label for="password">New Password</label>
          <div class="input-group">
            <input
              id="password"
              class="input"
              [type]="showPassword() ? 'text' : 'password'"
              formControlName="password"
              autocomplete="new-password"
              placeholder="At least 6 characters"
              [class.is-invalid]="invalid('password')"
            />
            <button
              class="input-group__action password-toggle"
              type="button"
              (click)="showPassword.set(!showPassword())"
              [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'"
            >
              <svg *ngIf="!showPassword()" class="icon-toggle" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" />
              </svg>
              <svg *ngIf="showPassword()" class="icon-toggle" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clip-rule="evenodd" />
                <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.064 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
              </svg>
              <span>{{ showPassword() ? 'Hide' : 'Show' }}</span>
            </button>
          </div>
          <span class="error-text" *ngIf="invalid('password')">
            New password must be at least 6 characters long.
          </span>
        </div>

        <div class="field">
          <label for="confirmPassword">Confirm New Password</label>
          <div class="input-group">
            <input
              id="confirmPassword"
              class="input"
              [type]="showConfirmPassword() ? 'text' : 'password'"
              formControlName="confirmPassword"
              autocomplete="new-password"
              placeholder="Repeat new password"
              [class.is-invalid]="invalid('confirmPassword')"
            />
            <button
              class="input-group__action password-toggle"
              type="button"
              (click)="showConfirmPassword.set(!showConfirmPassword())"
              [attr.aria-label]="showConfirmPassword() ? 'Hide confirm password' : 'Show confirm password'"
            >
              <svg *ngIf="!showConfirmPassword()" class="icon-toggle" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" />
              </svg>
              <svg *ngIf="showConfirmPassword()" class="icon-toggle" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clip-rule="evenodd" />
                <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.064 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
              </svg>
              <span>{{ showConfirmPassword() ? 'Hide' : 'Show' }}</span>
            </button>
          </div>
          <span class="error-text" *ngIf="form.get('confirmPassword')?.hasError('mismatch')">
            New passwords do not match.
          </span>
          <span class="error-text" *ngIf="form.get('confirmPassword')?.hasError('required') && (form.get('confirmPassword')?.touched || form.get('confirmPassword')?.dirty)">
            Please confirm your new password.
          </span>
        </div>

        <button
          class="btn btn--primary btn--block mt"
          type="submit"
          [disabled]="busy() || form.invalid"
        >
          <span class="spinner" *ngIf="busy()"></span>
          {{ busy() ? 'Resetting password…' : 'Reset password' }}
        </button>
      </form>

      <p class="muted small mt" style="text-align:center;">
        <a routerLink="/login" class="link">Back to sign in</a>
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
      .password-toggle {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-size: 0.82rem;
        cursor: pointer;
      }
      .icon-toggle {
        width: 16px;
        height: 16px;
      }
    `,
  ],
})
export class ResetPasswordPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotificationService);

  readonly token = signal<string>('');
  readonly busy = signal(false);
  readonly successMessage = signal('');
  readonly errorMessage = signal('');
  readonly showPassword = signal(false);
  readonly showConfirmPassword = signal(false);

  readonly form = this.fb.nonNullable.group(
    {
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: [resetPasswordsMatchValidator] }
  );

  ngOnInit(): void {
    const queryToken =
      this.route.snapshot.queryParamMap.get('token') ||
      this.route.snapshot.paramMap.get('token') ||
      '';
    this.token.set(queryToken.trim());
  }

  invalid(name: 'password' | 'confirmPassword'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.dirty || c.touched);
  }

  submit(): void {
    if (this.form.invalid || !this.token()) {
      this.form.markAllAsTouched();
      return;
    }

    const { password, confirmPassword } = this.form.getRawValue();
    this.busy.set(true);
    this.errorMessage.set('');

    this.auth
      .resetPassword({
        token: this.token(),
        password,
        confirmPassword,
      })
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: (res) => {
          this.successMessage.set(
            res?.message ||
              'Your password has been reset successfully. You can now log in.'
          );
          this.notify.success('Password reset successfully.');
        },
        error: (err) => {
          this.errorMessage.set(
            apiErrorMessage(
              err,
              'Failed to reset password. The reset link may be invalid or expired.'
            )
          );
        },
      });
  }
}
