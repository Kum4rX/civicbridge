import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { API } from '../api/api-endpoints';
import { LocationInfo, User } from '../models/user.model';
import { AuthService } from './auth.service';

export type ProfileUpdate = Partial<Pick<User, 'fullName' | 'email'>> & LocationInfo;

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  profile(): Observable<User> {
    return this.auth.loadCurrentUser();
  }

  updateProfile(payload: ProfileUpdate): Observable<User> {
    const body = {
      fullName: payload.fullName,
      email: payload.email,
      address: payload.address ?? null,
      city: payload.city ?? null,
      state: payload.state ?? null,
      pincode: payload.pincode ?? null,
      location: {
        address: payload.address ?? '',
        city: payload.city ?? '',
        state: payload.state ?? '',
        pincode: payload.pincode ?? '',
      },
    };

    return this.http.put<unknown>(API.users.updateProfile, body).pipe(
      map((raw) => {
        const res = (raw ?? {}) as Record<string, any>;
        const rawUser = res['data']?.user ?? res['user'] ?? res['data'] ?? res;
        return this.auth.normaliseUser(rawUser);
      }),
      tap((updatedUser) => {
        this.auth.setUser(updatedUser);
      }),
    );
  }
}
