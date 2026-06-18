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
  isOnboarded: boolean;
  createdAt: string;
  activeSubscription?: ActiveSubscription | null;
  tenant?: Tenant;
}

// ─── Onboarding / AI plans ────────────────────────────────────────────────────

export type FitnessGoal = 'WEIGHT_LOSS' | 'MUSCLE_GAIN' | 'FITNESS' | 'ENDURANCE';
export type ActivityLevel = 'SEDENTARY' | 'LIGHT' | 'MODERATE' | 'VERY_ACTIVE';
export type DietPreference = 'VEG' | 'NON_VEG' | 'VEGAN' | 'KETO';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export interface MemberProfileInput {
  age: number;
  weight: number;
  height: number;
  gender?: Gender;
  fitnessGoal: FitnessGoal;
  dietPreference: DietPreference;
  activityLevel: ActivityLevel;
  allergies?: string;
  daysPerWeek?: number;
}

export interface MemberProfile extends MemberProfileInput {
  id: string;
  memberId: string;
  isOnboarded: boolean;
  updatedAt: string;
}

export interface DietPlanMeal {
  name: string;
  items: string[];
  calories: number;
}

export interface DietPlanDay {
  day: string;
  meals: DietPlanMeal[];
}

export interface DietPlanContent {
  summary: string;
  calories: number;
  macros: { proteinG: number; carbsG: number; fatG: number };
  days: DietPlanDay[];
}

export interface AiPlanMeta {
  id: string;
  type: 'WORKOUT' | 'DIET';
  model: string;
  createdAt: string;
}

export interface WorkoutExercise {
  name: string;
  sets: number;
  reps: string;
  rest: string;
}

export interface WorkoutDay {
  day: string;
  focus: string;
  exercises: WorkoutExercise[];
}

export interface WorkoutPlanContent {
  weeklyPlan: WorkoutDay[];
}

export interface AiPlan extends AiPlanMeta {
  content: DietPlanContent | WorkoutPlanContent;
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
