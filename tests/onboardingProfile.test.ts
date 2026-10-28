import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_ACTIVITY,
  draftFromProfile,
  EMPTY_DRAFT,
  firstInvalidStep,
  type OnboardingDraft,
  parseDecimal,
  parseDraft,
  profileMatches,
  toProfileInput,
  validateStep,
} from '../src/utils/onboardingProfile.ts';
import type { MemberProfile } from '../src/types/index.ts';

const complete: OnboardingDraft = {
  ...EMPTY_DRAFT,
  goal: 'WEIGHT_LOSS',
  age: '28',
  height: '172.5',
  weight: '74',
  diet: 'VEG',
};

test('activity has a sensible default so the last step is one tap', () => {
  assert.equal(EMPTY_DRAFT.activity, DEFAULT_ACTIVITY);
  assert.deepEqual(validateStep('food', { ...EMPTY_DRAFT, diet: 'VEG' }), {});
});

test('a complete form with optional fields blank is valid', () => {
  assert.equal(firstInvalidStep(complete), -1);
  const input = toProfileInput(complete);
  assert.equal(input.gender, undefined);
  assert.equal(input.allergies, undefined);
  assert.equal(input.height, 172.5);
  assert.equal(input.age, 28);
});

test('whitespace-only allergies are not sent', () => {
  assert.equal(toProfileInput({ ...complete, allergies: '   ' }).allergies, undefined);
  assert.equal(toProfileInput({ ...complete, allergies: ' peanuts ' }).allergies, 'peanuts');
});

test('body step reports each bad field with a specific message', () => {
  const errors = validateStep('body', { ...complete, age: '5', height: '', weight: 'abc' });
  assert.match(errors.age!, /between 13 and 100/);
  assert.match(errors.height!, /Enter your height/);
  assert.match(errors.weight!, /30–300 kg/);
});

test('decimal comma from some locales is accepted', () => {
  assert.equal(parseDecimal('72,5'), 72.5);
  assert.ok(Number.isNaN(parseDecimal('7.2.5')));
  assert.ok(Number.isNaN(parseDecimal('')));
});

test('firstInvalidStep points at the earliest problem', () => {
  assert.equal(firstInvalidStep(EMPTY_DRAFT), 0);
  assert.equal(firstInvalidStep({ ...complete, weight: '' }), 1);
  assert.equal(firstInvalidStep({ ...complete, diet: null }), 2);
});

test('persisted drafts round-trip and bad storage is tolerated', () => {
  const restored = parseDraft(JSON.stringify({ ...complete, step: 2 }));
  assert.deepEqual(restored, { ...complete, step: 2 });
  assert.equal(parseDraft('{not json'), null);
  assert.equal(parseDraft(null), null);
  assert.equal(parseDraft(JSON.stringify({ step: 99 }))!.step, 0, 'out-of-range step resets');
});

const savedProfile = (overrides: Partial<MemberProfile> = {}): MemberProfile => ({
  id: 'p1',
  memberId: 'm1',
  isOnboarded: true,
  updatedAt: '2026-10-26T10:00:00Z',
  age: 28,
  height: 172.5,
  weight: 74,
  fitnessGoal: 'WEIGHT_LOSS',
  dietPreference: 'VEG',
  activityLevel: 'MODERATE',
  ...overrides,
});

test('profileMatches confirms a save by reading it back', () => {
  const input = toProfileInput(complete);
  assert.ok(profileMatches(savedProfile(), input));
  // Decimal columns may come back as strings from some ORMs.
  assert.ok(profileMatches(savedProfile({ height: '172.50' as unknown as number }), input));
  assert.ok(!profileMatches(savedProfile({ weight: 80 }), input), 'old values must not count as saved');
  assert.ok(!profileMatches(savedProfile({ dietPreference: 'NON_VEG' }), input));
  assert.ok(!profileMatches(null, input));
});

test('editing starts from the saved profile', () => {
  const draft = draftFromProfile(savedProfile({ allergies: 'lactose' }));
  assert.equal(draft.age, '28');
  assert.equal(draft.allergies, 'lactose');
  assert.equal(draft.step, 0);
  assert.equal(firstInvalidStep(draft), -1);
});
