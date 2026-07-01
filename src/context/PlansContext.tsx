import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  generateDietPlan as apiGenerateDiet,
  generateWorkoutPlan as apiGenerateWorkout,
  getAiPlan,
  getAiPlans,
} from '../services/member.service';
import { AiPlan } from '../types';
import { useAuth } from './AuthContext';

type PlanType = 'DIET' | 'WORKOUT';

interface PlanSlice {
  plan: AiPlan | null;
  loading: boolean;
  generating: boolean;
  error: string | null;
  loaded: boolean;
}

const emptySlice: PlanSlice = {
  plan: null,
  loading: false,
  generating: false,
  error: null,
  loaded: false,
};

interface PlansContextValue {
  diet: PlanSlice;
  workout: PlanSlice;
  loadPlan: (type: PlanType, force?: boolean) => Promise<void>;
  generatePlan: (type: PlanType) => Promise<AiPlan | null>;
  setPlan: (type: PlanType, plan: AiPlan) => void;
  reset: () => void;
}

const PlansContext = createContext<PlansContextValue | null>(null);

export const PlansProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [diet, setDiet] = useState<PlanSlice>(emptySlice);
  const [workout, setWorkout] = useState<PlanSlice>(emptySlice);

  const dietRef = useRef(diet);
  const workoutRef = useRef(workout);
  dietRef.current = diet;
  workoutRef.current = workout;

  const inflight = useRef<Record<PlanType, boolean>>({ DIET: false, WORKOUT: false });

  const apply = useCallback((type: PlanType, patch: Partial<PlanSlice>) => {
    const setter = type === 'DIET' ? setDiet : setWorkout;
    setter((prev) => {
      const next = { ...prev, ...patch };
      if (type === 'DIET') dietRef.current = next;
      else workoutRef.current = next;
      return next;
    });
  }, []);

  const loadPlan = useCallback(
    async (type: PlanType, force = false) => {
      const current = type === 'DIET' ? dietRef.current : workoutRef.current;
      if (!force && current.loaded) return;
      if (inflight.current[type]) return;

      inflight.current[type] = true;
      // Only show a blocking loader when there is nothing to display yet.
      if (!current.plan) apply(type, { loading: true, error: null });
      try {
        const { plans } = await getAiPlans(1, 10);
        const meta = plans.find((p) => p.type === type);
        if (!meta) {
          apply(type, { plan: null, loaded: true, loading: false });
          return;
        }
        const full = await getAiPlan(meta.id);
        apply(type, { plan: full, loaded: true, loading: false });
      } catch (err) {
        apply(type, {
          loading: false,
          loaded: true,
          error: err instanceof Error ? err.message : 'Failed to load your plan.',
        });
      } finally {
        inflight.current[type] = false;
      }
    },
    [apply],
  );

  const generatePlan = useCallback(
    async (type: PlanType): Promise<AiPlan | null> => {
      apply(type, { generating: true, error: null });
      try {
        const fresh = type === 'DIET' ? await apiGenerateDiet() : await apiGenerateWorkout();
        apply(type, { plan: fresh, loaded: true, generating: false });
        return fresh;
      } catch (err) {
        apply(type, {
          generating: false,
          loaded: true,
          error: err instanceof Error ? err.message : 'Failed to generate your plan.',
        });
        return null;
      }
    },
    [apply],
  );

  const setPlan = useCallback(
    (type: PlanType, plan: AiPlan) => {
      apply(type, { plan, loaded: true, loading: false, generating: false, error: null });
    },
    [apply],
  );

  const reset = useCallback(() => {
    setDiet(emptySlice);
    setWorkout(emptySlice);
    dietRef.current = emptySlice;
    workoutRef.current = emptySlice;
    inflight.current = { DIET: false, WORKOUT: false };
  }, []);

  const userId = user?.id ?? null;
  const prevUserId = useRef<string | null>(userId);
  useEffect(() => {
    if (prevUserId.current !== userId) {
      prevUserId.current = userId;
      reset();
    }
  }, [userId, reset]);

  const value = useMemo(
    () => ({ diet, workout, loadPlan, generatePlan, setPlan, reset }),
    [diet, workout, loadPlan, generatePlan, setPlan, reset],
  );

  return <PlansContext.Provider value={value}>{children}</PlansContext.Provider>;
};

export const usePlans = (): PlansContextValue => {
  const ctx = useContext(PlansContext);
  if (!ctx) throw new Error('usePlans must be used inside PlansProvider');
  return ctx;
};
