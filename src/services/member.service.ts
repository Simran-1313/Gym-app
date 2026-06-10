import api from './api';
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

export const submitProfile = async (data: MemberProfileInput): Promise<SubmitProfileResult> => {
  const res = await api.post<ApiResponse<SubmitProfileResult>>('/member/profile', data, {
    // Diet plan generation calls an LLM; give it more headroom than the default 15s.
    timeout: 90000,
  });
  if (!res.data.success || !res.data.data) {
    throw new Error(res.data.message ?? 'Failed to save profile');
  }
  return res.data.data;
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

const AI_TIMEOUT = 90000;

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
