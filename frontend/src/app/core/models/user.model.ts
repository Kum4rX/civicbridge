export type UserRole = 'CITIZEN' | 'OFFICIAL' | 'ADMIN';

export interface LocationInfo {
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface User extends LocationInfo {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  verified: boolean;
  createdAt?: string | null;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest extends LocationInfo {
  fullName: string;
  email: string;
  password: string;
  role?: UserRole;
}
