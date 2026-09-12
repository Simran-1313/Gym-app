import { useMemo } from 'react';
import { DARK_COLORS, LIGHT_COLORS, ThemeColors } from '../config/theme';
import { useAuth } from '../context/AuthContext';
import { isValidHex, shade } from '../utils/color';

/**
 * The themed color set for the current screen: dark/light per the user's
 * preference, with the signed-in gym's brand color substituted for the
 * default teal when the tenant has set one. White-labeling is a spec
 * requirement (docs/CLASENDRA_MEMBER_MOBILE_APP.md §10) — a gym's own accent
 * color should carry through the tab bar, buttons, and header, not just its
 * logo. Falls back to the platform teal when the tenant hasn't set a color,
 * or when it isn't a valid hex (admin-entered, so don't trust it blindly).
 *
 * Prefer this over destructuring DARK_COLORS/LIGHT_COLORS by hand — it's the
 * one place tenant branding is applied, so a screen that reads colors.primary
 * from here always shows the gym's color, not the platform default.
 */
export const useThemeColors = (): ThemeColors => {
  const { theme, gym } = useAuth();
  const isDark = theme === 'dark';
  const base = isDark ? DARK_COLORS : LIGHT_COLORS;
  const tenantPrimary = gym?.primaryColor;

  return useMemo(() => {
    if (!isValidHex(tenantPrimary)) return base;
    // DARK_COLORS/LIGHT_COLORS type every hex as its own literal so theme.ts's
    // call sites get autocomplete — a computed tenant color is just `string`,
    // so this cast is the one place that narrowing gets deliberately relaxed.
    return {
      ...base,
      primary: tenantPrimary,
      primaryDark: shade(tenantPrimary, -0.28),
      primaryLight: shade(tenantPrimary, 0.35),
      primaryGlow: shade(tenantPrimary, 0.35),
      primarySoft: `${tenantPrimary}1F`,
      primaryBorder: `${tenantPrimary}3D`,
    } as unknown as ThemeColors;
  }, [base, tenantPrimary]);
};
