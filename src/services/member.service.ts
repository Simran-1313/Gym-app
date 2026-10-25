import api from './api';
import {
  AiPlan,
  AiPlanMeta,
  ApiResponse,
  AppNotification,
  BookingStatus,
  CheckIn,
  ClassBooking,
  ClassSchedule,
  MemberProfile,
  MemberProfileInput,
  Meta,
} from '../types';

// ─── Classes ──────────────────────────────────────────────────────────────────
// The API describes a weekly slot (dayOfWeek + "18:30") and sends the next
// session as startsAt/endsAt. Screens work in instants, so the mapping to the
// app's ClassSchedule / ClassBooking lives here and nowhere else.

type RawClass = ClassSchedule['class'] & { capacity?: number };

interface RawSchedule {
  id: string;
  classId: string;
  dayOfWeek: number;
  startsAt: string;
  endsAt: string;
  capacity?: number;
  bookedCount: number;
  availableSlots: number;
  isBooked: boolean;
  isWaitlisted?: boolean;
  waitlistPosition?: number | null;
  waitlistCount?: number;
  myBookingId?: string | null;
  class: RawClass;
}

interface RawBooking {
  id: string;
  classScheduleId: string;
  status: BookingStatus;
  bookedAt: string;
  startsAt: string;
  endsAt: string;
  classSchedule: { id: string; class: ClassBooking['schedule']['class'] };
}

const toSchedule = (r: RawSchedule): ClassSchedule => ({
  id: r.id,
  classId: r.classId,
  dayOfWeek: r.dayOfWeek,
  startTime: r.startsAt,
  endTime: r.endsAt,
  capacity: r.capacity ?? r.class.capacity ?? 0,
  bookedCount: r.bookedCount,
  availableSlots: r.availableSlots,
  isBooked: r.isBooked,
  isWaitlisted: Boolean(r.isWaitlisted),
  waitlistPosition: r.waitlistPosition ?? null,
  waitlistCount: r.waitlistCount ?? 0,
  myBookingId: r.myBookingId ?? null,
  class: {
    id: r.class.id,
    name: r.class.name,
    description: r.class.description ?? null,
    durationMinutes: r.class.durationMinutes,
    trainer: r.class.trainer ?? null,
  },
});

const toBooking = (r: RawBooking): ClassBooking => ({
  id: r.id,
  scheduleId: r.classScheduleId,
  status: r.status,
  bookedAt: r.bookedAt,
  schedule: {
    id: r.classSchedule.id,
    startTime: r.startsAt,
    endTime: r.endsAt,
    class: r.classSchedule.class,
  },
});

export const getClassSchedules = async (): Promise<ClassSchedule[]> => {
  const res = await api.get<ApiResponse<{ schedules: RawSchedule[] }>>('/member/classes/schedules');
  if (!res.data.success || !res.data.data) throw new Error('Failed to fetch schedules');
  return res.data.data.schedules.map(toSchedule);
};

export const getMyBookings = async (): Promise<ClassBooking[]> => {
  const res = await api.get<ApiResponse<{ bookings: RawBooking[] }>>('/member/classes/bookings');
  if (!res.data.success || !res.data.data) throw new Error('Failed to fetch bookings');
  return res.data.data.bookings.map(toBooking);
};

export const bookClass = async (scheduleId: string): Promise<ClassBooking> => {
  const res = await api.post<ApiResponse<{ booking: RawBooking }>>(
    `/member/classes/${scheduleId}/book`,
  );
  if (!res.data.success || !res.data.data) throw new Error(res.data.message ?? 'Booking failed');
  return toBooking(res.data.data.booking);
};

/** Joins the queue for a full class. The member is booked in, and told, when a place opens. */
export const joinWaitlist = async (scheduleId: string): Promise<ClassBooking> => {
  const res = await api.post<ApiResponse<{ booking: RawBooking }>>(
    `/member/classes/${scheduleId}/waitlist`,
  );
  if (!res.data.success || !res.data.data) throw new Error(res.data.message ?? 'Could not join the waitlist');
  return toBooking(res.data.data.booking);
};

/** Cancels a booking, or leaves the waitlist. */
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
    // Diet plan generation calls an LLM (with multi-model fallback on the
    // backend); give it generous headroom beyond the default 15s.
    timeout: 120000,
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

const AI_TIMEOUT = 120000;

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

export const getProfile = async (): Promise<MemberProfile | null> => {
  try {
    const res = await api.get<ApiResponse<{ profile: MemberProfile }>>('/member/profile');
    if (res.data.success && res.data.data) {
      return res.data.data.profile;
    }
    return null;
  } catch {
    return null;
  }
};

// ─── Notifications ────────────────────────────────────────────────────────────

export interface NotificationsResult {
  notifications: AppNotification[];
  unreadCount: number;
  meta: Meta;
}

export const getNotifications = async (page = 1, limit = 20): Promise<NotificationsResult> => {
  const res = await api.get<ApiResponse<NotificationsResult>>('/member/notifications', {
    params: { page, limit },
  });
  if (!res.data.success || !res.data.data) throw new Error('Failed to load notifications');
  return res.data.data;
};

export const markNotificationRead = async (id: string): Promise<void> => {
  await api.patch(`/member/notifications/${id}/read`);
};

export const markAllNotificationsRead = async (): Promise<void> => {
  await api.post('/member/notifications/read-all');
};

export interface DeviceTokenPayload {
  token: string;
  platform: 'android' | 'ios';
}

export const registerDeviceToken = async (payload: DeviceTokenPayload): Promise<void> => {
  console.log('====================================');
  console.log('[registerDeviceToken] Sending payload to backend:');
  console.log('  → token   :', payload.token);
  console.log('  → platform:', payload.platform);
  console.log('====================================');
  const res = await api.put<ApiResponse<any>>('/member/notifications/device-token', payload);
  console.log('[registerDeviceToken] Backend response:', JSON.stringify(res.data));
  if (!res.data.success) throw new Error(res.data.message ?? 'Failed to register device token');
};

