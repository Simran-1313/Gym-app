import { getProfile, submitProfile, SubmitProfileResult } from './member.service';
import { MemberProfile, MemberProfileInput } from '../types';
import { profileMatches } from '../utils/onboardingProfile';

/** While the profile request is in flight, read the profile back this often. */
const CONFIRM_POLL_MS = 2500;

export interface ProfileSave {
  /** Resolves with the stored profile as soon as the save is confirmed. */
  saved: Promise<MemberProfile>;
  /**
   * The full request, which may carry on generating the diet plan after the
   * profile is stored. Hand it to `PlansContext.trackGeneration`.
   */
  request: Promise<SubmitProfileResult>;
}

/**
 * Saves the fitness profile without making the member wait for the AI plan.
 *
 * `POST /member/profile` may generate the diet plan inside the same request,
 * so its answer can take as long as the LLM does. `saved` therefore resolves
 * on whichever comes first: the POST answering, or a read-back of the profile
 * showing exactly the submitted values. A failed POST is double-checked the
 * same way — if the profile did save and only plan generation failed, the
 * save still counts and the plan screen offers the retry. No device/server
 * clock comparison is involved.
 */
export function saveProfile(input: MemberProfileInput): ProfileSave {
  const request = submitProfile(input);
  // Callers may only ever await `saved`; never leave this rejection unhandled.
  request.catch(() => {});

  const saved = new Promise<MemberProfile>((resolve, reject) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      fn();
    };

    const readBack = async (): Promise<MemberProfile | null> => {
      try {
        const profile = await getProfile();
        return profile && profileMatches(profile, input) ? profile : null;
      } catch {
        return null;
      }
    };

    const poll = async () => {
      if (settled) return;
      const profile = await readBack();
      if (profile) finish(() => resolve(profile));
      else if (!settled) timer = setTimeout(poll, CONFIRM_POLL_MS);
    };
    timer = setTimeout(poll, CONFIRM_POLL_MS);

    request.then(
      (res) => finish(() => resolve(res.profile)),
      async (err) => {
        if (settled) return;
        const profile = await readBack();
        if (profile) finish(() => resolve(profile));
        else finish(() => reject(err));
      },
    );
  });

  return { saved, request };
}
