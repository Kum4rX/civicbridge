import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

/**
 * Attaches the existing backend's JWT (Authorization: Bearer <token>) to API requests
 * and handles unauthorized / forbidden responses centrally.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const notify = inject(NotificationService);

  const isApiCall = req.url.startsWith(environment.apiBaseUrl);
  const token = auth.token;

  const request =
    isApiCall && token
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(request).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && isApiCall) {
        const isAuthEndpoint = req.url.includes('/auth/login') || req.url.includes('/auth/register');
        if (error.status === 401 && !isAuthEndpoint) {
          notify.error('Your session has expired. Please sign in again.');
          auth.logout(false);
          void router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
        }
        if (error.status === 403) {
          void router.navigate(['/unauthorized']);
        }
      }
      return throwError(() => error);
    }),
  );
};
