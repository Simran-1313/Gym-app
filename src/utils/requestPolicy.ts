/**
 * Request failure classification, retry and de-duplication rules shared by the
 * API client and the plan store.
 *
 * Kept free of React Native imports so it runs under `node --test` (see
 * `tests/`): the behaviour here decides when the app retries, when it waits
 * for the network, and when it logs a member out — worth pinning down.
 */

export type FailureKind =
  /** The device itself has no connection. Retrying before it reconnects is pointless. */
  | 'offline'
  /** Device is online but the API didn't answer (DNS, refused, server down). */
  | 'unreachable'
  | 'timeout'
  /** 401 — the session cookie is missing or expired. */
  | 'unauthorized'
  /** 400 / 422 — the backend rejected the payload. Retrying the same data won't help. */
  | 'validation'
  | 'not_found'
  | 'rate_limited'
  /** 5xx. */
  | 'server'
  /** Any other 4xx. */
  | 'client'
  | 'cancelled';

export class ApiError extends Error {
  readonly kind: FailureKind;
  readonly status?: number;
  /**
   * False only when the client refused to send (known offline). Anything else
   * may have reached the server, so a non-idempotent call's outcome is unknown.
   */
  readonly requestSent: boolean;

  constructor(kind: FailureKind, message: string, status?: number, requestSent = true) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    this.requestSent = requestSent;
  }
}

export interface FailureFacts {
  /** HTTP status, when the server answered at all. */
  status?: number;
  /** Axios / transport error code, e.g. `ECONNABORTED`, `ERR_CANCELED`. */
  code?: string;
  /** Transport error message; axios reports timeouts as "timeout of Nms exceeded". */
  message?: string;
  /** Connectivity snapshot at the time of failure. */
  deviceOffline: boolean;
}

export function classifyFailure({ status, code, message, deviceOffline }: FailureFacts): FailureKind {
  if (code === 'ERR_CANCELED') return 'cancelled';

  if (status === undefined) {
    if (code === 'ECONNABORTED' || code === 'ETIMEDOUT' || /timeout/i.test(message ?? '')) {
      return 'timeout';
    }
    return deviceOffline ? 'offline' : 'unreachable';
  }

  if (status === 401) return 'unauthorized';
  if (status === 400 || status === 422) return 'validation';
  if (status === 404) return 'not_found';
  if (status === 408 || status === 504) return 'timeout';
  if (status === 429) return 'rate_limited';
  if (status >= 500) return 'server';
  return 'client';
}

const DEFAULT_MESSAGES: Record<FailureKind, string> = {
  offline: 'You’re offline. Check your connection and try again.',
  unreachable: 'Can’t reach the Clasendra servers right now. Please try again shortly.',
  timeout: 'The server took too long to respond. Please try again.',
  unauthorized: 'Your session has expired. Please sign in again.',
  validation: 'Some details look invalid. Please check them and try again.',
  not_found: 'We couldn’t find what you were looking for.',
  rate_limited: 'Too many requests right now. Please wait a moment and try again.',
  server: 'Something went wrong on our side. Please try again.',
  client: 'The request couldn’t be completed.',
  cancelled: 'The request was cancelled.',
};

/**
 * What to show the member. A 4xx body message is the backend explaining what
 * was wrong with *this* request ("Invalid credentials", "Age must be ≥ 10"), so
 * it wins. 5xx bodies can carry stack-ish internals, so those always get the
 * generic copy. A 401 outside of login means an expired session, whatever the
 * body says.
 */
export function failureMessage(kind: FailureKind, serverMessage?: string, isAuthRequest = false): string {
  const usable = typeof serverMessage === 'string' && serverMessage.trim().length > 0;
  if (usable && (kind === 'validation' || kind === 'not_found' || kind === 'client' || kind === 'rate_limited')) {
    return serverMessage!;
  }
  if (usable && kind === 'unauthorized' && isAuthRequest) return serverMessage!;
  return DEFAULT_MESSAGES[kind];
}

/**
 * Failures worth an automatic retry of an *idempotent* request. Offline is
 * excluded on purpose — that waits for the reconnect signal instead of
 * burning attempts against a dead radio.
 */
export function isTransient(kind: FailureKind): boolean {
  return kind === 'unreachable' || kind === 'timeout' || kind === 'server' || kind === 'rate_limited';
}

export function kindOf(err: unknown): FailureKind | null {
  return err instanceof ApiError ? err.kind : null;
}

/**
 * After a failed generation POST: could the server still be producing (and
 * saving) the plan? True when the request went out and we never got a real
 * answer — a timeout, a dropped connection, a gateway timeout. The client
 * should then look for the result instead of firing a second, duplicate
 * generation.
 */
export function outcomeUnknown(err: unknown): boolean {
  if (!(err instanceof ApiError) || !err.requestSent) return false;
  return err.kind === 'timeout' || err.kind === 'unreachable' || err.kind === 'offline';
}

/** Exponential backoff with ±25% jitter, capped. attempt is 0-based. */
export function backoffDelay(attempt: number, baseMs = 800, maxMs = 8000, random: () => number = Math.random): number {
  const raw = Math.min(maxMs, baseMs * 2 ** attempt);
  const jitter = raw * 0.25 * (random() * 2 - 1);
  return Math.max(0, Math.round(raw + jitter));
}

export interface RetryOptions {
  /** Extra attempts after the first. */
  retries: number;
  shouldRetry?: (err: unknown) => boolean;
  delay?: (attempt: number) => number;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Only for idempotent reads — never wrap a plan-generation POST in this. */
export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions): Promise<T> {
  const shouldRetry = opts.shouldRetry ?? ((err: unknown) => {
    const kind = kindOf(err);
    return kind !== null && isTransient(kind);
  });
  const delay = opts.delay ?? ((attempt: number) => backoffDelay(attempt));
  const sleep = opts.sleep ?? defaultSleep;

  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= opts.retries || !shouldRetry(err)) throw err;
      await sleep(delay(attempt));
    }
  }
}

/**
 * Collapses concurrent calls with the same key onto one in-flight promise, so
 * a double tap or a screen re-mount can't fire a second generation request.
 */
export function createSingleFlight<K>() {
  const inflight = new Map<K, Promise<unknown>>();

  return {
    run<T>(key: K, fn: () => Promise<T>): Promise<T> {
      const existing = inflight.get(key);
      if (existing) return existing as Promise<T>;
      const p = fn().finally(() => {
        if (inflight.get(key) === p) inflight.delete(key);
      });
      inflight.set(key, p);
      return p;
    },
    isRunning(key: K): boolean {
      return inflight.has(key);
    },
    clear(): void {
      inflight.clear();
    },
  };
}
