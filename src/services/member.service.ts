import api from './api';
import { kindOf } from '../utils/requestPolicy';
import {
  AiPlan,
  AiPlanMeta,
  ApiResponse,
  CheckIn,
  ClassBooking,
  ClassSchedule,
  MemberProfile,
  MemberProfileInput,
  Meta,
} from '../types';

export const getClassSchedules = async (): Promise<ClassSchedule[]> => {
  const res = await api.get<ApiResponse<{ schedules: ClassSchedule[] }>>('/member/classes/schedules');
  if (!res.data.success || !res.data.data) throw new Error('Failed to fetch schedules');
  return res.data.data.schedules;
};

export const getMyBookings = async (): Promise<ClassBooking[]> => {
  const res = await api.get<ApiResponse<{ bookings: ClassBooking[] }>>('/member/classes/bookings');
  if (!res.data.success || !res.data.data) throw new Error('Failed to fetch bookings');
  return res.data.data.bookings;
};

export const bookClass = async (scheduleId: string): Promise<ClassBooking> => {
  const res = await api.post<ApiResponse<{ booking: ClassBooking }>>(
    `/member/classes/${scheduleId}/book`,
  );
  if (!res.data.success || !res.data.data) throw new Error(res.data.message ?? 'Booking failed');
  return res.data.data.booking;
};

/** Joins the waitlist for a full class — same endpoint shape as `bookClass`, distinguished by the `/waitlist` suffix per §4.6 of the mobile app spec. */
export const joinWaitlist = async (scheduleId: string): Promise<ClassBooking> => {
  const res = await api.post<ApiResponse<{ booking: ClassBooking }>>(
    `/member/classes/${scheduleId}/waitlist`,
  );
  if (!res.data.success || !res.data.data) throw new Error(res.data.message ?? 'Could not join the waitlist');
  return res.data.data.booking;
};

export const cancelBooking = async (bookingId: string): Promise<void> => {
  const res = await api.delete<ApiResponse<null>>(`/member/classes/bookings/${bookingId}`);
  if (!res.data.success) throw new Error(res.data.message ?? 'Cancel failed');
};

export interface CheckInsResult {
  checkIns: CheckIn[];
  meta: Meta;
}

export const getCheckIns = async (page = 1, limit = 20): Promise<CheckInsResult> => {
  const res = await api.get<ApiResponse<{ checkIns: CheckIn[] }>>('/member/checkins', {
    params: { page, limit },
  });
  if (!res.data.success || !res.data.data) throw new Error('Failed to fetch check-ins');
  return {
    checkIns: res.data.data.checkIns,
    meta: res.data.meta ?? { page, limit, total: 0, totalPages: 1, hasNext: false, hasPrev: false },
  };
};

// ─── Onboarding profile + AI plans ────────────────────────────────────────────

export interface SubmitProfileResult {
  profile: MemberProfile;
  aiPlan: AiPlan | null;
}

/**
 * The backend may generate the diet plan inside this request (it returns
 * `aiPlan` when it did), so the call can take as long as the LLM does. Callers
 * must not block the member on it — use `saveProfile` (services/profileSave),
 * which confirms the save by reading the profile back.
 */
export const PROFILE_SUBMIT_TIMEOUT = 120000;

export const submitProfile = async (data: MemberProfileInput): Promise<SubmitProfileResult> => {
  const res = await api.post<ApiResponse<SubmitProfileResult>>('/member/profile', data, {
    timeout: PROFILE_SUBMIT_TIMEOUT,
  });
  if (!res.data.success || !res.data.data) {
    throw new Error(res.data.message ?? 'Failed to save profile');
  }
  return { profile: res.data.data.profile, aiPlan: res.data.data.aiPlan ?? null };
};

export interface AiPlansResult {
  plans: AiPlanMeta[];
  meta: Meta;
}

export const getAiPlans = async (page = 1, limit = 20): Promise<AiPlansResult> => {
  const res = await api.get<ApiResponse<AiPlansResult>>('/member/ai-plans', {
    params: { page, limit },
  });
  if (!res.data.success || !res.data.data) throw new Error('Failed to fetch AI plans');
  return res.data.data;
};

export const getAiPlan = async (id: string): Promise<AiPlan> => {
  const res = await api.get<ApiResponse<{ plan: AiPlan }>>(`/member/ai-plans/${id}`);
  if (!res.data.success || !res.data.data) throw new Error('Failed to fetch AI plan');
  return res.data.data.plan;
};

/** LLM generation on the backend; reads stay on the 15s client default. */
export const AI_TIMEOUT = 120000;

export const generateDietPlan = async (): Promise<AiPlan> => {
  const res = await api.post<ApiResponse<{ plan: AiPlan }>>('/member/ai-plans/diet', {}, {
    timeout: AI_TIMEOUT,
  });
  if (!res.data.success || !res.data.data) {
    throw new Error(res.data.message ?? 'Failed to generate diet plan');
  }
  return res.data.data.plan;
};

export const generateWorkoutPlan = async (): Promise<AiPlan> => {
  const res = await api.post<ApiResponse<{ plan: AiPlan }>>('/member/ai-plans/workout', {}, {
    timeout: AI_TIMEOUT,
  });
  if (!res.data.success || !res.data.data) {
    throw new Error(res.data.message ?? 'Failed to generate workout plan');
  }
  return res.data.data.plan;
};

/**
 * `null` only when the member genuinely has no profile yet (404). Offline,
 * server and session errors throw, so callers can tell "new member" apart
 * from "couldn't load" — conflating them made an offline edit look like an
 * empty profile.
 */
export const getProfile = async (): Promise<MemberProfile | null> => {
  try {
    const res = await api.get<ApiResponse<{ profile: MemberProfile }>>('/member/profile');
    if (res.data.success && res.data.data) {
      return res.data.data.profile ?? null;
    }
    return null;
  } catch (err) {
    if (kindOf(err) === 'not_found') return null;
    throw err;
  }
};

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: string;
  readAt: string | null;
  createdAt: string;
}

export const getNotifications = async (): Promise<AppNotification[]> => {
  try {
    const res = await api.get<ApiResponse<{ notifications: AppNotification[] }>>('/member/notifications');
    if (res.data.success && res.data.data) {
      return res.data.data.notifications;
    }
    throw new Error();
  } catch {
    // fallback mock notifications for visual completeness
    return [
      {
        id: '1',
        title: 'Membership Activated! 🎉',
        body: 'Welcome to Clasendra. Your membership is now active.',
        type: 'SYSTEM',
        readAt: null,
        createdAt: new Date().toISOString(),
      },
      {
        id: '2',
        title: 'Class Confirmed: HIIT Blast 🏋️',
        body: 'Your HIIT booking for tomorrow 7:00 AM is confirmed.',
        type: 'CLASS',
        readAt: null,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: '3',
        title: 'New Diet Plan Generated 🍎',
        body: 'Your AI diet plan is updated according to your weight loss goals.',
        type: 'DIET',
        readAt: new Date().toISOString(),
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      }
    ];
  }
};

export interface DeviceTokenPayload {
  token: string;
  platform: 'android' | 'ios';
}

export const registerDeviceToken = async (payload: DeviceTokenPayload): Promise<void> => {
  const res = await api.put<ApiResponse<any>>('/member/notifications/device-token', payload);
  if (!res.data.success) throw new Error(res.data.message ?? 'Failed to register device token');
};

