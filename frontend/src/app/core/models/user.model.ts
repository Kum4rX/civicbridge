export type UserRole = 'CITIZEN' | 'OFFICIAL';

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
  verified?: boolean | null;
  createdAt?: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest extends LocationInfo {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface UpdateProfileRequest {
  fullName?: string;
  email?: string;
  address?: string | null;
  city?: string;
  state?: string;
  pincode?: string | null;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
  confirmPassword: string;
}

/** Backend auth response. Adjust field names in AuthService.normalise() if yours differ. */
export interface AuthResponse {
  token: string;
  user: User;
}
