import { Tenant } from '../types';
import { getSecureItem, setSecureItem } from '../utils/secureStorage';

/**
 * The login screen has to render before we know who the member is, so there's
 * no tenant on hand to brand it with. We cache the gym from the last successful
 * session and reuse it — a member reopening the app sees their own gym, not the
 * platform. Cleared only when a *different* gym logs in on the device.
 */
const LAST_GYM_KEY = 'clasendra_last_gym';

export interface GymBrand {
  id: string;
  name: string;
  logo: string | null;
  primaryColor: string | null;
}

export const toGymBrand = (tenant?: Tenant | null): GymBrand | null =>
  tenant
    ? {
        id: tenant.id,
        name: tenant.name,
        logo: tenant.logo ?? null,
        primaryColor: tenant.primaryColor ?? null,
      }
    : null;

export const getCachedGym = async (): Promise<GymBrand | null> => {
  try {
    const raw = await getSecureItem(LAST_GYM_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GymBrand;
    return parsed?.name ? parsed : null;
  } catch {
    // Corrupt or unreadable cache is not worth failing a launch over.
    return null;
  }
};

export const cacheGym = async (tenant?: Tenant | null): Promise<void> => {
  const brand = toGymBrand(tenant);
  if (!brand) return;
  try {
    await setSecureItem(LAST_GYM_KEY, JSON.stringify(brand));
  } catch {
    // Best-effort: branding falls back to the platform default next launch.
  }
};
