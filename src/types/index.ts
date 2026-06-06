export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  primaryColor: string | null;
  isActive: boolean;
}

export interface ActiveSubscription {
  id: string;
  userId: string;
  planId: string;
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'FROZEN';
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  plan: {
    id: string;
    name: string;
    price: number;
    durationDays: number;
  };
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  isFirstLogin: boolean;
  createdAt: string;
  activeSubscription?: ActiveSubscription | null;
  tenant?: Tenant;
}

export interface ClassSchedule {
  id: string;
  classId: string;
  startTime: string;
  endTime: string;
  capacity: number;
  bookedCount: number;
  isBooked: boolean;
  class: {
    id: string;
    name: string;
    description: string | null;
    durationMinutes: number;
    trainer?: {
      id: string;
      name: string;
    } | null;
  };
}

export interface ClassBooking {
  id: string;
  scheduleId: string;
  status: 'CONFIRMED' | 'ATTENDED' | 'NO_SHOW' | 'CANCELLED';
  createdAt: string;
  schedule: {
    id: string;
    startTime: string;
    endTime: string;
    class: {
      id: string;
      name: string;
      durationMinutes: number;
    };
  };
}

export interface CheckIn {
  id: string;
  checkedInAt: string;
  checkedOutAt: string | null;
  method: 'MANUAL' | 'QR' | 'BIOMETRIC';
}

export interface Meta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: Meta;
}
