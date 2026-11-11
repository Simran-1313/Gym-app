import api from './api';
import {
  ActivityGoals,
  ActivitySummary,
  AnalyticsResult,
  ApiResponse,
  LogWaterPayload,
  LogWorkoutPayload,
  Meta,
  WaterSummary,
  WorkoutSession,
} from '../types';

// Every call here throws when the API does. Screens show a real empty or error
// state; nothing here invents numbers for the member to mistake for their own.

/** Today's rings, this week's totals and the member's goals. GET /member/activity/summary */
export const getActivitySummary = async (): Promise<ActivitySummary> => {
  const res = await api.get<ApiResponse<ActivitySummary>>('/member/activity/summary');
  if (!res.data.success || !res.data.data) throw new Error(res.data.message || 'Failed to load your activity');
  return res.data.data;
};

/** Chart points for calories, active minutes or water. GET /member/activity/analytics */
export const getActivityAnalytics = async (
  metric: 'CALORIES' | 'DURATION' | 'WATER',
  period: 'HOURLY' | 'DAILY' | 'MONTHLY',
): Promise<AnalyticsResult> => {
  const res = await api.get<ApiResponse<AnalyticsResult>>('/member/activity/analytics', {
    params: { metric, period },
  });
  if (!res.data.success || !res.data.data) throw new Error(res.data.message || 'Failed to load the chart');
  return res.data.data;
};

/** Saves a finished workout. Throws if it didn't save, so the member can retry. */
export const logWorkout = async (payload: LogWorkoutPayload): Promise<WorkoutSession> => {
  const res = await api.post<ApiResponse<{ workout: WorkoutSession }>>('/member/activity/workouts', payload);
  if (!res.data.success || !res.data.data) throw new Error(res.data.message || 'Your workout didn’t save');
  return res.data.data.workout;
};

export interface WorkoutsResult {
  workouts: WorkoutSession[];
  meta: Meta;
}

export const getWorkouts = async (page = 1, limit = 20): Promise<WorkoutsResult> => {
  const res = await api.get<ApiResponse<{ workouts: WorkoutSession[] }>>('/member/activity/workouts', {
    params: { page, limit },
  });
  if (!res.data.success || !res.data.data) throw new Error(res.data.message || 'Failed to load workouts');
  return {
    workouts: res.data.data.workouts,
    meta: res.data.meta ?? { page, limit, total: res.data.data.workouts.length, totalPages: 1, hasNext: false, hasPrev: false },
  };
};

/** Logs water (+250 ml, or negative to take a glass back). Answers with today's total. */
export const logWater = async (payload: LogWaterPayload): Promise<WaterSummary> => {
  const res = await api.post<ApiResponse<WaterSummary>>('/member/activity/water', payload);
  if (!res.data.success || !res.data.data) throw new Error(res.data.message || 'Failed to log water');
  return res.data.data;
};

/** Today's water (or `date`'s, YYYY-MM-DD in IST). */
export const getWaterSummary = async (date?: string): Promise<WaterSummary> => {
  const res = await api.get<ApiResponse<WaterSummary>>('/member/activity/water', { params: { date } });
  if (!res.data.success || !res.data.data) throw new Error('Failed to load water');
  return res.data.data;
};

/** The member's own targets. Any subset can be sent. */
export const updateGoals = async (goals: Partial<ActivityGoals>): Promise<ActivityGoals> => {
  const res = await api.patch<ApiResponse<{ goals: ActivityGoals }>>('/member/activity/goals', goals);
  if (!res.data.success || !res.data.data) throw new Error(res.data.message || 'Could not save your goals');
  return res.data.data.goals;
};
