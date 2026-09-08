import { NgClass } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/services/auth.service';

interface NavItem {
  label: string;
  path: string;
  icon: string;
  roles?: Array<'CITIZEN' | 'OFFICIAL'>;
  primary?: boolean;
}

@Component({
  selector: 'cx-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgClass],
  template: `
    <div class="shell">
      <header class="topbar">
        <button class="icon-btn only-mobile" type="button" (click)="toggle()" aria-label="Menu">
          ☰
        </button>
        <a class="brand" routerLink="/dashboard">
          <span class="brand__mark">C</span>
          <span class="brand__name">Civix</span>
        </a>
        <div class="topbar__spacer"></div>
        <a class="btn btn--primary btn--sm hide-sm" routerLink="/petitions/new">Start a petition</a>
        <a class="who" routerLink="/profile">
          <span class="avatar">{{ initials() }}</span>
          <span class="who__meta hide-sm">
            <strong>{{ user()?.fullName }}</strong>
            <small>{{ user()?.role === 'OFFICIAL' ? 'Official' : 'Citizen' }}</small>
          </span>
        </a>
      </header>

      <div class="shell__body">
        <aside class="sidebar" [ngClass]="{ 'is-open': open() }">
          <nav>
            @for (item of visibleNav(); track item.path) {
              <a
                class="navlink"
                [routerLink]="item.path"
                routerLinkActive="is-active"
                [routerLinkActiveOptions]="{ exact: item.path === '/petitions' }"
                (click)="close()"
              >
                <span class="navlink__icon">{{ item.icon }}</span>{{ item.label }}
              </a>
            }
          </nav>
          <button class="navlink navlink--danger" type="button" (click)="signOut()">
            <span class="navlink__icon">⎋</span>Sign out
          </button>
        </aside>
        @if (open()) {
          <div class="scrim only-mobile" (click)="close()"></div>
        }

        <main class="content">
          <router-outlet />
        </main>
      </div>

      <nav class="mobilenav only-mobile">
        @for (item of mobileNav(); track item.path) {
          <a [routerLink]="item.path" routerLinkActive="is-active">
            <span>{{ item.icon }}</span><small>{{ item.label }}</small>
          </a>
        }
      </nav>
    </div>
  `,
  styles: [
    `
      .shell {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        background: var(--c-bg);
      }
      .topbar {
        position: sticky;
        top: 0;
        z-index: 40;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 20px;
        background: var(--c-surface);
        border-bottom: 1px solid var(--c-border);
      }
      .topbar__spacer {
        flex: 1;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 10px;
        font-family: var(--font-display);
        font-weight: 700;
        color: var(--c-ink);
        text-decoration: none;
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
      .icon-btn {
        border: 1px solid var(--c-border);
        background: var(--c-surface);
        border-radius: 10px;
        width: 38px;
        height: 38px;
        cursor: pointer;
      }
      .who {
        display: flex;
        align-items: center;
        gap: 10px;
        text-decoration: none;
        color: inherit;
      }
      .who__meta {
        display: flex;
        flex-direction: column;
        line-height: 1.15;
      }
      .who__meta small {
        color: var(--c-ink-muted);
        font-size: 0.74rem;
      }
      .avatar {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        font-weight: 700;
        font-size: 0.82rem;
        background: var(--c-primary-soft);
        color: var(--c-primary-dark);
      }
      .shell__body {
        flex: 1;
        display: flex;
        align-items: flex-start;
      }
      .sidebar {
        position: sticky;
        top: 59px;
        width: 244px;
        flex: none;
        height: calc(100vh - 59px);
        padding: 18px 14px;
        background: var(--c-surface);
        border-right: 1px solid var(--c-border);
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .sidebar nav {
        display: flex;
        flex-direction: column;
        gap: 4px;
        flex: 1;
      }
      .navlink {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 12px;
        border-radius: 10px;
        color: var(--c-ink-soft);
        font-weight: 500;
        font-size: 0.9rem;
        text-decoration: none;
        border: none;
        background: transparent;
        cursor: pointer;
        text-align: left;
      }
      .navlink:hover {
        background: var(--c-neutral-soft);
      }
      .navlink.is-active {
        background: var(--c-primary-soft);
        color: var(--c-primary-dark);
        font-weight: 650;
      }
      .navlink--danger {
        color: var(--c-danger);
      }
      .navlink__icon {
        width: 20px;
        text-align: center;
      }
      .content {
        flex: 1;
        min-width: 0;
        padding: 24px 20px 96px;
        max-width: 1240px;
        margin: 0 auto;
        width: 100%;
      }
      .only-mobile {
        display: none;
      }
      .mobilenav {
        display: none;
      }
      @media (max-width: 900px) {
        .only-mobile {
          display: block;
        }
        .hide-sm {
          display: none;
        }
        .sidebar {
          position: fixed;
          z-index: 60;
          left: 0;
          top: 0;
          height: 100vh;
          transform: translateX(-102%);
          transition: transform 0.22s ease;
          box-shadow: var(--e-3);
        }
        .sidebar.is-open {
          transform: none;
        }
        .scrim {
          position: fixed;
          inset: 0;
          background: rgba(16, 24, 40, 0.45);
          z-index: 50;
        }
        .mobilenav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 45;
          display: grid;
          grid-auto-flow: column;
          background: var(--c-surface);
          border-top: 1px solid var(--c-border);
        }
        .mobilenav a {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          padding: 8px 0;
          text-decoration: none;
          color: var(--c-ink-muted);
          font-size: 1.05rem;
        }
        .mobilenav a small {
          font-size: 0.68rem;
        }
        .mobilenav a.is-active {
          color: var(--c-primary);
        }
        .content {
          padding: 18px 14px 92px;
        }
      }
    `,
  ],
})
export class ShellComponent {
  private readonly auth = inject(AuthService);
  readonly user = this.auth.user;
  readonly open = signal(false);

  private readonly nav: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: '◧', primary: true },
    { label: 'Petitions', path: '/petitions', icon: '✎', primary: true },
    { label: 'Polls', path: '/polls', icon: '◍', primary: true },
    { label: 'My petitions', path: '/petitions/mine', icon: '❑' },
    { label: 'Signed', path: '/petitions/signed', icon: '✓' },
    { label: 'Governance', path: '/governance', icon: '⚖', roles: ['OFFICIAL'] },
    { label: 'Reports', path: '/reports', icon: '◔', primary: true },
    { label: 'Profile', path: '/profile', icon: '☺' },
  ];

  readonly visibleNav = computed(() => {
    const role = this.auth.role();
    return this.nav.filter((i) => !i.roles || (role && i.roles.includes(role)));
  });

  readonly mobileNav = computed(() => this.visibleNav().filter((i) => i.primary).slice(0, 4));

  readonly initials = computed(() =>
    (this.user()?.fullName ?? '?')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join(''),
  );

  toggle(): void {
    this.open.update((v) => !v);
  }
  close(): void {
    this.open.set(false);
  }
  signOut(): void {
    this.close();
    this.auth.logout();
  }
}
