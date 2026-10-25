import api, { clearCookie } from './api';
import { ApiResponse, PlanFeatures, User } from '../types';

export interface LoginPayload {
  email: string;
  password: string;
  deviceToken?: string;
  platform?: 'ios' | 'android' | 'web';
}

export interface LoginResponse {
  user: User;
  isFirstLogin: boolean;
}

export const login = async (payload: LoginPayload): Promise<LoginResponse> => {
  const url = '/member/auth/login';
  console.log('====================================');
  console.log('[login] API request');
  console.log('  → method  : POST');
  console.log('  → url     :', url);
  console.log('  → payload :', JSON.stringify(payload, null, 2));
  console.log('====================================');

  const res = await api.post<ApiResponse<LoginResponse>>(url, payload);

  console.log('====================================');
  console.log('[login] API response');
  console.log('  → status  :', res.status);
  console.log('  → success :', res.data.success);
  console.log('  → message :', res.data.message ?? '(none)');
  console.log('  → data    :', JSON.stringify(res.data.data, null, 2));
  console.log('====================================');

  if (!res.data.success || !res.data.data) throw new Error(res.data.message ?? 'Login failed');
  return res.data.data;
};

export const logout = async (): Promise<void> => {
  try {
    await api.post('/member/auth/logout');
  } finally {
    await clearCookie();
  }
};

export interface MeResult {
  user: User;
  /** What the gym's Clasendra plan includes; null from an older API. */
  features: PlanFeatures | null;
}

export const getMe = async (): Promise<MeResult> => {
  const res = await api.get<ApiResponse<{ user: User; features?: PlanFeatures }>>('/member/auth/me');
  if (!res.data.success || !res.data.data) throw new Error('Failed to fetch profile');
  return { user: res.data.data.user, features: res.data.data.features ?? null };
};

/**
 * Emails a reset link if the address belongs to a member. The answer is the same
 * either way, so it can't be used to find out who is a member.
 */
export const forgotPassword = async (email: string): Promise<string> => {
  const res = await api.post<ApiResponse<null>>('/member/auth/forgot-password', { email });
  return res.data.message ?? "If an account exists with that email, we've sent a password reset link.";
};

export const changePassword = async (payload: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<void> => {
  const res = await api.post<ApiResponse<null>>('/member/auth/change-password', payload);
  if (!res.data.success) throw new Error(res.data.message ?? 'Failed to change password');
};

export const updateProfile = async (payload: {
  name?: string;
  phone?: string;
  avatarUrl?: string | null;
}): Promise<User> => {
  const res = await api.patch<ApiResponse<{ user: User }>>('/member/auth/me/profile', payload);
  if (!res.data.success || !res.data.data) throw new Error('Failed to update profile');
  return res.data.data.user;
};
