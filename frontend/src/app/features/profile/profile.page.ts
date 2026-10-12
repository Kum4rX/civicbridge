import { CommonModule, DatePipe, NgIf } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { LoadState } from '../../core/models/api.model';
import { User } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { apiErrorMessage } from '../../core/services/http-util';
import { NotificationService } from '../../core/services/notification.service';
import { UserService } from '../../core/services/user.service';
import { ErrorStateComponent } from '../../shared/components/error-state.component';
import { LoaderComponent } from '../../shared/components/loader.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';

/** Validator to confirm matching new passwords */
const passwordsMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const newPassword = control.get('newPassword');
  const confirmPassword = control.get('confirmPassword');
  if (!newPassword || !confirmPassword) return null;
  if (confirmPassword.value && newPassword.value !== confirmPassword.value) {
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
  selector: 'cx-profile',
  standalone: true,
  imports: [
    CommonModule,
    NgIf,
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    PageHeaderComponent,
    LoaderComponent,
    ErrorStateComponent,
  ],
  template: `
    <cx-page-header
      eyebrow="Account & Security"
      title="Your profile"
      subtitle="Manage your personal details, civic locality, and account security credentials."
    >
      <button class="btn btn--ghost" type="button" (click)="auth.logout()">Sign out</button>
    </cx-page-header>

    <cx-loader *ngIf="state() === 'loading'" variant="rows" [count]="4" />

    <cx-error-state
      *ngIf="state() === 'error'"
      title="Could not load profile"
      [message]="error()"
      (retry)="load()"
    />

    <div class="layout" *ngIf="state() === 'loaded'">
      <!-- Aside User Card -->
      <aside class="card identity">
        <div class="avatar" aria-hidden="true">{{ initials() }}</div>
        <h3 style="margin-top:14px;margin-bottom:4px;font-size:1.15rem;">{{ user()?.fullName }}</h3>
        <p class="muted small" style="margin-bottom:12px;">{{ user()?.email }}</p>

        <div class="row" style="justify-content:center;gap:8px;margin-bottom:16px;">
          <span class="badge" [class.badge--success]="user()?.role === 'CITIZEN'" [class.badge--accent]="user()?.role === 'OFFICIAL'">
            {{ user()?.role }}
          </span>
          <span class="badge badge--success" *ngIf="user()?.verified">Verified</span>
        </div>

        <dl class="meta">
          <div><dt>Locality</dt><dd>{{ locationLabel() }}</dd></div>
          <div *ngIf="user()?.address"><dt>Street</dt><dd>{{ user()?.address }}</dd></div>
          <div *ngIf="user()?.pincode"><dt>PIN code</dt><dd>{{ user()?.pincode }}</dd></div>
          <div *ngIf="user()?.createdAt"><dt>Member since</dt><dd>{{ user()?.createdAt | date: 'mediumDate' }}</dd></div>
        </dl>

        <div class="stack" style="gap:8px;margin-top:20px">
          <a class="btn btn--subtle btn--block" routerLink="/petitions/mine">My petitions</a>
          <a class="btn btn--subtle btn--block" routerLink="/petitions/signed">Petitions I signed</a>
          <a *ngIf="auth.isOfficial()" class="btn btn--subtle btn--block" routerLink="/governance">Governance desk</a>
        </div>
      </aside>

      <!-- Main Form Area -->
      <div class="stack" style="gap:24px;">
        <!-- Edit Profile Details Card -->
        <section class="card">
          <div class="card__head">
            <h2>Personal & Location Details</h2>
            <p class="muted small">
              Edit your name, email, and civic location. Changes are saved immediately to your account.
            </p>
          </div>

          <div *ngIf="profileSuccess()" class="alert-banner alert-banner--success" role="alert">
            <svg class="alert-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
            <span>{{ profileSuccess() }}</span>
          </div>

          <div *ngIf="profileError()" class="alert-banner alert-banner--error" role="alert">
            <svg class="alert-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            <span>{{ profileError() }}</span>
          </div>

          <form [formGroup]="profileForm" (ngSubmit)="saveProfile()" novalidate>
            <div class="form-grid">
              <div class="field">
                <label for="fullName">Full Name <span class="required">*</span></label>
                <input
                  id="fullName"
                  class="input"
                  formControlName="fullName"
                  [class.is-invalid]="invalidProfile('fullName')"
                  autocomplete="name"
                  placeholder="e.g. John Doe"
                />
                <span class="error-text" *ngIf="invalidProfile('fullName')">
                  Full name is required (2–100 characters).
                </span>
              </div>

              <div class="field">
                <label for="email">Email Address <span class="required">*</span></label>
                <input
                  id="email"
                  type="email"
                  class="input"
                  formControlName="email"
                  [class.is-invalid]="invalidProfile('email')"
                  autocomplete="email"
                  placeholder="e.g. user@example.com"
                />
                <span class="error-text" *ngIf="invalidProfile('email')">
                  Enter a valid email address.
                </span>
              </div>
            </div>

            <div class="field">
              <label for="address">Street Address</label>
              <input
                id="address"
                class="input"
                formControlName="address"
                autocomplete="street-address"
                placeholder="House/flat number, building name, street"
              />
            </div>

            <div class="form-grid form-grid--3">
              <div class="field">
                <label for="city">City <span class="required">*</span></label>
                <input
                  id="city"
                  class="input"
                  formControlName="city"
                  [class.is-invalid]="invalidProfile('city')"
                  autocomplete="address-level2"
                  placeholder="e.g. Bengaluru"
                />
                <span class="error-text" *ngIf="invalidProfile('city')">City is required.</span>
              </div>

              <div class="field">
                <label for="state">State <span class="required">*</span></label>
                <input
                  id="state"
                  class="input"
                  formControlName="state"
                  [class.is-invalid]="invalidProfile('state')"
                  autocomplete="address-level1"
                  placeholder="e.g. Karnataka"
                />
                <span class="error-text" *ngIf="invalidProfile('state')">State is required.</span>
              </div>

              <div class="field">
                <label for="pincode">PIN Code</label>
                <input
                  id="pincode"
                  class="input"
                  formControlName="pincode"
                  inputmode="numeric"
                  [class.is-invalid]="invalidProfile('pincode')"
                  autocomplete="postal-code"
                  placeholder="e.g. 560001"
                />
                <span class="error-text" *ngIf="invalidProfile('pincode')">
                  Enter a valid 4–10 digit PIN code.
                </span>
              </div>
            </div>

            <div class="row form-actions">
              <button
                type="button"
                class="btn btn--ghost"
                (click)="resetProfile()"
                [disabled]="profileSaving() || profileForm.pristine"
              >
                Reset
              </button>
              <button
                type="submit"
                class="btn btn--primary"
                [disabled]="profileSaving() || profileForm.pristine"
              >
                <span class="spinner" *ngIf="profileSaving()"></span>
                {{ profileSaving() ? 'Saving changes…' : 'Save profile changes' }}
              </button>
            </div>
          </form>
        </section>

        <!-- Change Password Card -->
        <section class="card">
          <div class="card__head">
            <h2>Change Password</h2>
            <p class="muted small">
              Keep your account secure by using a strong password of at least 6 characters.
            </p>
          </div>

          <div *ngIf="passwordSuccess()" class="alert-banner alert-banner--success" role="alert">
            <svg class="alert-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
            <span>{{ passwordSuccess() }}</span>
          </div>

          <div *ngIf="passwordError()" class="alert-banner alert-banner--error" role="alert">
            <svg class="alert-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            <span>{{ passwordError() }}</span>
          </div>

          <form [formGroup]="passwordForm" (ngSubmit)="changePassword()" novalidate>
            <!-- Current Password -->
            <div class="field">
              <label for="currentPassword">Current Password <span class="required">*</span></label>
              <div class="input-group">
                <input
                  id="currentPassword"
                  class="input"
                  [type]="showCurrentPassword() ? 'text' : 'password'"
                  formControlName="currentPassword"
                  [class.is-invalid]="invalidPassword('currentPassword')"
                  autocomplete="current-password"
                  placeholder="Enter your current password"
                />
                <button
                  type="button"
                  class="input-group__action password-toggle"
                  (click)="showCurrentPassword.set(!showCurrentPassword())"
                  [attr.aria-label]="showCurrentPassword() ? 'Hide current password' : 'Show current password'"
                >
                  <svg *ngIf="!showCurrentPassword()" class="icon-toggle" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" />
                  </svg>
                  <svg *ngIf="showCurrentPassword()" class="icon-toggle" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clip-rule="evenodd" />
                    <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.064 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                  </svg>
                  <span>{{ showCurrentPassword() ? 'Hide' : 'Show' }}</span>
                </button>
              </div>
              <span class="error-text" *ngIf="invalidPassword('currentPassword')">
                Current password is required.
              </span>
            </div>

            <div class="form-grid">
              <!-- New Password -->
              <div class="field">
                <label for="newPassword">New Password <span class="required">*</span></label>
                <div class="input-group">
                  <input
                    id="newPassword"
                    class="input"
                    [type]="showNewPassword() ? 'text' : 'password'"
                    formControlName="newPassword"
                    [class.is-invalid]="invalidPassword('newPassword')"
                    autocomplete="new-password"
                    placeholder="At least 6 characters"
                  />
                  <button
                    type="button"
                    class="input-group__action password-toggle"
                    (click)="showNewPassword.set(!showNewPassword())"
                    [attr.aria-label]="showNewPassword() ? 'Hide new password' : 'Show new password'"
                  >
                    <svg *ngIf="!showNewPassword()" class="icon-toggle" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" />
                    </svg>
                    <svg *ngIf="showNewPassword()" class="icon-toggle" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clip-rule="evenodd" />
                      <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.064 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                    </svg>
                    <span>{{ showNewPassword() ? 'Hide' : 'Show' }}</span>
                  </button>
                </div>
                <span class="error-text" *ngIf="invalidPassword('newPassword')">
                  New password must be at least 6 characters long.
                </span>
              </div>

              <!-- Confirm New Password -->
              <div class="field">
                <label for="confirmPassword">Confirm New Password <span class="required">*</span></label>
                <div class="input-group">
                  <input
                    id="confirmPassword"
                    class="input"
                    [type]="showConfirmPassword() ? 'text' : 'password'"
                    formControlName="confirmPassword"
                    [class.is-invalid]="invalidPassword('confirmPassword')"
                    autocomplete="new-password"
                    placeholder="Repeat new password"
                  />
                  <button
                    type="button"
                    class="input-group__action password-toggle"
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
                <span class="error-text" *ngIf="passwordForm.get('confirmPassword')?.hasError('mismatch')">
                  New passwords do not match.
                </span>
                <span class="error-text" *ngIf="passwordForm.get('confirmPassword')?.hasError('required') && (passwordForm.get('confirmPassword')?.touched || passwordForm.get('confirmPassword')?.dirty)">
                  Please confirm your new password.
                </span>
              </div>
            </div>

            <div class="row form-actions">
              <button
                type="button"
                class="btn btn--ghost"
                (click)="resetPasswordForm()"
                [disabled]="passwordSaving() || passwordForm.pristine"
              >
                Reset
              </button>
              <button
                type="submit"
                class="btn btn--primary"
                [disabled]="passwordSaving() || passwordForm.invalid || passwordForm.pristine"
              >
                <span class="spinner" *ngIf="passwordSaving()"></span>
                {{ passwordSaving() ? 'Updating password…' : 'Update password' }}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  `,
  styles: [
    `
      .layout {
        display: grid;
        gap: 24px;
        grid-template-columns: minmax(260px, 320px) minmax(0, 1fr);
        align-items: start;
      }
      .identity {
        text-align: center;
      }
      .avatar {
        width: 72px;
        height: 72px;
        margin: 0 auto;
        border-radius: 50%;
        display: grid;
        place-items: center;
        background: linear-gradient(135deg, var(--c-primary), #14307a);
        color: #fff;
        font: 700 1.5rem var(--font-display);
        box-shadow: 0 4px 12px rgba(31, 78, 216, 0.25);
      }
      .meta {
        margin-top: 20px;
        text-align: left;
        border-top: 1px solid var(--c-border);
      }
      .meta div {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 10px 0;
        border-bottom: 1px solid var(--c-border);
        font-size: 0.85rem;
      }
      .meta dt {
        color: var(--c-ink-muted);
      }
      .meta dd {
        font-weight: 600;
        text-align: right;
      }
      .form-grid--3 {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
      .form-actions {
        justify-content: flex-end;
        gap: 12px;
        margin-top: 12px;
      }
      .required {
        color: var(--c-danger);
      }
      .alert-banner {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 14px;
        border-radius: var(--r-sm);
        font-size: 0.88rem;
        font-weight: 500;
        margin-bottom: 18px;
      }
      .alert-banner--success {
        background: var(--c-success-soft);
        color: var(--c-success);
        border: 1px solid rgba(18, 128, 92, 0.2);
      }
      .alert-banner--error {
        background: var(--c-danger-soft);
        color: var(--c-danger);
        border: 1px solid rgba(180, 35, 24, 0.2);
      }
      .alert-icon {
        width: 18px;
        height: 18px;
        flex-shrink: 0;
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
      @media (max-width: 900px) {
        .layout {
          grid-template-columns: 1fr;
        }
        .form-grid--3 {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class ProfilePage implements OnInit {
  readonly auth = inject(AuthService);
  private readonly users = inject(UserService);
  private readonly toast = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  readonly state = signal<LoadState>('idle');
  readonly error = signal('');
  readonly user = signal<User | null>(this.auth.user());

  // Profile Form States
  readonly profileSaving = signal(false);
  readonly profileError = signal('');
  readonly profileSuccess = signal('');

  // Password Form States
  readonly passwordSaving = signal(false);
  readonly passwordError = signal('');
  readonly passwordSuccess = signal('');
  readonly showCurrentPassword = signal(false);
  readonly showNewPassword = signal(false);
  readonly showConfirmPassword = signal(false);

  readonly initials = computed(() =>
    (this.user()?.fullName ?? '?')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join(''),
  );

  readonly locationLabel = computed(() => {
    const u = this.user();
    return [u?.city, u?.state].filter(Boolean).join(', ') || 'Not set';
  });

  readonly profileForm = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    address: ['', [Validators.maxLength(200)]],
    city: ['', [Validators.required, Validators.maxLength(100)]],
    state: ['', [Validators.required, Validators.maxLength(100)]],
    pincode: ['', [Validators.pattern(/^\d{4,10}$/)]],
  });

  readonly passwordForm = this.fb.nonNullable.group(
    {
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: [passwordsMatchValidator] }
  );

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.state.set('loading');
    this.users.profile().subscribe({
      next: (user) => {
        this.applyUser(user);
        this.state.set('loaded');
      },
      error: (err) => {
        this.error.set(apiErrorMessage(err, 'Failed to retrieve profile details.'));
        this.state.set('error');
      },
    });
  }

  invalidProfile(name: keyof typeof this.profileForm.controls): boolean {
    const c = this.profileForm.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  invalidPassword(name: keyof typeof this.passwordForm.controls): boolean {
    const c = this.passwordForm.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  resetProfile(): void {
    const u = this.user();
    if (u) {
      this.applyUser(u);
      this.profileError.set('');
      this.profileSuccess.set('');
    }
  }

  resetPasswordForm(): void {
    this.passwordForm.reset({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    this.passwordError.set('');
    this.passwordSuccess.set('');
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.profileSaving.set(true);
    this.profileError.set('');
    this.profileSuccess.set('');

    const v = this.profileForm.getRawValue();
    this.users
      .updateProfile({
        fullName: v.fullName.trim(),
        email: v.email.trim(),
        address: v.address.trim() || null,
        city: v.city.trim(),
        state: v.state.trim(),
        pincode: v.pincode.trim() || null,
      })
      .pipe(finalize(() => this.profileSaving.set(false)))
      .subscribe({
        next: (updatedUser) => {
          this.applyUser(updatedUser);
          this.profileSuccess.set('Profile details updated successfully.');
          this.toast.success('Profile updated.');
        },
        error: (err) => {
          const msg = apiErrorMessage(err, 'Could not save your profile changes.');
          this.profileError.set(msg);
          this.toast.error(msg);
        },
      });
  }

  changePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.passwordSaving.set(true);
    this.passwordError.set('');
    this.passwordSuccess.set('');

    const v = this.passwordForm.getRawValue();
    this.users
      .changePassword({
        currentPassword: v.currentPassword,
        newPassword: v.newPassword,
        confirmPassword: v.confirmPassword,
      })
      .pipe(finalize(() => this.passwordSaving.set(false)))
      .subscribe({
        next: (res) => {
          this.passwordSuccess.set(res.message || 'Password changed successfully.');
          this.toast.success('Password changed successfully.');
          this.resetPasswordForm();
        },
        error: (err) => {
          const msg = apiErrorMessage(err, 'Failed to change password. Check your current password.');
          this.passwordError.set(msg);
          this.toast.error(msg);
        },
      });
  }

  private applyUser(user: User): void {
    this.user.set(user);
    this.profileForm.reset({
      fullName: user.fullName ?? '',
      email: user.email ?? '',
      address: user.address ?? '',
      city: user.city ?? '',
      state: user.state ?? '',
      pincode: user.pincode ?? '',
    });
  }
}
