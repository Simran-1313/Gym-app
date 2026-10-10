import { FitnessGoal } from '../../types';

/** Fitness goals in display order — shared by the Profile metrics and the Edit Profile sheet. */
export const GOALS: { key: FitnessGoal; label: string }[] = [
  { key: 'WEIGHT_LOSS', label: 'Lose Fat' },
  { key: 'MUSCLE_GAIN', label: 'Build Muscle' },
  { key: 'ENDURANCE', label: 'Endurance' },
  { key: 'FITNESS', label: 'General Fitness' },
];

export const goalLabel = (g?: FitnessGoal) => GOALS.find((x) => x.key === g)?.label ?? '—';
