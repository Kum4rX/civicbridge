import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { UserRole } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { apiErrorMessage } from '../../core/services/http-util';
import { NotificationService } from '../../core/services/notification.service';
import { AuthPanelComponent } from './auth-panel.component';

@Component({
  selector: 'cx-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AuthPanelComponent],
  template: `
    <cx-auth-panel
      headline="Join your local civic network."
      blurb="Create a Civix account as a citizen or a government official."
    >
      <h1 class="h">Create your account</h1>
      <p class="muted small mb">Step {{ step() }} of 2</p>

      @if (error()) {
        <p class="alert">{{ error() }}</p>
      }

      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        @if (step() === 1) {
          <div class="choice-grid mb">
            @for (r of roles; track r.value) {
              <button
                type="button"
                class="choice"
                [class.is-selected]="form.controls.role.value === r.value"
                (click)="form.controls.role.setValue(r.value)"
              >
                <span class="choice__title">{{ r.label }}</span>
                <span class="choice__desc">{{ r.desc }}</span>
              </button>
            }
          </div>

          <div class="field">
            <label for="fullName">Full name</label>
            <input
              id="fullName"
              class="input"
              formControlName="fullName"
              [class.is-invalid]="invalid('fullName')"
            />
            @if (invalid('fullName')) {
              <span class="error-text">Please enter your full name.</span>
            }
          </div>

          <div class="field">
            <label for="email">Email</label>
            <input
              id="email"
              class="input"
              type="email"
              formControlName="email"
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
                [class.is-invalid]="invalid('password')"
              />
              <button class="input-group__action" type="button" (click)="show.set(!show())">
                {{ show() ? 'Hide' : 'Show' }}
              </button>
            </div>
            <span class="field__hint">Minimum 8 characters.</span>
            @if (invalid('password')) {
              <span class="error-text">Password must be at least 8 characters.</span>
            }
          </div>

          <button class="btn btn--primary btn--block" type="button" (click)="next()">
            Continue
          </button>
        } @else {
          <p class="muted small mb">
            Your location helps surface petitions and polls from your own area.
          </p>
          <div class="field">
            <label for="address">Address</label>
            <input id="address" class="input" formControlName="address" />
          </div>
          <div class="form-grid">
            <div class="field">
              <label for="city">City</label>
              <input
                id="city"
                class="input"
                formControlName="city"
                [class.is-invalid]="invalid('city')"
              />
              @if (invalid('city')) {
                <span class="error-text">City is required.</span>
              }
            </div>
            <div class="field">
              <label for="state">State</label>
              <input
                id="state"
                class="input"
                formControlName="state"
                [class.is-invalid]="invalid('state')"
              />
              @if (invalid('state')) {
                <span class="error-text">State is required.</span>
              }
            </div>
            <div class="field">
              <label for="pincode">Pincode</label>
              <input id="pincode" class="input" formControlName="pincode" />
            </div>
          </div>

          <div class="row">
            <button class="btn btn--ghost" type="button" (click)="step.set(1)">Back</button>
            <button class="btn btn--primary" type="submit" [disabled]="busy()">
              @if (busy()) {
                <span class="spinner"></span>
              }
              {{ busy() ? 'Creating account…' : 'Create account' }}
            </button>
          </div>
        }
      </form>

      <p class="muted small mt">Already registered? <a routerLink="/login">Sign in</a></p>
    </cx-auth-panel>
  `,
  styles: [
    `
      .h {
        font-size: 1.55rem;
      }
      .mb {
        margin-bottom: 16px;
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
    `,
  ],
})
export class RegisterPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);

  readonly roles: Array<{ value: UserRole; label: string; desc: string }> = [
    { value: 'CITIZEN', label: 'Citizen', desc: 'Raise, sign and vote on local issues.' },
    { value: 'OFFICIAL', label: 'Official', desc: 'Review petitions and publish responses.' },
  ];

  readonly step = signal(1);
  readonly busy = signal(false);
  readonly show = signal(false);
  readonly error = signal('');

  readonly form = this.fb.nonNullable.group({
    role: ['CITIZEN' as UserRole, Validators.required],
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    address: [''],
    city: ['', Validators.required],
    state: ['', Validators.required],
    pincode: [''],
  });

  invalid(name: string): boolean {
    const c = this.form.get(name);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  next(): void {
    const controls = ['fullName', 'email', 'password'];
    controls.forEach((c) => this.form.get(c)?.markAsTouched());
    if (controls.every((c) => this.form.get(c)?.valid)) this.step.set(2);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.auth.register(this.form.getRawValue()).subscribe({
      next: () => {
        this.busy.set(false);
        this.notify.success('Welcome to Civix.');
        void this.router.navigateByUrl('/dashboard');
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(apiErrorMessage(err, 'Registration failed. Please try again.'));
      },
    });
  }
}
