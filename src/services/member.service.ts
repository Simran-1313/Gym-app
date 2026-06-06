import api from './api';
import { ApiResponse, ClassSchedule, ClassBooking, CheckIn, Meta } from '../types';

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
