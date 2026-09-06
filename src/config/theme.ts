/**
 * Midnight / Teal design system.
 *
 * One accent, not five. The previous palette gave every surface its own neon
 * hue, which made nothing feel important because everything shouted. Here a
 * single teal carries interaction and progress, the greys carry structure, and
 * the muted tints below are reserved for biometric categories only — so a teal
 * element on screen always means "this is live or actionable".
 */

// Biometric category tints. Deliberately desaturated: these sit on small icons
// at 16px, where saturated hues vibrate against the dark ground.
const TINTS_DARK = {
  heart: '#F0768B',
  sleep: '#9BA9F0',
  oxygen: '#7FD1E8',
  recovery: '#4FD1B5',
  energy: '#F0B36B',
  hydration: '#6BB8F0',
} as const;

const TINTS_LIGHT = {
  heart: '#D93B57',
  sleep: '#5566D6',
  oxygen: '#1E88A8',
  recovery: '#0D9488',
  energy: '#C77A1E',
  hydration: '#1D7CC4',
} as const;

export const DARK_COLORS = {
  // Near-black with a blue cast. Pure #000 makes the teal look radioactive and
  // crushes the card elevation; the slight navy keeps surfaces separable.
  background: '#080B11',
  backgroundGradient: ['#080B11', '#0A1017', '#080B11'] as const,

  surface: '#121821',
  surfaceElevated: '#171F2A',
  surfaceBorder: 'rgba(255,255,255,0.07)',
  card: '#121821',
  cardBorder: 'rgba(255,255,255,0.07)',
  cardPressed: '#1A222D',
  // Recessed area *inside* a card (progress tracks, nested tiles, steppers).
  // Must stay opaque: a translucent fill over the animated ground reads muddy.
  inset: '#1B232E',
  insetBorder: 'rgba(255,255,255,0.06)',

  // Teal-400. Bright enough to read as "active" on the dark ground without
  // the neon-cyan buzz of the old palette.
  primary: '#2DD4BF',
  primaryGlow: '#5EEAD4',
  primaryDark: '#14B8A6',
  primaryLight: '#99F6E4',
  primarySoft: 'rgba(45,212,191,0.12)',
  primaryBorder: 'rgba(45,212,191,0.24)',

  secondary: '#7FD1E8',
  accent: '#4FD1B5',

  success: '#4ADE80',
  warning: '#FBBF24',
  danger: '#F0768B',
  error: '#F0768B',
  info: '#7FD1E8',

  text: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.56)',
  textMuted: 'rgba(255,255,255,0.38)',
  textFaint: 'rgba(255,255,255,0.22)',

  statusActive: '#4ADE80',
  statusExpired: '#F0768B',
  statusFrozen: '#FBBF24',
  statusCancelled: 'rgba(255,255,255,0.32)',

  tint: TINTS_DARK,

  // Scrim over artwork. Shaped as a trough, not a ramp: heavy at the top (the
  // hero's big metric) and bottom (the footer stats), but near-open through the
  // middle band where the ridge line actually lives. A monotonic ramp buried it.
  scrim: [
    'rgba(8,11,17,0.78)',
    'rgba(8,11,17,0.22)',
    'rgba(8,11,17,0.30)',
    'rgba(8,11,17,0.88)',
  ] as const,

  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

export const LIGHT_COLORS = {
  background: '#F5F7FA',
  backgroundGradient: ['#F5F7FA', '#EDF1F6', '#F5F7FA'] as const,

  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceBorder: 'rgba(15,29,45,0.09)',
  card: '#FFFFFF',
  cardBorder: 'rgba(15,29,45,0.09)',
  cardPressed: '#EEF2F6',
  inset: '#F1F4F8',
  insetBorder: 'rgba(15,29,45,0.07)',

  // Teal-600. The dark-mode teal fails contrast on white, so light mode drops
  // two steps rather than reusing the same token.
  primary: '#0D9488',
  primaryGlow: '#14B8A6',
  primaryDark: '#0F766E',
  primaryLight: '#5EEAD4',
  primarySoft: 'rgba(13,148,136,0.10)',
  primaryBorder: 'rgba(13,148,136,0.22)',

  secondary: '#1E88A8',
  accent: '#0D9488',

  success: '#16A34A',
  warning: '#D97706',
  danger: '#DC2626',
  error: '#DC2626',
  info: '#1E88A8',

  text: '#0F1D2D',
  textSecondary: 'rgba(15,29,45,0.62)',
  textMuted: 'rgba(15,29,45,0.42)',
  textFaint: 'rgba(15,29,45,0.24)',

  statusActive: '#16A34A',
  statusExpired: '#DC2626',
  statusFrozen: '#D97706',
  statusCancelled: 'rgba(15,29,45,0.34)',

  tint: TINTS_LIGHT,

  scrim: [
    'rgba(255,255,255,0.62)',
    'rgba(255,255,255,0.10)',
    'rgba(255,255,255,0.18)',
    'rgba(255,255,255,0.70)',
  ] as const,

  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

export const COLORS = DARK_COLORS;

export type ThemeColors = typeof DARK_COLORS | typeof LIGHT_COLORS;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  // Screen gutter. Every screen should use this so cards line up across tabs.
  gutter: 20,
} as const;

export const RADIUS = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  full: 999,
} as const;

export const GLASS = {
  blurIntensity: 40,
  blurTint: 'dark' as const,
  borderWidth: 1,
};

export const FONT_SIZE = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 30,
  hero: 34,
  // Reserved for the single dominant metric on a screen.
  display: 52,
} as const;

/**
 * Two families, two jobs. Outfit is a geometric sans with open, rounded forms —
 * warm at large sizes, which is what headings need. Inter was drawn for screen
 * UI at small sizes: tall x-height, unambiguous 1/l/I, so credentials and body
 * copy stay readable on a phone in a gym.
 *
 * Weights are separate files, not `fontWeight` — Android does not synthesise
 * weights for custom fonts, so asking for '700' on a regular face silently
 * gives you the regular face. Always pick the family that already is the weight.
 */
export const FONTS = {
  displayExtra: 'Outfit_800ExtraBold',
  displayBold: 'Outfit_700Bold',
  displaySemi: 'Outfit_600SemiBold',
  displayMedium: 'Outfit_500Medium',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
  bodyExtra: 'Inter_800ExtraBold',
} as const;

export const TYPOGRAPHY = {
  display: { fontFamily: FONTS.displayBold, fontSize: 52, letterSpacing: -2, lineHeight: 58 },
  hero: { fontFamily: FONTS.displayBold, fontSize: 34, letterSpacing: -0.9, lineHeight: 40 },
  title: { fontFamily: FONTS.displaySemi, fontSize: 22, letterSpacing: -0.4, lineHeight: 28 },
  heading: { fontFamily: FONTS.displaySemi, fontSize: 18, letterSpacing: -0.2, lineHeight: 24 },
  metric: { fontFamily: FONTS.displaySemi, fontSize: 26, letterSpacing: -0.6, lineHeight: 32 },
  label: { fontFamily: FONTS.bodyMedium, fontSize: 13, letterSpacing: 0.1 },
  // Section eyebrows: small, wide-tracked, uppercase at call sites.
  eyebrow: { fontFamily: FONTS.bodySemi, fontSize: 11, letterSpacing: 1.4 },
  body: { fontFamily: FONTS.body, fontSize: 15, lineHeight: 22 },
  caption: { fontFamily: FONTS.body, fontSize: 12, lineHeight: 16 },
} as const;

export const GRADIENTS = {
  primary: ['#2DD4BF', '#14B8A6'] as const,
  accent: ['#5EEAD4', '#2DD4BF'] as const,
  surfaceGlow: ['rgba(45,212,191,0.16)', 'transparent'] as const,
  profileHero: ['#2DD4BF', '#14B8A6', '#0F766E'] as const,
  // Deep teal-navy behind vector scenery in hero cards.
  scenery: ['#0C1A22', '#102A33', '#0A1219'] as const,
} as const;

/**
 * Elevation. Dark mode leans on a black shadow for depth; light mode uses a
 * cool blue-grey, because a neutral shadow on a blue-tinted ground reads muddy.
 */
export const shadow = (isDark: boolean, level: 'sm' | 'md' | 'lg' = 'md') => {
  const config = {
    sm: { radius: 8, offset: 2, darkOpacity: 0.3, lightOpacity: 0.06, elevation: 2 },
    md: { radius: 18, offset: 8, darkOpacity: 0.45, lightOpacity: 0.09, elevation: 6 },
    lg: { radius: 30, offset: 14, darkOpacity: 0.6, lightOpacity: 0.13, elevation: 12 },
  }[level];

  return {
    shadowColor: isDark ? '#000000' : '#1E3A5F',
    shadowOpacity: isDark ? config.darkOpacity : config.lightOpacity,
    shadowRadius: config.radius,
    shadowOffset: { width: 0, height: config.offset },
    elevation: config.elevation,
  };
};
