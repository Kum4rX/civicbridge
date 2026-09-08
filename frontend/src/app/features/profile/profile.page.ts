import { DatePipe, NgIf } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { LoadState } from '../../core/models/api.model';
import { User } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { apiErrorMessage, isUnavailable } from '../../core/services/http-util';
import { NotificationService } from '../../core/services/notification.service';
import { UserService } from '../../core/services/user.service';
import { ErrorStateComponent } from '../../shared/components/error-state.component';
import { LoaderComponent } from '../../shared/components/loader.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';

@Component({
  selector: 'cx-profile',
  standalone: true,
  imports: [NgIf, DatePipe, ReactiveFormsModule, RouterLink, PageHeaderComponent, LoaderComponent, ErrorStateComponent],
  template: `
    <cx-page-header
      eyebrow="Account"
      title="Your profile"
      subtitle="Your location decides which petitions and polls are shown to you first."
    >
      <button class="btn btn--ghost" type="button" (click)="auth.logout()">Sign out</button>
    </cx-page-header>

    <cx-loader *ngIf="state() === 'loading'" variant="rows" [count]="4"></cx-loader>
    <cx-error-state
      *ngIf="state() === 'error'"
      title="Couldn’t load your profile"
      [message]="error()"
      (retry)="load()"
    ></cx-error-state>

    <div class="layout" *ngIf="state() === 'loaded' || state() === 'unavailable'">
      <aside class="card identity">
        <div class="avatar" aria-hidden="true">{{ initials() }}</div>
        <h2 style="margin-top:14px">{{ user()?.fullName }}</h2>
        <p class="muted small">{{ user()?.email }}</p>
        <div class="row" style="margin-top:12px;flex-wrap:wrap">
          <span class="badge" [class.badge--info]="auth.isOfficial()" [class.badge--active]="auth.isCitizen()">
            {{ auth.isOfficial() ? 'Government official' : 'Citizen' }}
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

      <section class="card">
        <div class="card__head">
          <h2>Edit details</h2>
          <p class="muted small" *ngIf="state() === 'unavailable'">
            Profile editing isn’t exposed by the backend yet — showing your sign-in details.
          </p>
        </div>

        <form [formGroup]="form" (ngSubmit)="save()" novalidate>
          <div class="form-grid">
            <div class="field">
              <label for="fullName">Full name</label>
              <input id="fullName" class="input" formControlName="fullName" [class.is-invalid]="invalid('fullName')" autocomplete="name" />
              <span class="error-text" *ngIf="invalid('fullName')">Name is required (2–80 characters).</span>
            </div>
            <div class="field">
              <label for="email">Email</label>
              <input id="email" type="email" class="input" formControlName="email" [class.is-invalid]="invalid('email')" autocomplete="email" />
              <span class="error-text" *ngIf="invalid('email')">Enter a valid email address.</span>
            </div>
          </div>

          <div class="field">
            <label for="address">Street address</label>
            <input id="address" class="input" formControlName="address" autocomplete="street-address" />
          </div>

          <div class="form-grid">
            <div class="field">
              <label for="city">City</label>
              <input id="city" class="input" formControlName="city" [class.is-invalid]="invalid('city')" autocomplete="address-level2" />
              <span class="error-text" *ngIf="invalid('city')">City is required.</span>
            </div>
            <div class="field">
              <label for="state">State</label>
              <input id="state" class="input" formControlName="state" [class.is-invalid]="invalid('state')" autocomplete="address-level1" />
              <span class="error-text" *ngIf="invalid('state')">State is required.</span>
            </div>
            <div class="field">
              <label for="pincode">PIN code</label>
              <input id="pincode" class="input" formControlName="pincode" inputmode="numeric" [class.is-invalid]="invalid('pincode')" autocomplete="postal-code" />
              <span class="error-text" *ngIf="invalid('pincode')">Enter a 4–10 digit code.</span>
            </div>
          </div>

          <div class="row" style="justify-content:flex-end;margin-top:8px">
            <button type="button" class="btn btn--ghost" (click)="reset()" [disabled]="saving() || form.pristine">Reset</button>
            <button type="submit" class="btn btn--primary" [disabled]="saving() || form.pristine || state() === 'unavailable'">
              <span class="spinner" *ngIf="saving()"></span>Save changes
            </button>
          </div>
        </form>
      </section>
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
      @media (max-width: 900px) {
        .layout {
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
  readonly saving = signal(false);
  readonly user = signal<User | null>(this.auth.user());

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

  readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    address: ['', [Validators.maxLength(200)]],
    city: ['', [Validators.required, Validators.maxLength(80)]],
    state: ['', [Validators.required, Validators.maxLength(80)]],
    pincode: ['', [Validators.pattern(/^\d{4,10}$/)]],
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.state.set('loading');
    this.users.profile().subscribe({
      next: (user) => {
        this.apply(user);
        this.auth.setUser(user);
        this.state.set('loaded');
      },
      error: (err) => {
        if (isUnavailable(err)) {
          // Fall back to /auth/me which is part of the known contract.
          this.auth.loadCurrentUser().subscribe({
            next: (user) => {
              this.apply(user);
              this.state.set('unavailable');
            },
            error: (e) => {
              this.error.set(apiErrorMessage(e));
              this.state.set('error');
            },
          });
          return;
        }
        this.error.set(apiErrorMessage(err));
        this.state.set('error');
      },
    });
  }

  invalid(name: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  reset(): void {
    const u = this.user();
    if (u) this.apply(u);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const v = this.form.getRawValue();
    this.users
      .updateProfile({
        fullName: v.fullName.trim(),
        email: v.email.trim(),
        address: v.address.trim() || null,
        city: v.city.trim(),
        state: v.state.trim(),
        pincode: v.pincode.trim() || null,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (user) => {
          const merged = { ...this.user(), ...user } as User;
          this.apply(merged);
          this.auth.setUser(merged);
          this.toast.success('Profile updated.');
        },
        error: (err) => this.toast.error(apiErrorMessage(err, 'Could not save your profile.')),
      });
  }

  private apply(user: User): void {
    this.user.set(user);
    this.form.reset({
      fullName: user.fullName ?? '',
      email: user.email ?? '',
      address: user.address ?? '',
      city: user.city ?? '',
      state: user.state ?? '',
      pincode: user.pincode ?? '',
    });
  }
}
