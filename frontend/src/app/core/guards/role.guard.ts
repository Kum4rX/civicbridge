import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserRole } from '../models/user.model';
import { AuthService } from '../services/auth.service';

/**
 * Frontend role protection is UX only — the backend remains the authority.
 * Usage: `canActivate: [authGuard, roleGuard], data: { roles: ['OFFICIAL'] }`
 */
export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const allowed = (route.data?.['roles'] ?? []) as UserRole[];
  if (!allowed.length) return true;
  const role = auth.role();
  return role && allowed.includes(role) ? true : router.createUrlTree(['/unauthorized']);
};
