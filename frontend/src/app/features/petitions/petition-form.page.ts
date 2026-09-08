import { NgFor, NgIf } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LoadState } from '../../core/models/api.model';
import { PETITION_CATEGORIES, Petition, PetitionPayload } from '../../core/models/petition.model';
import { AuthService } from '../../core/services/auth.service';
import { apiErrorMessage } from '../../core/services/http-util';
import { NotificationService } from '../../core/services/notification.service';
import { PetitionService } from '../../core/services/petition.service';
import { ErrorStateComponent } from '../../shared/components/error-state.component';
import { LoaderComponent } from '../../shared/components/loader.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';

const URL_RE = /^https?:\/\/\S+$/i;

@Component({
  selector: 'cx-petition-form',
  standalone: true,
  imports: [NgIf, NgFor, ReactiveFormsModule, RouterLink, PageHeaderComponent, ErrorStateComponent, LoaderComponent],
  template: `
    <cx-page-header
      [eyebrow]="isEdit() ? 'Edit petition' : 'New petition'"
      [title]="isEdit() ? 'Update your petition' : 'Start a petition'"
      [subtitle]="isEdit() ? 'Changes are only allowed while the petition has no signatures.' : 'Describe the issue clearly — petitions with specific goals get more support.'"
    >
      <a class="btn btn--ghost" [routerLink]="isEdit() ? ['/petitions', id] : ['/petitions']">Cancel</a>
    </cx-page-header>

    <cx-loader *ngIf="state() === 'loading'" variant="rows" [count]="5"></cx-loader>
    <cx-error-state *ngIf="state() === 'error'" title="Couldn’t load petition" [message]="error()" (retry)="loadExisting()"></cx-error-state>

    <div class="card" *ngIf="state() === 'unavailable'">
      <h3>This petition can’t be edited</h3>
      <p class="muted small" style="margin:8px 0 16px">Only the creator can edit a petition, and only while it has zero signatures.</p>
      <a class="btn btn--primary" [routerLink]="['/petitions', id]">View petition</a>
    </div>

    <form *ngIf="state() === 'loaded'" [formGroup]="form" (ngSubmit)="submit()" class="layout" novalidate>
      <div class="stack" style="gap:20px">
        <section class="card">
          <h2 class="section-title">The issue</h2>
          <div class="field">
            <label for="title">Title</label>
            <input id="title" class="input" formControlName="title" maxlength="120" [class.is-invalid]="invalid('title')" placeholder="e.g. Fix the streetlights on MG Road" />
            <div class="spread">
              <span class="error-text" *ngIf="invalid('title')">Title must be 10–120 characters.</span>
              <span class="counter">{{ form.controls.title.value.length }}/120</span>
            </div>
          </div>
          <div class="field">
            <label for="description">Description</label>
            <textarea id="description" class="textarea" formControlName="description" maxlength="3000" [class.is-invalid]="invalid('description')" placeholder="What is the problem, who does it affect, and what change are you asking for?"></textarea>
            <div class="spread">
              <span class="error-text" *ngIf="invalid('description')">Description must be at least 50 characters.</span>
              <span class="counter">{{ form.controls.description.value.length }}/3000</span>
            </div>
          </div>
          <div class="form-grid">
            <div class="field">
              <label for="category">Category</label>
              <select id="category" class="select" formControlName="category" [class.is-invalid]="invalid('category')">
                <option value="" disabled>Select a category</option>
                <option *ngFor="let c of categories" [value]="c">{{ c }}</option>
              </select>
              <span class="error-text" *ngIf="invalid('category')">Please choose a category.</span>
            </div>
            <div class="field">
              <label for="target">Signature goal</label>
              <input id="target" class="input" type="number" min="10" max="1000000" formControlName="targetSignatures" [class.is-invalid]="invalid('targetSignatures')" />
              <span class="error-text" *ngIf="invalid('targetSignatures')">Goal must be between 10 and 1,000,000.</span>
            </div>
          </div>
          <div class="field">
            <label for="tags">Tags</label>
            <div class="input-group">
              <input id="tags" class="input" formControlName="tagInput" placeholder="Add a tag and press Enter" (keydown.enter)="addTag($event)" />
              <button type="button" class="input-group__action" (click)="addTag()">Add</button>
            </div>
            <span class="field__hint">Up to 6 short keywords to help people find this petition.</span>
            <div class="row" style="flex-wrap:wrap;gap:6px" *ngIf="tags().length">
              <span class="badge badge--tag" *ngFor="let t of tags()">
                #{{ t }}
                <button type="button" class="x" (click)="removeTag(t)" [attr.aria-label]="'Remove tag ' + t">×</button>
              </span>
            </div>
          </div>
        </section>

        <section class="card">
          <h2 class="section-title">Location</h2>
          <p class="muted small" style="margin-bottom:14px">Petitions are surfaced to citizens and officials in this locality.</p>
          <div class="form-grid">
            <div class="field">
              <label for="city">City</label>
              <input id="city" class="input" formControlName="city" [class.is-invalid]="invalid('city')" />
              <span class="error-text" *ngIf="invalid('city')">City is required.</span>
            </div>
            <div class="field">
              <label for="state">State</label>
              <input id="state" class="input" formControlName="state" [class.is-invalid]="invalid('state')" />
              <span class="error-text" *ngIf="invalid('state')">State is required.</span>
            </div>
            <div class="field">
              <label for="pincode">Pincode <span class="muted">(optional)</span></label>
              <input id="pincode" class="input" formControlName="pincode" inputmode="numeric" />
            </div>
          </div>
          <div class="field">
            <label for="address">Address / landmark <span class="muted">(optional)</span></label>
            <input id="address" class="input" formControlName="address" />
          </div>
        </section>

        <section class="card">
          <h2 class="section-title">Media <span class="muted">(optional)</span></h2>
          <div class="field">
            <label for="media">Image URL</label>
            <div class="input-group">
              <input id="media" class="input" formControlName="mediaInput" placeholder="https://…" (keydown.enter)="addMedia($event)" />
              <button type="button" class="input-group__action" (click)="addMedia()">Add</button>
            </div>
            <span class="error-text" *ngIf="mediaError()">{{ mediaError() }}</span>
          </div>
          <div class="media" *ngIf="mediaUrls().length">
            <div class="media__item" *ngFor="let m of mediaUrls()">
              <img [src]="m" alt="" />
              <button type="button" class="btn btn--danger btn--sm" (click)="removeMedia(m)">Remove</button>
            </div>
          </div>
        </section>
      </div>

      <aside class="card summary">
        <h3 class="section-title">Before you publish</h3>
        <ul class="checks">
          <li [class.ok]="form.controls.title.valid">Clear, specific title</li>
          <li [class.ok]="form.controls.description.valid">Detailed description (50+ chars)</li>
          <li [class.ok]="form.controls.category.valid">Category selected</li>
          <li [class.ok]="form.controls.city.valid && form.controls.state.valid">Location set</li>
        </ul>
        <div class="error-text" role="alert" *ngIf="submitError()" style="margin-bottom:12px">{{ submitError() }}</div>
        <button class="btn btn--primary btn--block" type="submit" [disabled]="saving()">
          <span class="spinner" *ngIf="saving()"></span>{{ isEdit() ? 'Save changes' : 'Publish petition' }}
        </button>
        <p class="muted small" style="margin-top:10px">Publishing as <strong>{{ auth.user()?.fullName }}</strong>.</p>
      </aside>
    </form>
  `,
  styles: [
    `
      .layout { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 20px; align-items: start; }
      .section-title { font-size: 1rem; margin-bottom: 14px; }
      .summary { position: sticky; top: 84px; }
      .checks { list-style: none; padding: 0; margin: 0 0 16px; display: flex; flex-direction: column; gap: 8px; font-size: 0.85rem; color: var(--c-ink-muted); }
      .checks li::before { content: '○'; margin-right: 8px; }
      .checks li.ok { color: var(--c-success); }
      .checks li.ok::before { content: '✓'; }
      .x { background: none; border: 0; cursor: pointer; font-size: 1rem; line-height: 1; color: inherit; padding: 0 2px; }
      .media { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }
      .media__item { display: flex; flex-direction: column; gap: 8px; }
      .media__item img { width: 100%; aspect-ratio: 4/3; object-fit: cover; border-radius: var(--r-md); border: 1px solid var(--c-border); background: var(--c-neutral-soft); }
      @media (max-width: 960px) {
        .layout { grid-template-columns: 1fr; }
        .summary { position: static; }
      }
    `,
  ],
})
export class PetitionFormPage implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(PetitionService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(NotificationService);

  readonly categories = PETITION_CATEGORIES;
  id = '';
  readonly isEdit = computed(() => !!this.id);
  readonly state = signal<LoadState>('idle');
  readonly error = signal('');
  readonly saving = signal(false);
  readonly submitError = signal('');
  readonly tags = signal<string[]>([]);
  readonly mediaUrls = signal<string[]>([]);
  readonly mediaError = signal('');

  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(120)]],
    description: ['', [Validators.required, Validators.minLength(50), Validators.maxLength(3000)]],
    category: ['', Validators.required],
    targetSignatures: [100, [Validators.required, Validators.min(10), Validators.max(1_000_000)]],
    tagInput: '',
    mediaInput: '',
    city: ['', Validators.required],
    state: ['', Validators.required],
    pincode: '',
    address: '',
  });

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id') ?? '';
    if (this.isEdit()) {
      this.loadExisting();
    } else {
      const u = this.auth.user();
      this.form.patchValue({
        city: u?.city ?? '',
        state: u?.state ?? '',
        pincode: u?.pincode ?? '',
        address: u?.address ?? '',
      });
      this.state.set('loaded');
    }
  }

  loadExisting(): void {
    this.state.set('loading');
    this.api.getById(this.id).subscribe({
      next: (p: Petition) => {
        if (!this.api.canModify(p, this.auth.user()?.id)) {
          this.state.set('unavailable');
          return;
        }
        this.form.patchValue({
          title: p.title,
          description: p.description,
          category: p.category,
          targetSignatures: p.targetSignatures,
          city: p.city ?? '',
          state: p.state ?? '',
          pincode: p.pincode ?? '',
          address: p.address ?? '',
        });
        this.tags.set(p.tags ?? []);
        this.mediaUrls.set(p.mediaUrls ?? []);
        this.state.set('loaded');
      },
      error: (err) => {
        this.error.set(apiErrorMessage(err));
        this.state.set('error');
      },
    });
  }

  invalid(name: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.dirty || c.touched);
  }

  addTag(event?: Event): void {
    event?.preventDefault();
    const raw = this.form.controls.tagInput.value.trim().toLowerCase().replace(/^#/, '');
    if (!raw || raw.length > 24 || this.tags().length >= 6 || this.tags().includes(raw)) return;
    this.tags.update((t) => [...t, raw]);
    this.form.controls.tagInput.setValue('');
  }

  removeTag(tag: string): void {
    this.tags.update((t) => t.filter((x) => x !== tag));
  }

  addMedia(event?: Event): void {
    event?.preventDefault();
    const url = this.form.controls.mediaInput.value.trim();
    this.mediaError.set('');
    if (!url) return;
    if (!URL_RE.test(url)) {
      this.mediaError.set('Enter a valid http(s) URL.');
      return;
    }
    if (this.mediaUrls().length >= 5) {
      this.mediaError.set('You can attach up to 5 images.');
      return;
    }
    if (!this.mediaUrls().includes(url)) this.mediaUrls.update((m) => [...m, url]);
    this.form.controls.mediaInput.setValue('');
  }

  removeMedia(url: string): void {
    this.mediaUrls.update((m) => m.filter((x) => x !== url));
  }

  submit(): void {
    this.submitError.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.submitError.set('Please fix the highlighted fields.');
      return;
    }
    const v = this.form.getRawValue();
    const payload: PetitionPayload = {
      title: v.title.trim(),
      description: v.description.trim(),
      category: v.category,
      tags: this.tags(),
      targetSignatures: Number(v.targetSignatures),
      mediaUrls: this.mediaUrls(),
      city: v.city.trim(),
      state: v.state.trim(),
      pincode: v.pincode.trim() || null,
      address: v.address.trim() || null,
    };
    this.saving.set(true);
    const req = this.isEdit() ? this.api.update(this.id, payload) : this.api.create(payload);
    req.subscribe({
      next: (p) => {
        this.saving.set(false);
        this.toast.success(this.isEdit() ? 'Petition updated.' : 'Your petition is live!');
        void this.router.navigate(['/petitions', p?.id ?? this.id]);
      },
      error: (err) => {
        this.saving.set(false);
        this.submitError.set(apiErrorMessage(err, 'Could not save the petition.'));
      },
    });
  }
}
