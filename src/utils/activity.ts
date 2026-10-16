import { CheckIn, WaterLogEntry } from '../types';

/**
 * Pure derivations over check-in history. Every screen that shows minutes,
 * calories, visits or streaks goes through these, so Home, Activity and
 * Challenges can never disagree about the same member's numbers.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** A session with no checkout is credited a nominal 45 minutes rather than
 *  zero, so an in-progress visit still moves the ring. */
export const OPEN_SESSION_MINUTES = 45;

export const calcTotalMinutes = (checkIns: CheckIn[]): number =>
  checkIns.reduce((total, ci) => {
    if (!ci.checkedOutAt) return total + OPEN_SESSION_MINUTES;
    const diff = new Date(ci.checkedOutAt).getTime() - new Date(ci.checkedInAt).getTime();
    return total + Math.max(0, Math.round(diff / 60000));
  }, 0);

export const estimateCalories = (totalMinutes: number): number => Math.round(totalMinutes * 8);

export const startOfDay = (d: Date | number | string) => {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

export const dayKey = (d: Date | string) => startOfDay(d).toDateString();

/** Check-ins from the trailing seven days (rolling, not calendar week). */
export const lastSevenDays = (checkIns: CheckIn[]) =>
  checkIns.filter((ci) => Date.now() - new Date(ci.checkedInAt).getTime() < 7 * DAY_MS);

export const checkInsOn = (checkIns: CheckIn[], day: Date) => {
  const from = startOfDay(day).getTime();
  const to = from + DAY_MS;
  return checkIns.filter((ci) => {
    const t = new Date(ci.checkedInAt).getTime();
    return t >= from && t < to;
  });
};

export const visitCountByDay = (checkIns: CheckIn[]): Record<string, number> => {
  const map: Record<string, number> = {};
  for (const c of checkIns) {
    const k = dayKey(c.checkedInAt);
    map[k] = (map[k] ?? 0) + 1;
  }
  return map;
};

/** Current run of consecutive days ending today (or yesterday — a missed
 *  *today* shouldn't break the streak until the day is actually over), and
 *  the longest run in the loaded history. */
export const computeStreaks = (checkIns: CheckIn[]) => {
  const days = new Set(checkIns.map((c) => startOfDay(c.checkedInAt).getTime()));
  let current = 0;
  const cursor = startOfDay(new Date());
  if (!days.has(cursor.getTime())) cursor.setDate(cursor.getDate() - 1);
  while (days.has(cursor.getTime())) {
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  const sorted = [...days].sort((a, b) => a - b);
  let best = sorted.length ? 1 : 0;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    run = Math.round((sorted[i] - sorted[i - 1]) / DAY_MS) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return { current, best: Math.max(best, current) };
};

export const STREAK_MILESTONES = [
  { days: 7, name: 'Bronze' },
  { days: 14, name: 'Silver' },
  { days: 30, name: 'Gold' },
  { days: 60, name: 'Platinum' },
] as const;

export type StreakMilestone = (typeof STREAK_MILESTONES)[number];

export const nextMilestone = (streak: number): StreakMilestone | null =>
  STREAK_MILESTONES.find((m) => m.days > streak) ?? null;

/* ── Hydration pacing ─────────────────────────────────────────── */

/** The window a day's water is spread over. Before it, nothing is "due";
 *  after it, the whole goal is. */
export const HYDRATION_DAY = { startHour: 7, endHour: 22 };

/** How much of the goal should be in by `now`, assuming an even pace. */
export const expectedIntakeMl = (goalMl: number, now = new Date()) => {
  const start = new Date(now);
  start.setHours(HYDRATION_DAY.startHour, 0, 0, 0);
  const end = new Date(now);
  end.setHours(HYDRATION_DAY.endHour, 0, 0, 0);
  const t = (now.getTime() - start.getTime()) / (end.getTime() - start.getTime());
  return Math.round(goalMl * Math.min(1, Math.max(0, t)));
};

/** Fraction of the hydration day elapsed — where the pace marker sits. */
export const hydrationDayProgress = (now = new Date()) => {
  const h = now.getHours() + now.getMinutes() / 60;
  const { startHour, endHour } = HYDRATION_DAY;
  return Math.min(1, Math.max(0, (h - startHour) / (endHour - startHour)));
};

/* ── Water normalisation ──────────────────────────────────────── */

/** A finite number from whatever the API or storage handed back — numeric
 *  strings included — or `fallback`. Keeps `undefined + 250` from ever
 *  reaching the screen as NaN. */
export const finiteNum = (v: unknown, fallback = 0): number => {
  const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : fallback;
};

const TOTAL_KEYS = ['totalMl', 'consumedMl', 'totalIntakeMl', 'intakeMl', 'total'];

const firstNum = (src: Record<string, unknown>, keys: string[]) => {
  for (const k of keys) {
    const n = finiteNum(src[k], NaN);
    if (Number.isFinite(n)) return n;
  }
  return NaN;
};

/**
 * Coerce a water payload — server response, on-device mirror, or the
 * summary's hydration block — into clean numbers. Accepts the field names the
 * API has used (`totalMl` / `consumedMl` / `totalIntakeMl`, `goalMl` /
 * `dailyGoalMl`, logs as `logs` or `entries`) and drops log rows it can't read.
 * Returns null when nothing usable is there. With `requireTotal`, a payload
 * without an explicit total is rejected rather than summed from its logs —
 * a write's response may carry only the entry it just created.
 */
export const normalizeWater = (
  raw: unknown,
  defaultGoalMl: number,
  { requireTotal = false } = {},
): { totalMl: number; goalMl: number; logs: WaterLogEntry[] } | null => {
  if (!raw || typeof raw !== 'object') return null;
  let src = raw as Record<string, unknown>;
  // Some responses nest the payload one level down.
  for (const k of Number.isFinite(firstNum(src, TOTAL_KEYS)) ? [] : ['water', 'summary', 'hydration']) {
    const inner = src[k];
    if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
      src = inner as Record<string, unknown>;
      break;
    }
  }

  const rawLogs = Array.isArray(src.logs) ? src.logs : Array.isArray(src.entries) ? src.entries : [];
  const logs: WaterLogEntry[] = [];
  for (const l of rawLogs as Record<string, unknown>[]) {
    if (!l || typeof l !== 'object') continue;
    const amountMl = firstNum(l, ['amountMl', 'amount', 'ml']);
    if (!Number.isFinite(amountMl) || amountMl === 0) continue;
    const ts = l.timestamp ?? l.loggedAt ?? l.createdAt;
    const timestamp = typeof ts === 'string' && !Number.isNaN(Date.parse(ts)) ? ts : new Date().toISOString();
    logs.push({ id: String(l.id ?? l._id ?? `log_${timestamp}_${logs.length}`), amountMl, timestamp });
  }

  let totalMl = firstNum(src, TOTAL_KEYS);
  if (!Number.isFinite(totalMl)) {
    if (requireTotal || !logs.length) return null;
    totalMl = logs.reduce((sum, l) => sum + l.amountMl, 0);
  }
  const goalMl = firstNum(src, ['goalMl', 'dailyGoalMl', 'targetMl', 'goal']);

  return {
    totalMl: Math.max(0, Math.round(totalMl)),
    goalMl: Number.isFinite(goalMl) && goalMl > 0 ? Math.round(goalMl) : defaultGoalMl,
    logs,
  };
};
