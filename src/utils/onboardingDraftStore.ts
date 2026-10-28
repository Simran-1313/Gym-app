import { deleteSecureItem, getSecureItem, setSecureItem } from './secureStorage';
import { OnboardingDraft, parseDraft } from './onboardingProfile';

/**
 * The half-finished onboarding form, per member. Age, weight and allergies are
 * health data, so this goes to SecureStore (it's well under the size limit),
 * and it's deleted as soon as the profile is saved on the server.
 */
const keyFor = (userId: string) => `onboarding.draft.${userId.replace(/[^\w.-]/g, '_')}`;

export async function loadDraft(userId: string): Promise<OnboardingDraft | null> {
  try {
    return parseDraft(await getSecureItem(keyFor(userId)));
  } catch {
    return null;
  }
}

export async function saveDraft(userId: string, draft: OnboardingDraft): Promise<void> {
  try {
    await setSecureItem(keyFor(userId), JSON.stringify(draft));
  } catch {
    // Losing the draft is recoverable; crashing the form is not.
  }
}

export async function clearDraft(userId: string): Promise<void> {
  try {
    await deleteSecureItem(keyFor(userId));
  } catch {
    // ignore
  }
}
