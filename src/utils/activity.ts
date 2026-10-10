import { CheckIn } from '../types';

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
