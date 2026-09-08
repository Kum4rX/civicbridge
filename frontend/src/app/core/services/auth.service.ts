import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { API } from '../api/api-endpoints';
import { AuthResponse, LoginRequest, RegisterRequest, User, UserRole } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly _user = signal<User | null>(this.readStoredUser());
  private readonly _token = signal<string | null>(this.readStoredToken());

  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => !!this._token() && !!this._user());
  readonly role = computed<UserRole | null>(() => this._user()?.role ?? null);
  readonly isCitizen = computed(() => this.role() === 'CITIZEN');
  readonly isOfficial = computed(() => this.role() === 'OFFICIAL');

  get token(): string | null {
    return this._token();
  }

  login(payload: LoginRequest, remember = true): Observable<AuthResponse> {
    return this.http
      .post<unknown>(API.auth.login, payload)
      .pipe(
        map((raw) => this.normalise(raw)),
        tap((auth) => this.persist(auth, remember)),
      );
  }

  register(payload: RegisterRequest): Observable<AuthResponse> {
    const role = (payload.role || 'CITIZEN').toUpperCase() as UserRole;
    const body = {
      name: payload.fullName,
      fullName: payload.fullName,
      email: payload.email,
      password: payload.password,
      role,
      location: {
        address: payload.address ?? '',
        city: payload.city ?? '',
        state: payload.state ?? '',
        pincode: payload.pincode ?? '',
        latitude: payload.latitude ?? null,
        longitude: payload.longitude ?? null,
      },
    };
    return this.http
      .post<unknown>(API.auth.register, body)
      .pipe(
        map((raw) => this.normalise(raw)),
        tap((auth) => this.persist(auth, true)),
      );
  }

  /** Refreshes the cached user from the backend (source of truth). */
  loadCurrentUser(): Observable<User> {
    return this.http.get<unknown>(API.auth.me).pipe(
      map((raw) => {
        const body = (raw ?? {}) as Record<string, any>;
        const rawUser = body['data']?.user ?? body['user'] ?? body['data'] ?? body;
        return this.normaliseUser(rawUser);
      }),
      tap((user) => {
        this._user.set(user);
        this.storage()?.setItem(environment.userStorageKey, JSON.stringify(user));
      }),
    );
  }

  setUser(user: User): void {
    const normalised = this.normaliseUser(user);
    this._user.set(normalised);
    this.storage()?.setItem(environment.userStorageKey, JSON.stringify(normalised));
  }

  logout(redirect = true): void {
    this._user.set(null);
    this._token.set(null);
    [localStorage, sessionStorage].forEach((store) => {
      store.removeItem(environment.tokenStorageKey);
      store.removeItem(environment.userStorageKey);
    });
    if (redirect) void this.router.navigate(['/login']);
  }

  /** Normalises user object so location and identity fields are flat and consistent. */
  normaliseUser(raw: unknown): User {
    if (!raw || typeof raw !== 'object') return raw as User;
    const u = raw as Record<string, any>;
    const loc = (u['location'] && typeof u['location'] === 'object' ? u['location'] : {}) as Record<string, any>;
    return {
      ...u,
      id: u['id'] ?? u['_id'] ?? '',
      fullName: u['fullName'] ?? u['name'] ?? '',
      email: u['email'] ?? '',
      role: (u['role'] ?? 'CITIZEN').toUpperCase() as UserRole,
      verified: u['verified'] ?? false,
      createdAt: u['createdAt'] ?? null,
      address: u['address'] ?? loc['address'] ?? null,
      city: u['city'] ?? loc['city'] ?? null,
      state: u['state'] ?? loc['state'] ?? null,
      pincode: u['pincode'] ?? loc['pincode'] ?? null,
      latitude: u['latitude'] ?? loc['latitude'] ?? null,
      longitude: u['longitude'] ?? loc['longitude'] ?? null,
    } as User;
  }

  /** Maps the backend auth payload onto `{ token, user }`. Adjust here if field names differ. */
  private normalise(raw: unknown): AuthResponse {
    const body = (raw ?? {}) as Record<string, any>;
    const token = body['token'] ?? body['accessToken'] ?? body['jwt'] ?? body['data']?.token ?? '';
    const rawUser = body['user'] ?? body['data']?.user ?? body['profile'] ?? body['data'];
    const user = this.normaliseUser(rawUser);
    return { token, user };
  }

  private persist(auth: AuthResponse, remember: boolean): void {
    const store = remember ? localStorage : sessionStorage;
    if (auth.token) store.setItem(environment.tokenStorageKey, auth.token);
    if (auth.user) store.setItem(environment.userStorageKey, JSON.stringify(auth.user));
    this._token.set(auth.token || null);
    this._user.set(auth.user ?? null);
  }

  private storage(): Storage | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(environment.tokenStorageKey) ? localStorage : sessionStorage;
  }

  private readStoredToken(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return (
      localStorage.getItem(environment.tokenStorageKey) ??
      sessionStorage.getItem(environment.tokenStorageKey)
    );
  }

  private readStoredUser(): User | null {
    if (typeof localStorage === 'undefined') return null;
    const raw =
      localStorage.getItem(environment.userStorageKey) ??
      sessionStorage.getItem(environment.userStorageKey);
    try {
      return raw ? this.normaliseUser(JSON.parse(raw)) : null;
    } catch {
      return null;
    }
  }
}
