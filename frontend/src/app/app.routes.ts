import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./features/landing/landing.page').then((m) => m.LandingPage),
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register.page').then((m) => m.RegisterPage),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell.component').then((m) => m.ShellComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.page').then((m) => m.DashboardPage),
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile.page').then((m) => m.ProfilePage),
      },
      {
        path: 'petitions',
        loadComponent: () =>
          import('./features/petitions/petition-list.page').then((m) => m.PetitionListPage),
      },
      {
        path: 'petitions/new',
        loadComponent: () =>
          import('./features/petitions/petition-form.page').then((m) => m.PetitionFormPage),
      },
      {
        path: 'petitions/mine',
        loadComponent: () =>
          import('./features/petitions/my-petitions.page').then((m) => m.MyPetitionsPage),
      },
      {
        path: 'petitions/signed',
        loadComponent: () =>
          import('./features/petitions/signed-petitions.page').then((m) => m.SignedPetitionsPage),
      },
      {
        path: 'petitions/:id',
        loadComponent: () =>
          import('./features/petitions/petition-detail.page').then((m) => m.PetitionDetailPage),
      },
      {
        path: 'petitions/:id/edit',
        loadComponent: () =>
          import('./features/petitions/petition-form.page').then((m) => m.PetitionFormPage),
      },
      {
        path: 'polls',
        loadComponent: () => import('./features/polls/poll-list.page').then((m) => m.PollListPage),
      },
      {
        path: 'polls/new',
        canActivate: [roleGuard],
        data: { roles: ['OFFICIAL'] },
        loadComponent: () => import('./features/polls/poll-form.page').then((m) => m.PollFormPage),
      },
      {
        path: 'polls/:id',
        loadComponent: () =>
          import('./features/polls/poll-detail.page').then((m) => m.PollDetailPage),
      },
      {
        path: 'governance',
        canActivate: [roleGuard],
        data: { roles: ['OFFICIAL'] },
        loadComponent: () =>
          import('./features/official/governance.page').then((m) => m.GovernancePage),
      },
      {
        path: 'reports',
        loadComponent: () => import('./features/reports/reports.page').then((m) => m.ReportsPage),
      },
    ],
  },
  {
    path: 'unauthorized',
    loadComponent: () =>
      import('./features/system/unauthorized.page').then((m) => m.UnauthorizedPage),
  },
  {
    path: '**',
    loadComponent: () => import('./features/system/not-found.page').then((m) => m.NotFoundPage),
  },
];
