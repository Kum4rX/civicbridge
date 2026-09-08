import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { LocationInfo, User } from '../models/user.model';
import { AuthService } from './auth.service';

export type ProfileUpdate = Partial<Pick<User, 'fullName' | 'email'>> & LocationInfo;

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly auth = inject(AuthService);

  profile(): Observable<User> {
    return this.auth.loadCurrentUser();
  }

  updateProfile(payload: ProfileUpdate): Observable<User> {
    return throwError(
      () =>
        new HttpErrorResponse({
          status: 501,
          statusText: 'Not Implemented',
          error: { message: 'Profile editing will be available in a later milestone' },
        }),
    );
  }
}
