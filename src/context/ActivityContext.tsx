import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as SecureStore from 'expo-secure-store';

import { getCheckIns } from '../services/member.service';
import { getActivitySummary, getWaterSummary, logWater } from '../services/activity.service';
import { ActivitySummary, CheckIn, WaterLogEntry } from '../types';
import {
  calcTotalMinutes,
  computeStreaks,
  estimateCalories,
  lastSevenDays,
} from '../utils/activity';
import { useAuth } from './AuthContext';

/**
 * The single store for everything the member tracks — check-ins, the daily
 * summary and today's water. Home, Activity and Challenges all read from
 * here, so a glass logged on one screen is already on the others, and the
 * streak shown on Home is the same number Challenges awards badges on.
 */

/** Enough history for the 13-week contribution grid and the best-streak stat. */
const CHECKIN_HISTORY = 90;
/** Re-focusing a screen within this window reuses what's loaded. */
const STALE_MS = 20_000;

export interface WaterState {
  totalMl: number;
  goalMl: number;
  logs: WaterLogEntry[];
}

interface ActivityContextValue {
  loaded: boolean;
  checkIns: CheckIn[];
  summary: ActivitySummary | null;
  water: WaterState;
  /** Refetch everything. Without `force`, a recent load is reused. */
  refresh: (force?: boolean) => Promise<void>;
  /** Optimistic: the total moves on the tap, the server catches up behind it. */
  addWater: (deltaMl: number) => void;
  stats: {
    weeklyVisits: number;
    weeklyMinutes: number;
    weeklyCalories: number;
    exerciseGoal: number;
    calorieGoal: number;
    moveProgress: number;
    exerciseProgress: number;
    waterProgress: number;
    streak: { current: number; best: number };
  };
}

const ActivityContext = createContext<ActivityContextValue | null>(null);

const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const DEFAULT_WATER_GOAL = 3000;
const emptyWater: WaterState = { totalMl: 0, goalMl: DEFAULT_WATER_GOAL, logs: [] };

/* Today's water is mirrored on-device. Until the water endpoint is live the
   service answers with a placeholder; without this mirror, every refetch
   would snap the member's count back to it. */
const waterKey = (userId: string) => `activity.water.${userId}.${localDate()}`;

const readLocalWater = async (userId: string): Promise<WaterState | null> => {
  try {
    const raw = await SecureStore.getItemAsync(waterKey(userId));
    return raw ? (JSON.parse(raw) as WaterState) : null;
  } catch {
    return null;
  }
};

const writeLocalWater = (userId: string, water: WaterState) => {
  // Only the recent tail of logs is needed for the sip timeline.
  const trimmed = { ...water, logs: water.logs.slice(-40) };
  SecureStore.setItemAsync(waterKey(userId), JSON.stringify(trimmed)).catch(() => {});
};

export const ActivityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [loaded, setLoaded] = useState(false);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [water, setWaterState] = useState<WaterState>(emptyWater);

  // Refs keep async work reading the latest values instead of a closure's.
  const waterRef = useRef(water);
  const lastLoadAt = useRef(0);
  const inflight = useRef<Promise<void> | null>(null);
  const pendingWrites = useRef(0);
  const writeQueue = useRef<Promise<unknown>>(Promise.resolve());
  const dirtyToday = useRef(false);

  const setWater = useCallback(
    (next: WaterState) => {
      waterRef.current = next;
      setWaterState(next);
      if (userId) writeLocalWater(userId, next);
    },
    [userId],
  );

  const refresh = useCallback(
    async (force = false) => {
      if (!userId) return;
      if (inflight.current) return inflight.current;
      if (!force && Date.now() - lastLoadAt.current < STALE_MS) return;

      const run = (async () => {
        const [checkInRes, summaryRes, waterRes, localWater] = await Promise.all([
          getCheckIns(1, CHECKIN_HISTORY).catch(() => null),
          getActivitySummary().catch(() => null),
          getWaterSummary(localDate()).catch(() => null),
          readLocalWater(userId),
        ]);

        if (checkInRes) setCheckIns(checkInRes.checkIns ?? []);
        if (summaryRes) setSummary(summaryRes);

        // Never let a refetch overwrite taps that haven't reached the server.
        if (pendingWrites.current === 0) {
          if (waterRes && !waterRes.isFallback) {
            setWater({ totalMl: waterRes.totalMl, goalMl: waterRes.goalMl, logs: waterRes.logs ?? [] });
          } else if (localWater) {
            setWater({ ...localWater, goalMl: waterRes?.goalMl ?? localWater.goalMl });
          } else if (!dirtyToday.current) {
            const goalMl = waterRes?.goalMl ?? summaryRes?.metrics?.hydration?.goalMl ?? DEFAULT_WATER_GOAL;
            const totalMl = waterRes?.totalMl ?? summaryRes?.metrics?.hydration?.consumedMl ?? 0;
            setWater({ totalMl, goalMl, logs: waterRes?.logs ?? [] });
          }
        }

        lastLoadAt.current = Date.now();
        setLoaded(true);
      })();

      inflight.current = run;
      try {
        await run;
      } finally {
        inflight.current = null;
      }
    },
    [userId, setWater],
  );

  const addWater = useCallback(
    (deltaMl: number) => {
      const prev = waterRef.current;
      const nextTotal = Math.max(0, prev.totalMl + deltaMl);
      const applied = nextTotal - prev.totalMl;
      if (applied === 0) return;

      dirtyToday.current = true;
      const timestamp = new Date().toISOString();
      const logs =
        applied > 0
          ? [...prev.logs, { id: `local_${Date.now()}`, amountMl: applied, timestamp }]
          : dropMl(prev.logs, -applied);
      setWater({ ...prev, totalMl: nextTotal, logs });

      // Writes go out one at a time and in order, so the server applies
      // +250, +250, −250 exactly as tapped.
      pendingWrites.current += 1;
      writeQueue.current = writeQueue.current
        .then(() => logWater({ amountMl: applied, timestamp }))
        .then((res) => {
          pendingWrites.current -= 1;
          // Reconcile with the server's total only once the queue has drained
          // — mid-burst, its answer is already behind the member's taps.
          if (pendingWrites.current === 0 && res && !res.isFallback) {
            setWater({ totalMl: res.totalMl, goalMl: res.goalMl, logs: res.logs ?? waterRef.current.logs });
          }
        })
        .catch(() => {
          pendingWrites.current -= 1;
        });
    },
    [setWater],
  );

  // Load as soon as there's a member; clear everything on sign-out.
  useEffect(() => {
    if (userId) {
      refresh(true);
    } else {
      lastLoadAt.current = 0;
      dirtyToday.current = false;
      waterRef.current = emptyWater;
      setWaterState(emptyWater);
      setCheckIns([]);
      setSummary(null);
      setLoaded(false);
    }
  }, [userId, refresh]);

  const stats = useMemo(() => {
    const weekly = lastSevenDays(checkIns);
    const weeklyMinutes = calcTotalMinutes(weekly);
    const weeklyCalories = estimateCalories(weeklyMinutes);
    const exerciseGoal = summary?.metrics?.exerciseDuration?.goal ?? 300;
    const calorieGoal = summary?.metrics?.calories?.goal ?? 2400;
    return {
      weeklyVisits: weekly.length,
      weeklyMinutes,
      weeklyCalories,
      exerciseGoal,
      calorieGoal,
      moveProgress: Math.min(1, weeklyCalories / calorieGoal),
      exerciseProgress: Math.min(1, weeklyMinutes / exerciseGoal),
      waterProgress: Math.min(1, water.totalMl / Math.max(1, water.goalMl)),
      streak: computeStreaks(checkIns),
    };
  }, [checkIns, summary, water.totalMl, water.goalMl]);

  const value = useMemo<ActivityContextValue>(
    () => ({ loaded, checkIns, summary, water, refresh, addWater, stats }),
    [loaded, checkIns, summary, water, refresh, addWater, stats],
  );

  return <ActivityContext.Provider value={value}>{children}</ActivityContext.Provider>;
};

/** Take `ml` back off the most recent logs, newest first. */
const dropMl = (logs: WaterLogEntry[], ml: number): WaterLogEntry[] => {
  const next = [...logs];
  let remaining = ml;
  while (remaining > 0 && next.length) {
    const last = next[next.length - 1];
    if (last.amountMl <= remaining) {
      remaining -= last.amountMl;
      next.pop();
    } else {
      next[next.length - 1] = { ...last, amountMl: last.amountMl - remaining };
      remaining = 0;
    }
  }
  return next;
};

export const useActivity = () => {
  const ctx = useContext(ActivityContext);
  if (!ctx) throw new Error('useActivity must be used inside ActivityProvider');
  return ctx;
};
