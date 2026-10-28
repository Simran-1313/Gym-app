import type {
  ActivityLevel,
  DietPreference,
  FitnessGoal,
  Gender,
  MemberProfile,
  MemberProfileInput,
} from '../types';

/**
 * The onboarding form as the member types it — strings for the numeric fields
 * so a half-typed "7" isn't coerced, nulls for choices not made yet. This is
 * also the shape persisted as the local draft, so it must stay JSON-safe.
 */
export interface OnboardingDraft {
  goal: FitnessGoal | null;
  age: string;
  height: string;
  weight: string;
  gender: Gender | null;
  diet: DietPreference | null;
  activity: ActivityLevel | null;
  allergies: string;
  /** Last step the member was on, so a relaunch resumes there. */
  step: number;
}

/** Most members of a gym train a few days a week; one tap changes it. */
export const DEFAULT_ACTIVITY: ActivityLevel = 'MODERATE';

export const EMPTY_DRAFT: OnboardingDraft = {
  goal: null,
  age: '',
  height: '',
  weight: '',
  gender: null,
  diet: null,
  activity: DEFAULT_ACTIVITY,
  allergies: '',
  step: 0,
};

export const ONBOARDING_STEPS = ['goal', 'body', 'food'] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export type FieldErrors = Partial<Record<'goal' | 'age' | 'height' | 'weight' | 'diet' | 'activity', string>>;

export const LIMITS = {
  age: { min: 13, max: 100 },
  heightCm: { min: 100, max: 250 },
  weightKg: { min: 30, max: 300 },
} as const;

/** Accepts "72,5" from locales whose decimal pad shows a comma. */
export function parseDecimal(raw: string): number {
  const trimmed = raw.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return NaN;
  return Number(trimmed);
}

export function parseWholeNumber(raw: string): number {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return NaN;
  return Number(trimmed);
}

const inRange = (n: number, { min, max }: { min: number; max: number }) =>
  Number.isFinite(n) && n >= min && n <= max;

export function validateStep(step: OnboardingStep, d: OnboardingDraft): FieldErrors {
  const errors: FieldErrors = {};

  if (step === 'goal') {
    if (!d.goal) errors.goal = 'Pick the goal that fits you best.';
  }

  if (step === 'body') {
    if (!d.age.trim()) errors.age = 'Enter your age.';
    else if (!inRange(parseWholeNumber(d.age), LIMITS.age)) {
      errors.age = `Age must be between ${LIMITS.age.min} and ${LIMITS.age.max}.`;
    }
    if (!d.height.trim()) errors.height = 'Enter your height.';
    else if (!inRange(parseDecimal(d.height), LIMITS.heightCm)) {
      errors.height = `Height must be ${LIMITS.heightCm.min}–${LIMITS.heightCm.max} cm.`;
    }
    if (!d.weight.trim()) errors.weight = 'Enter your weight.';
    else if (!inRange(parseDecimal(d.weight), LIMITS.weightKg)) {
      errors.weight = `Weight must be ${LIMITS.weightKg.min}–${LIMITS.weightKg.max} kg.`;
    }
  }

  if (step === 'food') {
    if (!d.diet) errors.diet = 'Choose how you eat.';
    if (!d.activity) errors.activity = 'Choose your activity level.';
  }

  return errors;
}

/** First step with a problem, or -1 when the whole form is valid. */
export function firstInvalidStep(d: OnboardingDraft): number {
  return ONBOARDING_STEPS.findIndex((s) => Object.keys(validateStep(s, d)).length > 0);
}

/** Only call after `firstInvalidStep(d) === -1`. */
export function toProfileInput(d: OnboardingDraft): MemberProfileInput {
  const allergies = d.allergies.trim();
  return {
    age: parseWholeNumber(d.age),
    height: parseDecimal(d.height),
    weight: parseDecimal(d.weight),
    gender: d.gender ?? undefined,
    fitnessGoal: d.goal!,
    dietPreference: d.diet!,
    activityLevel: d.activity!,
    allergies: allergies || undefined,
  };
}

export function draftFromProfile(p: MemberProfile): OnboardingDraft {
  return {
    goal: p.fitnessGoal ?? null,
    age: p.age ? String(p.age) : '',
    height: p.height ? String(p.height) : '',
    weight: p.weight ? String(p.weight) : '',
    gender: p.gender ?? null,
    diet: p.dietPreference ?? null,
    activity: p.activityLevel ?? DEFAULT_ACTIVITY,
    allergies: p.allergies ?? '',
    step: 0,
  };
}

/** Defensive parse of a persisted draft — storage may hold an older shape. */
export function parseDraft(raw: string | null): OnboardingDraft | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<OnboardingDraft>;
    if (!v || typeof v !== 'object') return null;
    const str = (x: unknown) => (typeof x === 'string' ? x : '');
    return {
      goal: (v.goal as FitnessGoal) ?? null,
      age: str(v.age),
      height: str(v.height),
      weight: str(v.weight),
      gender: (v.gender as Gender) ?? null,
      diet: (v.diet as DietPreference) ?? null,
      activity: (v.activity as ActivityLevel) ?? DEFAULT_ACTIVITY,
      allergies: str(v.allergies),
      step: typeof v.step === 'number' && v.step >= 0 && v.step < ONBOARDING_STEPS.length ? v.step : 0,
    };
  } catch {
    return null;
  }
}

/**
 * True when the server-side profile holds exactly what we submitted. Lets the
 * app confirm a save by reading it back, without comparing device and server
 * clocks.
 */
export function profileMatches(saved: MemberProfile | null, input: MemberProfileInput): boolean {
  if (!saved) return false;
  const near = (a: number | undefined, b: number) => typeof a === 'number' && Math.abs(a - b) < 0.01;
  return (
    near(Number(saved.age), input.age) &&
    near(Number(saved.height), input.height) &&
    near(Number(saved.weight), input.weight) &&
    saved.fitnessGoal === input.fitnessGoal &&
    saved.dietPreference === input.dietPreference &&
    saved.activityLevel === input.activityLevel
  );
}
