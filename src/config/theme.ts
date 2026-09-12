/**
 * Design tokens — "elevation surface" system.
 *
 * Replaces the earlier neon-glassmorphism palette (translucent tinted panels
 * over a blurred animated mesh) with solid, layered surfaces: each elevation
 * tier (background → surface → surface2 → surface3 → overlay) is a flat step
 * lighter than the last, the way iOS materials read depth without needing a
 * blur pass under every card. Cheaper to render, and reads calmer at a glance
 * across a dashboard-heavy app like this one.
 */
export interface ThemeColors {
  background: string;
  backgroundGradient: readonly [string, string];
  surface: string;
  surfaceBorder: string;
  surface2: string;
  surface3: string;
  overlay: string;
  card: string;
  cardBorder: string;
  primary: string;
  primaryGlow: string;
  primaryDark: string;
  primaryLight: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  danger: string;
  error: string;
  info: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  statusActive: string;
  statusExpired: string;
  statusFrozen: string;
  statusCancelled: string;
  white: string;
  black: string;
  transparent: string;
}

export const DARK_COLORS: ThemeColors = {
  background: '#08090C',
  backgroundGradient: ['#08090C', '#08090C'],
  surface: '#0F1319',
  surfaceBorder: 'rgba(255,255,255,0.055)',
  surface2: '#161B22',
  surface3: '#1E242D',
  overlay: '#22282F',
  card: '#0F1319',
  cardBorder: 'rgba(255,255,255,0.055)',

  primary: '#2DD4C8', // Teal — the single brand accent, reused for every active/selected state
  primaryGlow: '#7EE8DF',
  primaryDark: '#1B8F87',
  primaryLight: '#7EE8DF',

  secondary: '#FF6B7A', // Warm pink — streaks, flame icon, rare "delight" moments
  accent: '#7C8CFF', // Lavender — informational/AI, not a warning

  success: '#4ADE9E',
  warning: '#F5A83C',
  danger: '#FF5A5F',
  error: '#FF5A5F',
  info: '#7C8CFF',

  text: '#F5F7F9',
  textSecondary: 'rgba(245,247,249,0.64)',
  textMuted: 'rgba(245,247,249,0.4)',

  statusActive: '#4ADE9E',
  statusExpired: '#FF5A5F',
  statusFrozen: '#F5A83C',
  statusCancelled: 'rgba(245,247,249,0.4)',

  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

export const LIGHT_COLORS: ThemeColors = {
  background: '#F3F5F7',
  backgroundGradient: ['#F3F5F7', '#F3F5F7'],
  surface: '#FFFFFF',
  surfaceBorder: 'rgba(15,23,42,0.08)',
  surface2: '#EDF0F4',
  surface3: '#E1E5EB',
  overlay: '#FFFFFF',
  card: '#FFFFFF',
  cardBorder: 'rgba(15,23,42,0.08)',

  // Deeper than the dark-mode teal — bright teal on a white ground reads washed
  // out, so light mode gets its own contrast-checked step of every accent.
  primary: '#0EA79B',
  primaryGlow: '#5EEAE0',
  primaryDark: '#0B857C',
  primaryLight: '#5EEAE0',

  secondary: '#E24F68',
  accent: '#5A6EEA',

  success: '#149E63',
  warning: '#C97A15',
  danger: '#E0434B',
  error: '#E0434B',
  info: '#5A6EEA',

  text: '#10182A',
  textSecondary: 'rgba(16,24,42,0.62)',
  textMuted: 'rgba(16,24,42,0.4)',

  statusActive: '#149E63',
  statusExpired: '#E0434B',
  statusFrozen: '#C97A15',
  statusCancelled: 'rgba(16,24,42,0.4)',

  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

export const COLORS = DARK_COLORS;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const RADIUS = {
  sm: 8,
  md: 16,
  lg: 22,
  xl: 26,
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
  hero: 32,
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
  hero: { fontFamily: FONTS.displayBold, fontSize: 32, letterSpacing: -0.5, lineHeight: 38 },
  title: { fontFamily: FONTS.displaySemi, fontSize: 22, letterSpacing: -0.3, lineHeight: 28 },
  heading: { fontFamily: FONTS.displayMedium, fontSize: 18, lineHeight: 24 },
  label: { fontFamily: FONTS.bodyMedium, fontSize: 13, letterSpacing: 0.1 },
  body: { fontFamily: FONTS.body, fontSize: 15, lineHeight: 22 },
  caption: { fontFamily: FONTS.body, fontSize: 12, lineHeight: 16 },
};

export const GRADIENTS = {
  primary: ['#2DD4C8', '#1B8F87'] as const,
  accent: ['#7C8CFF', '#5A6EEA'] as const,
  surfaceGlow: ['rgba(45,212,200,0.22)', 'transparent'] as const,
  profileHero: ['#2DD4C8', '#1B8F87', '#0F6B65'] as const,
} as const;
