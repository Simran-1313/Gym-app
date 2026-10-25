export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  primaryColor: string | null;
  isActive: boolean;
}

export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'FROZEN';

export interface Installment {
  id: string;
  label: string;
  dueDate: string | null;
  amount: number;
  paidAmount: number;
  balance: number;
  status: 'PAID' | 'PARTIAL' | 'DUE' | 'OVERDUE' | 'UPCOMING' | string;
  isOverdue: boolean;
}

/** A membership as GET /member/subscription returns it. */
export interface MemberSubscription {
  id: string;
  planId: string | null;
  planName: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  durationMonths: number | null;
  status: SubscriptionStatus;
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  agreedAmount: number;
  amountPaid: number;
  balanceDue: number;
  isFullyPaid: boolean;
  freezeStartDate: string | null;
  freezeEndDate: string | null;
  installments: Installment[];
}

export type FreezeRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface FreezeRequest {
  id: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string | null;
  status: FreezeRequestStatus;
  responseNote: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface GymContact {
  name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
}

export interface Membership {
  subscription: MemberSubscription | null;
  /** The last one, when nothing is current — so the app can say when it ended. */
  lastSubscription: MemberSubscription | null;
  freezeRequest: FreezeRequest | null;
  canRequestFreeze: boolean;
  gym: GymContact;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  description: string | null;
  subtotal: number;
  gstRate: number;
  gstAmount: number;
  total: number;
  status: 'PAID' | 'PENDING' | 'CANCELLED' | string;
  paymentMethod: string | null;
  issuedAt: string;
  /** Signed, public PDF link — opens in the browser without a session. */
  url: string;
}

export interface MembershipPlanSummary {
  id: string;
  name: string;
  price: number;
  durationDays: number;
}

/** What the gym's Clasendra plan includes. Screens for a feature it lacks stay hidden. */
export type PlanFeatureKey =
  | 'leads'
  | 'pos'
  | 'classes'
  | 'followUps'
  | 'staffAttendance'
  | 'chat'
  | 'pushNotifications'
  | 'emailAutomation'
  | 'analytics'
  | 'biometric'
  | 'aiFeatures'
  | 'whatsapp'
  | 'apiAccess';

export type PlanFeatures = Partial<Record<PlanFeatureKey, boolean>>;

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  /** `data.type` says what it's about: CLASS_WAITLIST_PROMOTED, FREEZE_APPROVED, ADMIN_BROADCAST… */
  data: { type?: string; [key: string]: unknown } | null;
  readAt: string | null;
  createdAt: string;
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

/**
 * A weekly class slot, as the app uses it. The API sends the slot as
 * dayOfWeek + "HH:MM" plus the next session's startsAt/endsAt;
 * member.service maps those to startTime/endTime (ISO instants) here.
 */
export interface ClassSchedule {
  id: string;
  classId: string;
  dayOfWeek: number;
  /** Next session start, ISO. */
  startTime: string;
  /** Next session end, ISO. */
  endTime: string;
  capacity: number;
  bookedCount: number;
  availableSlots: number;
  isBooked: boolean;
  /** On the waitlist for this full class; promoted automatically when a place opens. */
  isWaitlisted: boolean;
  waitlistPosition: number | null;
  waitlistCount: number;
  myBookingId: string | null;
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

export type BookingStatus = 'BOOKED' | 'WAITLISTED' | 'ATTENDED' | 'NO_SHOW' | 'CANCELLED';

export interface ClassBooking {
  id: string;
  scheduleId: string;
  status: BookingStatus;
  /** When the member booked (or joined the waitlist). */
  bookedAt: string;
  schedule: {
    id: string;
    /** The slot's next session, ISO — what "upcoming" bookings are shown at. */
    startTime: string;
    endTime: string;
    class: {
      id: string;
      name: string;
      durationMinutes: number;
      trainer?: { id: string; name: string } | null;
    };
  };
}

export interface CheckIn {
  id: string;
  checkedInAt: string;
  checkedOutAt: string | null;
  method: 'MANUAL' | 'QR' | 'BIOMETRIC';
}

// ─── POS / Products ───────────────────────────────────────────────────────────

export type ProductSortBy =
  | 'name_asc'
  | 'name_desc'
  | 'price_asc'
  | 'price_desc'
  | 'stock_asc'
  | 'stock_desc'
  | 'newest'
  | 'oldest'
  | 'category';

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  category: string | null;
  imageUrl: string | null;
  inStock: boolean;
  createdAt: string;
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

// ─── Activity & Analytics ───────────────────────────────────────────────────

export type WorkoutType =
  | 'STRENGTH'
  | 'HIIT'
  | 'CARDIO'
  | 'RUNNING'
  | 'CYCLING'
  | 'YOGA'
  | 'PILATES'
  | 'BOXING';

export type WorkoutSource =
  | 'APP_TIMER'
  | 'SMARTWATCH_APP'
  | 'MANUAL_ENTRY'
  | 'APPLE_HEALTH'
  | 'GOOGLE_HEALTH_CONNECT';

export interface LogWorkoutPayload {
  workoutType: WorkoutType;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  caloriesBurned: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  source?: WorkoutSource;
  notes?: string;
}

export interface WorkoutSession extends LogWorkoutPayload {
  id: string;
  createdAt: string;
}

export interface ActivityGoals {
  weeklyCaloriesGoal: number;
  weeklyActiveMinutesGoal: number;
  dailyWaterGoal: number;
  daysPerWeek: number;
}

/**
 * GET /member/activity/summary. Activity is logged workouts plus gym visits,
 * counted in India time; `week` is Monday to Sunday.
 */
export interface ActivitySummary {
  summaryDate: string;
  goals: ActivityGoals;
  metrics: {
    calories: { burned: number; goal: number; unit: string; progress: number };
    exerciseDuration: { minutes: number; goal: number; unit: string; progress: number };
    hydration: { consumedMl: number; goalMl: number; unit: string; progress: number };
  };
  week: {
    start: string;
    end: string;
    visits: number;
    visitDays: string[];
    workouts: number;
    activeMinutes: number;
    caloriesBurned: number;
    progress: { visits: number; activeMinutes: number; calories: number };
  };
  weeklyCheckIns: {
    count: number;
    goal: number;
    daysWithCheckIn: string[];
  };
  aiInsight: string;
}

export interface AnalyticsDataPoint {
  label: string;
  value: number;
  displayValue: string;
  timestamp?: string;
}

export interface AnalyticsResult {
  metric: 'CALORIES' | 'DURATION' | 'WATER';
  period: 'HOURLY' | 'DAILY' | 'MONTHLY';
  unit: string;
  maxValue: number;
  points: AnalyticsDataPoint[];
}

export interface LogWaterPayload {
  amountMl: number;
  timestamp?: string;
}

export interface WaterLogEntry {
  id: string;
  amountMl: number;
  timestamp: string;
}

export interface WaterSummary {
  date: string;
  totalMl: number;
  goalMl: number;
  logs: WaterLogEntry[];
}

export type DeviceSyncProvider =
  | 'APPLE_HEALTH'
  | 'GOOGLE_HEALTH_CONNECT'
  | 'FITBIT'
  | 'GARMIN'
  | 'SAMSUNG_HEALTH';

export interface SyncDevicePayload {
  provider: DeviceSyncProvider;
  deviceId?: string;
  deviceName?: string;
  syncedAt: string;
  metrics: {
    stepCount?: number;
    activeCalories?: number;
    restingCalories?: number;
    distanceMeters?: number;
    avgHeartRate?: number;
    restingHeartRate?: number;
  };
}

export interface SyncDeviceStatus {
  isConnected: boolean;
  provider: DeviceSyncProvider | null;
  deviceName: string | null;
  lastSyncedAt: string | null;
}

