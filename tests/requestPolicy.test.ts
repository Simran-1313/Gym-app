import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  ApiError,
  backoffDelay,
  classifyFailure,
  createSingleFlight,
  failureMessage,
  isTransient,
  outcomeUnknown,
  withRetry,
} from '../src/utils/requestPolicy.ts';

const noSleep = async () => {};

test('classifies transport failures: offline vs unreachable vs timeout', () => {
  assert.equal(classifyFailure({ deviceOffline: true }), 'offline');
  assert.equal(classifyFailure({ deviceOffline: false }), 'unreachable');
  assert.equal(classifyFailure({ code: 'ECONNABORTED', deviceOffline: false }), 'timeout');
  assert.equal(classifyFailure({ message: 'timeout of 120000ms exceeded', deviceOffline: true }), 'timeout');
  assert.equal(classifyFailure({ code: 'ERR_CANCELED', deviceOffline: false }), 'cancelled');
});

test('classifies HTTP statuses', () => {
  const kind = (status: number) => classifyFailure({ status, deviceOffline: false });
  assert.equal(kind(401), 'unauthorized');
  assert.equal(kind(400), 'validation');
  assert.equal(kind(422), 'validation');
  assert.equal(kind(404), 'not_found');
  assert.equal(kind(429), 'rate_limited');
  assert.equal(kind(504), 'timeout');
  assert.equal(kind(500), 'server');
  assert.equal(kind(503), 'server');
  assert.equal(kind(403), 'client');
});

test('a server answer wins over the offline flag', () => {
  assert.equal(classifyFailure({ status: 500, deviceOffline: true }), 'server');
});

test('messages: 4xx keeps the backend reason, 5xx never leaks it', () => {
  assert.equal(failureMessage('validation', 'Age must be at least 13'), 'Age must be at least 13');
  assert.notEqual(failureMessage('server', 'PrismaClientKnownRequestError at line 42'), 'PrismaClientKnownRequestError at line 42');
  assert.match(failureMessage('offline'), /offline/i);
  assert.match(failureMessage('unreachable'), /can’t reach/i);
});

test('401 reads as an expired session, except on the login request', () => {
  assert.match(failureMessage('unauthorized', 'jwt expired'), /session has expired/i);
  assert.equal(failureMessage('unauthorized', 'Invalid credentials', true), 'Invalid credentials');
});

test('only transient failures are auto-retried', () => {
  assert.ok(isTransient('timeout'));
  assert.ok(isTransient('unreachable'));
  assert.ok(isTransient('server'));
  assert.ok(!isTransient('offline'), 'offline waits for reconnect instead');
  assert.ok(!isTransient('validation'));
  assert.ok(!isTransient('unauthorized'));
});

test('withRetry retries transient errors, then succeeds', async () => {
  let calls = 0;
  const result = await withRetry(
    async () => {
      calls++;
      if (calls < 3) throw new ApiError('server', 'boom', 500);
      return 'ok';
    },
    { retries: 2, sleep: noSleep },
  );
  assert.equal(result, 'ok');
  assert.equal(calls, 3);
});

test('withRetry gives up after the retry budget', async () => {
  let calls = 0;
  await assert.rejects(
    withRetry(
      async () => {
        calls++;
        throw new ApiError('timeout', 'slow');
      },
      { retries: 2, sleep: noSleep },
    ),
    /slow/,
  );
  assert.equal(calls, 3);
});

test('withRetry does not retry validation or auth errors', async () => {
  for (const kind of ['validation', 'unauthorized', 'offline'] as const) {
    let calls = 0;
    await assert.rejects(
      withRetry(
        async () => {
          calls++;
          throw new ApiError(kind, kind);
        },
        { retries: 3, sleep: noSleep },
      ),
    );
    assert.equal(calls, 1, `${kind} must not be retried`);
  }
});

test('backoff grows exponentially and is capped', () => {
  const mid = () => 0.5; // zero jitter
  assert.equal(backoffDelay(0, 800, 8000, mid), 800);
  assert.equal(backoffDelay(1, 800, 8000, mid), 1600);
  assert.equal(backoffDelay(2, 800, 8000, mid), 3200);
  assert.equal(backoffDelay(10, 800, 8000, mid), 8000);
  const high = backoffDelay(0, 800, 8000, () => 1);
  const low = backoffDelay(0, 800, 8000, () => 0);
  assert.ok(high <= 1000 && low >= 600, 'jitter stays within ±25%');
});

test('single-flight: repeated taps share one request', async () => {
  const flights = createSingleFlight<string>();
  let calls = 0;
  let release!: (v: string) => void;
  const fn = () => {
    calls++;
    return new Promise<string>((r) => {
      release = r;
    });
  };

  const a = flights.run('gen:DIET', fn);
  const b = flights.run('gen:DIET', fn);
  const c = flights.run('gen:DIET', fn);
  assert.equal(calls, 1);
  assert.ok(flights.isRunning('gen:DIET'));

  release('plan-1');
  assert.deepEqual(await Promise.all([a, b, c]), ['plan-1', 'plan-1', 'plan-1']);
  assert.ok(!flights.isRunning('gen:DIET'));

  // After it settles, a new call starts a fresh request.
  const d = flights.run('gen:DIET', fn);
  assert.equal(calls, 2);
  release('plan-2');
  assert.equal(await d, 'plan-2');
});

test('single-flight: a failure is shared and then cleared', async () => {
  const flights = createSingleFlight<string>();
  let calls = 0;
  const fn = async () => {
    calls++;
    throw new Error('nope');
  };
  await Promise.all([
    assert.rejects(flights.run('k', fn)),
    assert.rejects(flights.run('k', fn)),
  ]);
  assert.equal(calls, 1);
  assert.ok(!flights.isRunning('k'));
});

test('outcomeUnknown: only when the request went out and no real answer came back', () => {
  assert.ok(outcomeUnknown(new ApiError('timeout', 't')));
  assert.ok(outcomeUnknown(new ApiError('unreachable', 'u')));
  assert.ok(outcomeUnknown(new ApiError('offline', 'dropped mid-request')));
  assert.ok(!outcomeUnknown(new ApiError('offline', 'never sent', undefined, false)));
  assert.ok(!outcomeUnknown(new ApiError('server', 'failed', 500)), 'a 500 is a definite failure');
  assert.ok(!outcomeUnknown(new ApiError('validation', 'bad', 400)));
  assert.ok(!outcomeUnknown(new Error('plain')));
});
