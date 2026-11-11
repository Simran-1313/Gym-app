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
import { getActivitySummary, getWaterSummary, logWater, updateGoals } from '../services/activity.service';
import { ActivityGoals, ActivitySummary, CheckIn, WaterLogEntry } from '../types';
import { computeStreaks, finiteNum, normalizeWater } from '../utils/activity';
import { useAuth } from './AuthContext';

/**
 * The single store for everything the member tracks — check-ins, the daily
 * summary and today's water. Home, Activity and Challenges all read from
 * here, so a glass logged on one screen is already on the others, and the
 * streak shown on Home is the same number Challenges awards badges on.
 *
 * Weekly minutes, calories and visits come from the API's summary, which
 * counts gym visits and logged workouts in India time. Nothing here estimates
 * them: if the summary can't load, `stats.ready` is false and screens show a
 * dash rather than a zero that looks like the member's own.
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
  /** The member's targets, from the summary (API defaults until they set their own). */
  goals: ActivityGoals;
  /** Saves new targets and reloads the summary against them. */
  saveGoals: (next: Partial<ActivityGoals>) => Promise<void>;
  stats: {
    /** False until the summary has loaded; screens show "—" rather than 0. */
    ready: boolean;
    weeklyVisits: number;
    weeklyMinutes: number;
    weeklyCalories: number;
    exerciseGoal: number;
    calorieGoal: number;
    visitGoal: number;
    moveProgress: number;
    exerciseProgress: number;
    visitProgress: number;
    waterProgress: number;
    streak: { current: number; best: number };
  };
}

const ActivityContext = createContext<ActivityContextValue | null>(null);

const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** The API's own defaults, used only until the first summary arrives. */
const DEFAULT_GOALS: ActivityGoals = {
  weeklyCaloriesGoal: 2400,
  weeklyActiveMinutesGoal: 300,
  dailyWaterGoal: 3000,
  daysPerWeek: 3,
};
const DEFAULT_WATER_GOAL = DEFAULT_GOALS.dailyWaterGoal;
const emptyWater: WaterState = { totalMl: 0, goalMl: DEFAULT_WATER_GOAL, logs: [] };

/* Today's water is mirrored on-device, so a glass logged offline (or while a
   write is still in flight) survives a refetch instead of snapping back. */
const waterKey = (userId: string) => `activity.water.${userId}.${localDate()}`;

const readLocalWater = async (userId: string): Promise<WaterState | null> => {
  try {
    const raw = await SecureStore.getItemAsync(waterKey(userId));
    // An older build could persist NaN (stored as null) — normalise on read.
    return raw ? normalizeWater(JSON.parse(raw), DEFAULT_WATER_GOAL) : null;
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
  // Bumped on every tap. A fetch that started before a tap carries a total
  // from before it, so its answer must not land on top of the tap.
  const tapVersion = useRef(0);

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
        const startVersion = tapVersion.current;
        const [checkInRes, summaryRes, waterRes, localWater] = await Promise.all([
          getCheckIns(1, CHECKIN_HISTORY).catch(() => null),
          getActivitySummary().catch(() => null),
          getWaterSummary(localDate()).catch(() => null),
          readLocalWater(userId),
        ]);

        if (checkInRes) setCheckIns(checkInRes.checkIns ?? []);
        if (summaryRes) setSummary(summaryRes);

        // Never let a refetch overwrite taps that haven't reached the server.
        if (pendingWrites.current === 0 && tapVersion.current === startVersion) {
          const server = waterRes ? normalizeWater(waterRes, DEFAULT_WATER_GOAL) : null;
          const summaryWater = summaryRes ? normalizeWater(summaryRes.metrics?.hydration, DEFAULT_WATER_GOAL) : null;
          const goalMl = server?.goalMl ?? summaryWater?.goalMl ?? localWater?.goalMl ?? DEFAULT_WATER_GOAL;
          if (server) {
            setWater(server);
          } else if (localWater) {
            setWater({ ...localWater, goalMl });
          } else if (!dirtyToday.current) {
            setWater({ totalMl: summaryWater?.totalMl ?? 0, goalMl, logs: [] });
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
      const nextTotal = Math.max(0, finiteNum(prev.totalMl) + deltaMl);
      const applied = nextTotal - prev.totalMl;
      if (applied === 0) return;

      dirtyToday.current = true;
      tapVersion.current += 1;
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
          // The count on screen is what the member tapped; a write's answer
          // never moves it. Once the queue has drained and the server agrees
          // on the total, adopt its log ids and goal. If it disagrees (a
          // dropped or misapplied write), keep the member's number rather
          // than jumping the opposite way to the tap.
          const server = res ? normalizeWater(res, waterRef.current.goalMl, { requireTotal: true }) : null;
          const local = waterRef.current;
          if (pendingWrites.current === 0 && server && server.totalMl === local.totalMl) {
            setWater({ ...local, goalMl: server.goalMl, logs: server.logs.length ? server.logs : local.logs });
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

  const goals = summary?.goals ?? DEFAULT_GOALS;

  const saveGoals = useCallback(
    async (next: Partial<ActivityGoals>) => {
      await updateGoals(next);
      await refresh(true);
    },
    [refresh],
  );

  const stats = useMemo(() => {
    const week = summary?.week;
    const weeklyMinutes = finiteNum(week?.activeMinutes);
    const weeklyCalories = finiteNum(week?.caloriesBurned);
    // A "visit" goal counts days at the gym, not check-ins: two on one day is one day.
    const visitDays = week?.visitDays?.length ?? 0;
    return {
      ready: Boolean(week),
      weeklyVisits: finiteNum(week?.visits),
      weeklyMinutes,
      weeklyCalories,
      exerciseGoal: goals.weeklyActiveMinutesGoal,
      calorieGoal: goals.weeklyCaloriesGoal,
      visitGoal: goals.daysPerWeek,
      moveProgress: Math.min(1, weeklyCalories / Math.max(1, goals.weeklyCaloriesGoal)),
      exerciseProgress: Math.min(1, weeklyMinutes / Math.max(1, goals.weeklyActiveMinutesGoal)),
      visitProgress: Math.min(1, visitDays / Math.max(1, goals.daysPerWeek)),
      waterProgress: Math.min(1, finiteNum(water.totalMl) / Math.max(1, finiteNum(water.goalMl, DEFAULT_WATER_GOAL))),
      streak: computeStreaks(checkIns),
    };
  }, [checkIns, summary, goals, water.totalMl, water.goalMl]);

  const value = useMemo<ActivityContextValue>(
    () => ({ loaded, checkIns, summary, water, refresh, addWater, goals, saveGoals, stats }),
    [loaded, checkIns, summary, water, refresh, addWater, goals, saveGoals, stats],
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
