import api from './api';
import {
  ActivitySummary,
  AnalyticsDataPoint,
  AnalyticsResult,
  ApiResponse,
  LogWaterPayload,
  LogWorkoutPayload,
  Meta,
  SyncDevicePayload,
  SyncDeviceStatus,
  WaterSummary,
  WorkoutSession,
} from '../types';

/**
 * Fetch member activity summary & fitness ring stats.
 * API Endpoint: GET /member/activity/summary
 */
export const getActivitySummary = async (): Promise<ActivitySummary> => {
  try {
    const res = await api.get<ApiResponse<ActivitySummary>>('/member/activity/summary');
    if (res.data.success && res.data.data) {
      return res.data.data;
    }
    throw new Error(res.data.message || 'Failed to fetch activity summary');
  } catch (error) {
    console.log('[activity.service] Summary endpoint fallback (Backend pending):', error);
    return {
      summaryDate: new Date().toISOString().split('T')[0],
      metrics: {
        calories: { burned: 450, goal: 2400, unit: 'kcal', progress: 0.18 },
        exerciseDuration: { minutes: 60, goal: 300, unit: 'mins', progress: 0.20 },
        hydration: { consumedMl: 1250, goalMl: 3000, unit: 'L', progress: 0.42 },
      },
      weeklyCheckIns: {
        count: 2,
        goal: 5,
        daysWithCheckIn: ['M', 'W'],
      },
      aiInsight:
        "You're making steady progress this week! Keep pushing your active minutes to hit your fitness goals.",
    };
  }
};

/**
 * Fetch time-series chart analytics for Calories, Duration, or Water.
 * API Endpoint: GET /member/activity/analytics?metric=...&period=...
 */
export const getActivityAnalytics = async (
  metric: 'CALORIES' | 'DURATION' | 'WATER',
  period: 'HOURLY' | 'DAILY' | 'MONTHLY',
): Promise<AnalyticsResult> => {
  try {
    const res = await api.get<ApiResponse<AnalyticsResult>>('/member/activity/analytics', {
      params: { metric, period },
    });
    if (res.data.success && res.data.data) {
      return res.data.data;
    }
    throw new Error(res.data.message || 'Failed to fetch activity analytics');
  } catch (error) {
    console.log(`[activity.service] Analytics endpoint fallback for ${metric}/${period}:`, error);
    return generateFallbackAnalytics(metric, period);
  }
};

/**
 * Log a completed workout session (from live timer or manual input).
 * API Endpoint: POST /member/activity/workouts
 */
export const logWorkout = async (payload: LogWorkoutPayload): Promise<WorkoutSession> => {
  try {
    const res = await api.post<ApiResponse<{ workout: WorkoutSession }>>(
      '/member/activity/workouts',
      payload,
    );
    if (res.data.success && res.data.data) {
      return res.data.data.workout;
    }
    throw new Error(res.data.message || 'Failed to save workout');
  } catch (error) {
    console.log('[activity.service] logWorkout fallback:', error);
    return {
      id: `w_${Date.now()}`,
      ...payload,
      createdAt: new Date().toISOString(),
    };
  }
};

/**
 * Fetch history of logged workout sessions.
 * API Endpoint: GET /member/activity/workouts
 */
export interface WorkoutsResult {
  workouts: WorkoutSession[];
  meta: Meta;
}

export const getWorkouts = async (page = 1, limit = 20): Promise<WorkoutsResult> => {
  try {
    const res = await api.get<ApiResponse<{ workouts: WorkoutSession[] }>>(
      '/member/activity/workouts',
      { params: { page, limit } },
    );
    if (res.data.success && res.data.data) {
      return {
        workouts: res.data.data.workouts,
        meta: res.data.meta ?? {
          page,
          limit,
          total: res.data.data.workouts.length,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };
    }
    throw new Error(res.data.message || 'Failed to fetch workouts');
  } catch (error) {
    console.log('[activity.service] getWorkouts fallback:', error);
    return {
      workouts: [],
      meta: { page, limit, total: 0, totalPages: 1, hasNext: false, hasPrev: false },
    };
  }
};

/**
 * Log water intake (+250ml, +500ml).
 * API Endpoint: POST /member/activity/water
 */
export const logWater = async (payload: LogWaterPayload): Promise<WaterSummary> => {
  try {
    const res = await api.post<ApiResponse<WaterSummary>>('/member/activity/water', payload);
    if (res.data.success && res.data.data) {
      return res.data.data;
    }
    throw new Error(res.data.message || 'Failed to log water');
  } catch (error) {
    console.log('[activity.service] logWater fallback:', error);
    return {
      date: new Date().toISOString().split('T')[0],
      totalMl: payload.amountMl,
      goalMl: 3000,
      logs: [{ id: `wat_${Date.now()}`, amountMl: payload.amountMl, timestamp: new Date().toISOString() }],
    };
  }
};

/**
 * Fetch daily water intake summary.
 * API Endpoint: GET /member/activity/water
 */
export const getWaterSummary = async (date?: string): Promise<WaterSummary> => {
  try {
    const res = await api.get<ApiResponse<WaterSummary>>('/member/activity/water', {
      params: { date },
    });
    if (res.data.success && res.data.data) {
      return res.data.data;
    }
    throw new Error('Failed to fetch water summary');
  } catch (error) {
    console.log('[activity.service] getWaterSummary fallback:', error);
    return {
      date: date || new Date().toISOString().split('T')[0],
      totalMl: 1250,
      goalMl: 3000,
      logs: [],
    };
  }
};

/**
 * Synchronize wearable device / Health app metrics.
 * API Endpoint: POST /member/activity/sync-device
 */
export const syncDevice = async (payload: SyncDevicePayload): Promise<SyncDeviceStatus> => {
  try {
    const res = await api.post<ApiResponse<SyncDeviceStatus>>(
      '/member/activity/sync-device',
      payload,
    );
    if (res.data.success && res.data.data) {
      return res.data.data;
    }
    throw new Error(res.data.message || 'Failed to sync device');
  } catch (error) {
    console.log('[activity.service] syncDevice fallback:', error);
    return {
      isConnected: true,
      provider: payload.provider,
      deviceName: payload.deviceName || 'Smart Device',
      lastSyncedAt: payload.syncedAt,
    };
  }
};

/**
 * Fetch connected device & wearable sync status.
 * API Endpoint: GET /member/activity/sync-device/status
 */
export const getSyncDeviceStatus = async (): Promise<SyncDeviceStatus> => {
  try {
    const res = await api.get<ApiResponse<SyncDeviceStatus>>('/member/activity/sync-device/status');
    if (res.data.success && res.data.data) {
      return res.data.data;
    }
    throw new Error('Failed to fetch device status');
  } catch (error) {
    console.log('[activity.service] getSyncDeviceStatus fallback:', error);
    return {
      isConnected: false,
      provider: null,
      deviceName: null,
      lastSyncedAt: null,
    };
  }
};

// ─── Helper for Dynamic Chart Data Fallback ──────────────────────────────────

function generateFallbackAnalytics(
  metric: 'CALORIES' | 'DURATION' | 'WATER',
  period: 'HOURLY' | 'DAILY' | 'MONTHLY',
): AnalyticsResult {
  const mockData: Record<
    'CALORIES' | 'DURATION' | 'WATER',
    Record<'HOURLY' | 'DAILY' | 'MONTHLY', AnalyticsDataPoint[]>
  > = {
    CALORIES: {
      HOURLY: [
        { label: '06AM', value: 0, displayValue: '0 kcal' },
        { label: '09AM', value: 180, displayValue: '180 kcal' },
        { label: '12PM', value: 50, displayValue: '50 kcal' },
        { label: '03PM', value: 120, displayValue: '120 kcal' },
        { label: '06PM', value: 480, displayValue: '480 kcal' },
        { label: '09PM', value: 0, displayValue: '0 kcal' },
      ],
      DAILY: [
        { label: 'M', value: 320, displayValue: '320 kcal' },
        { label: 'T', value: 640, displayValue: '640 kcal' },
        { label: 'W', value: 450, displayValue: '450 kcal' },
        { label: 'T', value: 800, displayValue: '800 kcal' },
        { label: 'F', value: 540, displayValue: '540 kcal' },
        { label: 'S', value: 480, displayValue: '480 kcal' },
        { label: 'S', value: 300, displayValue: '300 kcal' },
      ],
      MONTHLY: [
        { label: 'Jan', value: 12500, displayValue: '12.5k kcal' },
        { label: 'Feb', value: 14000, displayValue: '14.0k kcal' },
        { label: 'Mar', value: 18200, displayValue: '18.2k kcal' },
        { label: 'Apr', value: 11000, displayValue: '11.0k kcal' },
        { label: 'May', value: 21000, displayValue: '21.0k kcal' },
        { label: 'Jun', value: 9800, displayValue: '9.8k kcal' },
      ],
    },
    DURATION: {
      HOURLY: [
        { label: '06AM', value: 0, displayValue: '0m' },
        { label: '09AM', value: 45, displayValue: '45m' },
        { label: '12PM', value: 0, displayValue: '0m' },
        { label: '03PM', value: 15, displayValue: '15m' },
        { label: '06PM', value: 60, displayValue: '60m' },
        { label: '09PM', value: 0, displayValue: '0m' },
      ],
      DAILY: [
        { label: 'M', value: 30, displayValue: '30m' },
        { label: 'T', value: 45, displayValue: '45m' },
        { label: 'W', value: 60, displayValue: '60m' },
        { label: 'T', value: 0, displayValue: '0m' },
        { label: 'F', value: 45, displayValue: '45m' },
        { label: 'S', value: 90, displayValue: '90m' },
        { label: 'S', value: 15, displayValue: '15m' },
      ],
      MONTHLY: [
        { label: 'Jan', value: 12.5, displayValue: '12.5 hrs' },
        { label: 'Feb', value: 16.0, displayValue: '16.0 hrs' },
        { label: 'Mar', value: 22.4, displayValue: '22.4 hrs' },
        { label: 'Apr', value: 14.2, displayValue: '14.2 hrs' },
        { label: 'May', value: 25.0, displayValue: '25.0 hrs' },
        { label: 'Jun', value: 11.8, displayValue: '11.8 hrs' },
      ],
    },
    WATER: {
      HOURLY: [
        { label: '08AM', value: 250, displayValue: '250ml' },
        { label: '12PM', value: 1000, displayValue: '1.0L' },
        { label: '03PM', value: 500, displayValue: '500ml' },
        { label: '06PM', value: 750, displayValue: '750ml' },
        { label: '10PM', value: 500, displayValue: '500ml' },
      ],
      DAILY: [
        { label: 'M', value: 2000, displayValue: '2.0L' },
        { label: 'T', value: 2500, displayValue: '2.5L' },
        { label: 'W', value: 3000, displayValue: '3.0L' },
        { label: 'T', value: 1500, displayValue: '1.5L' },
        { label: 'F', value: 2250, displayValue: '2.25L' },
        { label: 'S', value: 3000, displayValue: '3.0L' },
        { label: 'S', value: 1800, displayValue: '1.8L' },
      ],
      MONTHLY: [
        { label: 'Jan', value: 62000, displayValue: '62L' },
        { label: 'Feb', value: 74000, displayValue: '74L' },
        { label: 'Mar', value: 89000, displayValue: '89L' },
        { label: 'Apr', value: 58000, displayValue: '58L' },
        { label: 'May', value: 92000, displayValue: '92L' },
        { label: 'Jun', value: 45000, displayValue: '45L' },
      ],
    },
  };

  const points = mockData[metric]?.[period] ?? [];
  const maxValue = Math.max(...points.map((p) => p.value), 1);
  const unit = metric === 'CALORIES' ? 'kcal' : metric === 'DURATION' ? 'mins' : 'ml';

  return {
    metric,
    period,
    unit,
    maxValue,
    points,
  };
}
