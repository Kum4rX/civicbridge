import { NgFor, NgIf } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { PETITION_CATEGORIES } from '../../core/models/petition.model';
import { PollPayload } from '../../core/models/poll.model';
import { AuthService } from '../../core/services/auth.service';
import { apiErrorMessage } from '../../core/services/http-util';
import { NotificationService } from '../../core/services/notification.service';
import { PollService } from '../../core/services/poll.service';
import { PageHeaderComponent } from '../../shared/components/page-header.component';

const MAX_OPTIONS = 6;

function uniqueOptions(control: AbstractControl): ValidationErrors | null {
  const values = (control as FormArray).controls
    .map((c) => String(c.get('text')?.value ?? '').trim().toLowerCase())
    .filter(Boolean);
  return new Set(values).size !== values.length ? { duplicate: true } : null;
}

function futureDate(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  return new Date(control.value).getTime() <= Date.now() ? { past: true } : null;
}

@Component({
  selector: 'cx-poll-form',
  standalone: true,
  imports: [NgIf, NgFor, ReactiveFormsModule, RouterLink, PageHeaderComponent],
  template: `
    <a routerLink="/polls" class="back">&larr; Back to polls</a>
    <cx-page-header
      eyebrow="Official"
      title="Create a poll"
      subtitle="Ask residents a clear question with 2–6 options. Each citizen may vote once."
    ></cx-page-header>

    <form class="layout" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <section class="stack">
        <div class="card">
          <h2>Question</h2>
          <div class="field" style="margin-top:16px">
            <label for="question">Poll question *</label>
            <input
              id="question"
              class="input"
              formControlName="question"
              maxlength="160"
              placeholder="e.g. Should the Sunday market move to Riverside Park?"
              [class.is-invalid]="invalid('question')"
            />
            <div class="spread">
              <span class="error-text" *ngIf="invalid('question')">
                {{ form.get('question')?.hasError('required') ? 'A question is required.' : 'Use at least 10 characters.' }}
              </span>
              <span class="counter">{{ form.get('question')?.value?.length || 0 }}/160</span>
            </div>
          </div>
          <div class="field">
            <label for="description">Context <span class="muted">(optional)</span></label>
            <textarea
              id="description"
              class="textarea"
              rows="3"
              formControlName="description"
              maxlength="800"
              placeholder="Give residents the background they need to vote confidently."
              [class.is-invalid]="invalid('description')"
            ></textarea>
            <div class="spread">
              <span class="error-text" *ngIf="invalid('description')">Description is too long.</span>
              <span class="counter">{{ form.get('description')?.value?.length || 0 }}/800</span>
            </div>
          </div>
          <div class="form-grid">
            <div class="field">
              <label for="category">Category</label>
              <select id="category" class="select" formControlName="category">
                <option value="">Choose category</option>
                <option *ngFor="let c of categories" [value]="c">{{ c }}</option>
              </select>
            </div>
            <div class="field">
              <label for="closingDate">Closing date <span class="muted">(optional)</span></label>
              <input
                id="closingDate"
                class="input"
                type="datetime-local"
                formControlName="closingDate"
                [class.is-invalid]="invalid('closingDate')"
              />
              <span class="error-text" *ngIf="invalid('closingDate')">
                Closing date must be in the future.
              </span>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="spread">
            <div>
              <h2>Options *</h2>
              <p class="small muted">Provide between 2 and {{ maxOptions }} distinct choices.</p>
            </div>
            <button
              type="button"
              class="btn btn--ghost btn--sm"
              (click)="addOption()"
              [disabled]="options.length >= maxOptions"
            >
              + Add option
            </button>
          </div>
          <div class="options" formArrayName="options" style="margin-top:16px">
            <div
              class="option"
              *ngFor="let opt of options.controls; let i = index"
              [formGroupName]="i"
            >
              <span class="option__index">{{ i + 1 }}</span>
              <input
                class="input"
                formControlName="text"
                maxlength="80"
                [placeholder]="'Option ' + (i + 1)"
                [class.is-invalid]="opt.get('text')?.invalid && (opt.get('text')?.touched || submitted())"
              />
              <button
                type="button"
                class="btn btn--ghost btn--icon"
                aria-label="Remove option"
                (click)="removeOption(i)"
                [disabled]="options.length <= 2"
              >
                &times;
              </button>
            </div>
          </div>
          <span class="error-text" *ngIf="options.hasError('duplicate') && (options.touched || submitted())">
            Options must be unique.
          </span>
          <span
            class="error-text"
            *ngIf="submitted() && optionsIncomplete()"
          >
            Every option needs text (2–80 characters).
          </span>
        </div>

        <div class="card">
          <h2>Locality</h2>
          <p class="small muted">Prefilled from your profile. City and state are required for local civic routing.</p>
          <div class="form-grid" style="margin-top:16px">
            <div class="field">
              <label for="city">City *</label>
              <input id="city" class="input" formControlName="city" [class.is-invalid]="invalid('city')" />
              <span class="error-text" *ngIf="invalid('city')">City is required.</span>
            </div>
            <div class="field">
              <label for="state">State *</label>
              <input id="state" class="input" formControlName="state" [class.is-invalid]="invalid('state')" />
              <span class="error-text" *ngIf="invalid('state')">State is required.</span>
            </div>
          </div>
        </div>
      </section>

      <aside class="stack">
        <div class="card">
          <h3>Preview</h3>
          <p class="preview__q">{{ form.get('question')?.value || 'Your question will appear here' }}</p>
          <ul class="preview__opts">
            <li *ngFor="let opt of options.controls; let i = index">
              <span class="radio"></span>{{ opt.get('text')?.value || 'Option ' + (i + 1) }}
            </li>
          </ul>
        </div>
        <div class="card">
          <h3>Before publishing</h3>
          <ul class="checklist">
            <li [class.ok]="form.get('question')?.valid">Clear, neutral question</li>
            <li [class.ok]="options.valid && !optionsIncomplete()">2–{{ maxOptions }} unique options</li>
            <li [class.ok]="form.get('city')?.valid && form.get('state')?.valid">City and state specified</li>
            <li [class.ok]="!form.get('closingDate')?.value || form.get('closingDate')?.valid">Sensible closing date</li>
          </ul>
          <div class="server-error" *ngIf="serverError()" role="alert">{{ serverError() }}</div>
          <button class="btn btn--primary btn--block" type="submit" [disabled]="saving()" style="margin-top:16px">
            <span class="spinner" *ngIf="saving()"></span>Publish poll
          </button>
          <a class="btn btn--ghost btn--block" routerLink="/polls" style="margin-top:8px">Cancel</a>
        </div>
      </aside>
    </form>
  `,
  styles: [
    `
      .back {
        display: inline-block;
        margin-bottom: 16px;
        font-size: 0.85rem;
      }
      .layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 320px;
        gap: 24px;
        align-items: start;
      }
      aside {
        position: sticky;
        top: 88px;
      }
      .options {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .option {
        display: grid;
        grid-template-columns: 28px 1fr 42px;
        gap: 10px;
        align-items: center;
      }
      .option__index {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        background: var(--c-primary-soft);
        color: var(--c-primary-dark);
        font-weight: 700;
        font-size: 0.8rem;
      }
      .preview__q {
        font-weight: 700;
        font-family: var(--font-display);
        margin: 12px 0;
        line-height: 1.35;
      }
      .preview__opts {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
        font-size: 0.88rem;
      }
      .preview__opts li {
        display: flex;
        gap: 10px;
        align-items: center;
        padding: 10px 12px;
        border: 1px solid var(--c-border);
        border-radius: var(--r-md);
      }
      .radio {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        border: 2px solid var(--c-border-strong);
        flex: none;
      }
      .checklist {
        list-style: none;
        margin: 12px 0 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
        font-size: 0.86rem;
        color: var(--c-ink-muted);
      }
      .checklist li::before {
        content: '✕ ';
      }
      .checklist li.ok {
        color: var(--c-success);
      }
      .checklist li.ok::before {
        content: '✓ ';
      }
      .server-error {
        margin-top: 14px;
        padding: 10px 12px;
        border-radius: var(--r-md);
        background: var(--c-danger-soft);
        color: var(--c-danger);
        font-size: 0.84rem;
      }
      @media (max-width: 900px) {
        .layout {
          grid-template-columns: 1fr;
        }
        aside {
          position: static;
        }
      }
    `,
  ],
})
export class PollFormPage {
  private readonly fb = inject(FormBuilder);
  private readonly polls = inject(PollService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(NotificationService);

  readonly categories = PETITION_CATEGORIES;
  readonly maxOptions = MAX_OPTIONS;
  readonly saving = signal(false);
  readonly submitted = signal(false);
  readonly serverError = signal('');

  readonly form = this.fb.nonNullable.group({
    question: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(160)]],
    description: ['', [Validators.maxLength(800)]],
    category: [''],
    closingDate: ['', [futureDate]],
    city: [this.auth.user()?.city ?? '', [Validators.required]],
    state: [this.auth.user()?.state ?? '', [Validators.required]],
    options: this.fb.array([this.optionGroup(), this.optionGroup()], [uniqueOptions]),
  });

  get options(): FormArray {
    return this.form.get('options') as FormArray;
  }

  private optionGroup() {
    return this.fb.nonNullable.group({
      text: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    });
  }

  addOption(): void {
    if (this.options.length < MAX_OPTIONS) this.options.push(this.optionGroup());
  }

  removeOption(index: number): void {
    if (this.options.length > 2) this.options.removeAt(index);
  }

  invalid(name: string): boolean {
    const c = this.form.get(name);
    return !!c && c.invalid && (c.touched || this.submitted());
  }

  optionsIncomplete(): boolean {
    return this.options.controls.some((c) => c.get('text')?.invalid);
  }

  submit(): void {
    this.submitted.set(true);
    this.serverError.set('');
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.toast.error('Please fix the highlighted fields.');
      return;
    }
    const v = this.form.getRawValue();
    const city = v.city.trim() || this.auth.user()?.city || '';
    const state = v.state.trim() || this.auth.user()?.state || '';

    const payload: PollPayload = {
      question: v.question.trim(),
      title: v.question.trim(),
      description: v.description.trim() || undefined,
      category: v.category || undefined,
      closingDate: v.closingDate ? new Date(v.closingDate).toISOString() : null,
      endDate: v.closingDate ? new Date(v.closingDate).toISOString() : null,
      city,
      state,
      targetLocation: {
        city,
        state,
        address: this.auth.user()?.address || '',
        pincode: this.auth.user()?.pincode || '',
      },
      options: v.options.map((o) => ({ text: o.text.trim() })),
    };
    this.saving.set(true);
    this.polls.create(payload).subscribe({
      next: (poll) => {
        this.saving.set(false);
        this.toast.success('Poll published successfully.');
        void this.router.navigate(poll?.id ? ['/polls', poll.id] : ['/polls']);
      },
      error: (err) => {
        this.saving.set(false);
        this.serverError.set(apiErrorMessage(err, 'Could not publish the poll.'));
      },
    });
  }
}