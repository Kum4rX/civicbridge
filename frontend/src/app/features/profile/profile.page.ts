import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { User } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { UserService } from '../../core/services/user.service';
import { apiErrorMessage } from '../../shared/utils/api-error';

type LoadState = 'idle' | 'loading' | 'loaded' | 'error';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="layout" *ngIf="user()">
      <aside class="card identity">
        <div class="avatar" aria-hidden="true">{{ initials() }}</div>
        <h1 class="h2" style="margin-top:14px">{{ user()?.fullName }}</h1>
        <p class="muted small">{{ user()?.email }}</p>
        <div class="row row--center" style="gap:8px;margin-top:8px">
          <span class="badge" [class.badge--accent]="auth.isOfficial()">
            {{ user()?.role }}
          </span>
          <span class="badge badge--active" *ngIf="user()?.verified">Verified</span>
        </div>
        <dl class="meta">
          <div><dt>Location</dt><dd>{{ locationLabel() }}</dd></div>
          <div *ngIf="user()?.createdAt"><dt>Member since</dt><dd>{{ user()?.createdAt | date: 'mediumDate' }}</dd></div>
        </dl>
        <div class="stack" style="gap:8px;margin-top:20px">
          <a class="btn btn--subtle btn--block" routerLink="/petitions/mine">My petitions</a>
          <a class="btn btn--subtle btn--block" routerLink="/petitions/signed">Petitions I signed</a>
          <a *ngIf="auth.isOfficial()" class="btn btn--subtle btn--block" routerLink="/governance">Governance desk</a>
        </div>
      </aside>

      <div class="forms-wrapper stack" style="gap:24px">
        <!-- Profile Details Card -->
        <section class="card">
          <div class="card__head">
            <h2>Edit Profile Details</h2>
            <p class="muted small">
              Update your name, registered email address, and residential location details.
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
                placeholder="e.g. 124 Main Street, Sector 4"
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
                <span class="error-text" *ngIf="invalidProfile('city')">
                  City is required.
                </span>
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
                <span class="error-text" *ngIf="invalidProfile('state')">
                  State is required.
                </span>
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
                  Enter a 4–10 digit PIN code.
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
                Save Profile
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
        background: var(--c-primary);
        color: #fff;
        font: 700 1.5rem var(--font-display);
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
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
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

  resetProfile(): void {
    const u = this.user();
    if (u) {
      this.applyUser(u);
      this.profileError.set('');
      this.profileSuccess.set('');
    }
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
