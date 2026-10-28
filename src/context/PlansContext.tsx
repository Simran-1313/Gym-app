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
import { onReconnect, useConnectivity } from '../services/network';
import { AiPlan } from '../types';
import { readCache, removeCache, writeCache } from '../utils/localCache';
import {
  createSingleFlight,
  FailureKind,
  kindOf,
  outcomeUnknown,
  withRetry,
} from '../utils/requestPolicy';
import { useAuth } from './AuthContext';

export type PlanType = 'DIET' | 'WORKOUT';

export interface PlanSlice {
  plan: AiPlan | null;
  /** Fetching the saved plan with nothing on screen yet. */
  loading: boolean;
  /**
   * A plan is being produced: our own request is in flight, or the server is
   * generating one we're watching for (`awaitingSince`).
   */
  generating: boolean;
  error: string | null;
  errorKind: FailureKind | null;
  /** Which operation `error` belongs to — decides whether Retry reloads or regenerates. */
  errorSource: 'load' | 'generate' | null;
  loaded: boolean;
  /** `plan` came from this device's cache because the server couldn't be reached. */
  fromCache: boolean;
  /** Epoch ms when a server-side generation we're polling for began. */
  awaitingSince: number | null;
}

const emptySlice: PlanSlice = {
  plan: null,
  loading: false,
  generating: false,
  error: null,
  errorKind: null,
  errorSource: null,
  loaded: false,
  fromCache: false,
  awaitingSince: null,
};

/**
 * A generation whose result we haven't seen yet — persisted, so a relaunch
 * mid-generation keeps watching for the plan instead of firing a second LLM
 * request. `baselineId` is the plan that existed before; any *other* plan
 * id appearing means the new one landed (no device/server clock comparison).
 */
interface PendingGeneration {
  startedAt: number;
  baselineId: string | null;
}

/** How long to keep looking for a plan the server may still be generating. */
export const PENDING_WINDOW_MS = 4 * 60 * 1000;
const POLL_INTERVAL_MS = 6000;
/** After this long without a result, the plan screen offers to start over. */
export const STALL_AFTER_MS = 90 * 1000;

const cacheKey = (type: PlanType, userId: string) => `plan-${type}-${userId}`;
const pendingKey = (type: PlanType, userId: string) => `pending-${type}-${userId}`;

export interface ReadyNotice {
  type: PlanType;
  at: number;
}

interface PlansContextValue {
  diet: PlanSlice;
  workout: PlanSlice;
  loadPlan: (type: PlanType, force?: boolean) => Promise<void>;
  /** De-duplicated: while one generation runs, further calls join it. */
  generatePlan: (type: PlanType) => Promise<AiPlan | null>;
  /**
   * Adopt a generation started elsewhere — the onboarding profile save, which
   * may produce the diet plan in the same request. Resolves to `null` when the
   * server will generate it in the background.
   */
  trackGeneration: (type: PlanType, request: Promise<AiPlan | null>) => void;
  /** Re-runs whichever operation failed (load or generate). */
  retry: (type: PlanType) => Promise<void>;
  setPlan: (type: PlanType, plan: AiPlan) => void;
  reset: () => void;
  /** Set when a plan finishes generating, for the app-wide "plan ready" toast. */
  readyNotice: ReadyNotice | null;
  dismissReadyNotice: () => void;
}

const PlansContext = createContext<PlansContextValue | null>(null);

async function fetchLatest(type: PlanType): Promise<AiPlan | null> {
  const { plans } = await getAiPlans(1, 10);
  const meta = plans.find((p) => p.type === type);
  return meta ? getAiPlan(meta.id) : null;
}

const messageOf = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);

export const PlansProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { isOffline } = useConnectivity();
  const userId = user?.id ?? null;
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  const [diet, setDiet] = useState<PlanSlice>(emptySlice);
  const [workout, setWorkout] = useState<PlanSlice>(emptySlice);
  const [readyNotice, setReadyNotice] = useState<ReadyNotice | null>(null);

  const slices = useRef<Record<PlanType, PlanSlice>>({ DIET: diet, WORKOUT: workout });
  const pending = useRef<Record<PlanType, PendingGeneration | null>>({ DIET: null, WORKOUT: null });
  const flights = useRef(createSingleFlight<string>());

  const apply = useCallback((type: PlanType, patch: Partial<PlanSlice>) => {
    const next = { ...slices.current[type], ...patch };
    slices.current[type] = next;
    (type === 'DIET' ? setDiet : setWorkout)(next);
  }, []);

  /* ── Persistence helpers ── */

  const persistPlan = useCallback((type: PlanType, plan: AiPlan) => {
    const uid = userIdRef.current;
    if (uid) writeCache(cacheKey(type, uid), plan);
  }, []);

  const setPending = useCallback((type: PlanType, value: PendingGeneration | null) => {
    pending.current[type] = value;
    const uid = userIdRef.current;
    if (!uid) return;
    if (value) writeCache(pendingKey(type, uid), value);
    else removeCache(pendingKey(type, uid));
  }, []);

  /** A freshly generated plan arrived — show it, cache it, announce it. */
  const land = useCallback(
    (type: PlanType, plan: AiPlan) => {
      setPending(type, null);
      apply(type, {
        plan,
        loaded: true,
        loading: false,
        generating: false,
        error: null,
        errorKind: null,
        errorSource: null,
        fromCache: false,
        awaitingSince: null,
      });
      persistPlan(type, plan);
      setReadyNotice({ type, at: Date.now() });
    },
    [apply, persistPlan, setPending],
  );

  const failGeneration = useCallback(
    (type: PlanType, message: string, kind: FailureKind | null) => {
      setPending(type, null);
      apply(type, {
        generating: false,
        awaitingSince: null,
        loaded: true,
        error: message,
        errorKind: kind,
        errorSource: 'generate',
      });
    },
    [apply, setPending],
  );

  /** Server may still be producing the plan: watch for it instead of re-requesting. */
  const startAwaiting = useCallback(
    (type: PlanType, marker: PendingGeneration) => {
      setPending(type, marker);
      apply(type, { generating: true, awaitingSince: marker.startedAt, error: null, errorKind: null, errorSource: null });
    },
    [apply, setPending],
  );

  /* ── Load ── */

  const loadPlan = useCallback(
    async (type: PlanType, force = false) => {
      const current = slices.current[type];
      if (!force && current.loaded) return;

      return flights.current.run(`load:${type}`, async () => {
        const uid = userIdRef.current;
        // Only show a blocking loader when there is nothing to display yet.
        if (!slices.current[type].plan) apply(type, { loading: true, error: null, errorSource: null });
        try {
          // Reads are idempotent, so transient failures get two quiet retries.
          const latest = await withRetry(() => fetchLatest(type), { retries: 2 });
          if (userIdRef.current !== uid) return;
          const marker = pending.current[type];
          if (latest && marker && latest.id !== marker.baselineId && slices.current[type].awaitingSince) {
            land(type, latest);
            return;
          }
          // A failed *generation* stays visible (with its Retry) over a reload.
          const keepError = slices.current[type].errorSource === 'generate';
          apply(type, {
            plan: latest,
            loaded: true,
            loading: false,
            fromCache: false,
            ...(keepError ? {} : { error: null, errorKind: null, errorSource: null }),
          });
          if (latest) persistPlan(type, latest);
          else if (uid) removeCache(cacheKey(type, uid));
        } catch (err) {
          if (userIdRef.current !== uid) return;
          const kind = kindOf(err);
          // An expired session is handled by AuthContext (back to login).
          const cached = !slices.current[type].plan && uid && kind !== 'unauthorized'
            ? await readCache<AiPlan>(cacheKey(type, uid))
            : null;
          apply(type, {
            ...(cached ? { plan: cached, fromCache: true } : {}),
            loading: false,
            loaded: true,
            error: messageOf(err, 'Failed to load your plan.'),
            errorKind: kind,
            errorSource: 'load',
          });
        }
      });
    },
    [apply, persistPlan, land],
  );

  /* ── Generate ── */

  const handleGenerationFailure = useCallback(
    (type: PlanType, err: unknown, marker: PendingGeneration) => {
      // The request reached the server but we never heard back. Generating
      // again would risk a duplicate plan; look for the result instead.
      if (outcomeUnknown(err)) {
        startAwaiting(type, marker);
        return;
      }
      failGeneration(type, messageOf(err, 'Failed to generate your plan.'), kindOf(err));
    },
    [failGeneration, startAwaiting],
  );

  const generatePlan = useCallback(
    (type: PlanType): Promise<AiPlan | null> => {
      // Already watching for a server-side generation: don't start another.
      if (slices.current[type].awaitingSince) return Promise.resolve(null);

      return flights.current.run(`gen:${type}`, async () => {
        const uid = userIdRef.current;
        const marker: PendingGeneration = { startedAt: Date.now(), baselineId: slices.current[type].plan?.id ?? null };
        setPending(type, marker);
        apply(type, { generating: true, error: null, errorKind: null, errorSource: null });
        try {
          const fresh = type === 'DIET' ? await apiGenerateDiet() : await apiGenerateWorkout();
          if (userIdRef.current !== uid) return null;
          land(type, fresh);
          return fresh;
        } catch (err) {
          if (userIdRef.current !== uid) return null;
          handleGenerationFailure(type, err, marker);
          return null;
        }
      });
    },
    [apply, land, handleGenerationFailure, setPending],
  );

  const trackGeneration = useCallback(
    (type: PlanType, request: Promise<AiPlan | null>) => {
      // Never leave a rejection unhandled, even if a flight is already running
      // and this request's own handler below is never attached.
      request.catch(() => {});
      const uid = userIdRef.current;
      const marker: PendingGeneration = { startedAt: Date.now(), baselineId: slices.current[type].plan?.id ?? null };
      setPending(type, marker);
      apply(type, { generating: true, error: null, errorKind: null, errorSource: null, loaded: true });

      // Registered as the generation flight, so a Generate tap while this is
      // running joins it instead of firing a second request.
      flights.current
        .run(`gen:${type}`, async () => {
          try {
            const plan = await request;
            if (userIdRef.current !== uid) return null;
            if (plan) land(type, plan);
            // Saved, but the backend generates the plan after responding.
            else startAwaiting(type, marker);
            return plan;
          } catch (err) {
            if (userIdRef.current !== uid) return null;
            handleGenerationFailure(type, err, marker);
            return null;
          }
        })
        .catch(() => {});
    },
    [apply, land, startAwaiting, handleGenerationFailure, setPending],
  );

  /* ── Watching for a server-side generation ── */

  const pollOnce = useCallback(
    async (type: PlanType) => {
      const marker = pending.current[type];
      if (!marker) return;
      if (Date.now() - marker.startedAt > PENDING_WINDOW_MS) {
        failGeneration(
          type,
          'Your plan didn’t finish generating. Please try again.',
          'timeout',
        );
        return;
      }
      try {
        const latest = await flights.current.run(`poll:${type}`, () => fetchLatest(type));
        if (pending.current[type] !== marker) return;
        if (latest && latest.id !== marker.baselineId) land(type, latest);
      } catch (err) {
        if (kindOf(err) === 'unauthorized') failGeneration(type, messageOf(err, ''), 'unauthorized');
        // Anything else: keep watching until the window closes.
      }
    },
    [failGeneration, land],
  );

  const dietAwaiting = diet.awaitingSince;
  const workoutAwaiting = workout.awaitingSince;
  useEffect(() => {
    // Polling pauses while offline and resumes (with an immediate check) on reconnect.
    if (isOffline) return;
    const types = ([['DIET', dietAwaiting], ['WORKOUT', workoutAwaiting]] as const)
      .filter(([, since]) => since !== null)
      .map(([t]) => t);
    if (types.length === 0) return;
    types.forEach((t) => pollOnce(t));
    const id = setInterval(() => types.forEach((t) => pollOnce(t)), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [dietAwaiting, workoutAwaiting, isOffline, pollOnce]);

  /* ── Retry ── */

  const retry = useCallback(
    async (type: PlanType) => {
      // Explicit "try again" while watching a server-side generation that has
      // gone quiet (e.g. the server restarted and dropped it): stop watching
      // and start a fresh one. Offered only after STALL_AFTER_MS.
      if (slices.current[type].awaitingSince) {
        setPending(type, null);
        apply(type, { awaitingSince: null, generating: false });
        await generatePlan(type);
        return;
      }
      if (slices.current[type].errorSource === 'generate') {
        await generatePlan(type);
      } else {
        await loadPlan(type, true);
      }
    },
    [generatePlan, loadPlan, apply, setPending],
  );

  // Back online: refresh anything that's showing stale or failed data.
  useEffect(() => {
    return onReconnect(() => {
      (['DIET', 'WORKOUT'] as const).forEach((t) => {
        const s = slices.current[t];
        if (s.fromCache || (s.errorSource === 'load' && s.loaded)) loadPlan(t, true);
      });
    });
  }, [loadPlan]);

  /* ── Session lifecycle ── */

  const setPlan = useCallback(
    (type: PlanType, plan: AiPlan) => {
      apply(type, { plan, loaded: true, loading: false, error: null, errorKind: null, errorSource: null, fromCache: false });
      persistPlan(type, plan);
    },
    [apply, persistPlan],
  );

  const reset = useCallback(() => {
    slices.current = { DIET: emptySlice, WORKOUT: emptySlice };
    pending.current = { DIET: null, WORKOUT: null };
    flights.current.clear();
    setDiet(emptySlice);
    setWorkout(emptySlice);
    setReadyNotice(null);
  }, []);

  const prevUserId = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevUserId.current;
    if (prev === userId) return;
    prevUserId.current = userId;
    reset();

    // Signed out: don't leave this member's plans on a possibly shared device.
    if (prev && !userId) {
      (['DIET', 'WORKOUT'] as const).forEach((t) => {
        removeCache(cacheKey(t, prev));
        removeCache(pendingKey(t, prev));
      });
    }

    // Signed in: resume watching any generation that was in flight when the
    // app last closed.
    if (userId) {
      (['DIET', 'WORKOUT'] as const).forEach(async (t) => {
        const marker = await readCache<PendingGeneration>(pendingKey(t, userId));
        if (!marker || userIdRef.current !== userId) return;
        if (Date.now() - marker.startedAt > PENDING_WINDOW_MS) {
          removeCache(pendingKey(t, userId));
          return;
        }
        startAwaiting(t, marker);
      });
    }
  }, [userId, reset, startAwaiting]);

  const dismissReadyNotice = useCallback(() => setReadyNotice(null), []);

  const value = useMemo(
    () => ({
      diet,
      workout,
      loadPlan,
      generatePlan,
      trackGeneration,
      retry,
      setPlan,
      reset,
      readyNotice,
      dismissReadyNotice,
    }),
    [diet, workout, loadPlan, generatePlan, trackGeneration, retry, setPlan, reset, readyNotice, dismissReadyNotice],
  );

  return <PlansContext.Provider value={value}>{children}</PlansContext.Provider>;
};

export const usePlans = (): PlansContextValue => {
  const ctx = useContext(PlansContext);
  if (!ctx) throw new Error('usePlans must be used inside PlansProvider');
  return ctx;
};
