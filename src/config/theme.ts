export const DARK_COLORS = {
  background: '#040407',
  backgroundGradient: ['#040407', '#0E090D'] as const,
  surface: 'rgba(255,255,255,0.045)',
  surfaceBorder: 'rgba(255,255,255,0.09)',
  card: 'rgba(255,255,255,0.045)',
  cardBorder: 'rgba(255,255,255,0.09)',

  primary: '#00E5FF', // Neon Cyan
  primaryGlow: '#18FFFF',
  primaryDark: '#00B8D4',
  primaryLight: '#84FFFF',

  secondary: '#FF007F', // Neon Pink
  accent: '#7C4DFF', // Vibrant Purple

  success: '#39FF14', // Neon Green
  warning: '#FFEA00', // Cyber Yellow
  danger: '#FF1744',
  error: '#FF1744',
  info: '#00BFFF', // Deep Sky Blue

  text: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.45)',

  statusActive: '#00E676',
  statusExpired: '#FF1744',
  statusFrozen: '#FF9E18',
  statusCancelled: 'rgba(255,255,255,0.4)',

  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

export const LIGHT_COLORS = {
  background: '#F2F4F8',
  backgroundGradient: ['#F2F4F8', '#E8ECF2'] as const,
  surface: 'rgba(255,255,255,0.72)',
  surfaceBorder: 'rgba(0,0,0,0.06)',
  card: 'rgba(255,255,255,0.72)',
  cardBorder: 'rgba(0,0,0,0.06)',

  primary: '#00B8D4', // Deep Cyan for light mode
  primaryGlow: '#00E5FF',
  primaryDark: '#00838F',
  primaryLight: '#18FFFF',

  secondary: '#D500F9', // Deep Neon Purple/Pink
  accent: '#651FFF', // Deep Purple

  success: '#00C853',
  warning: '#FFC400',
  danger: '#FF1744',
  error: '#FF1744',
  info: '#0091EA',

  text: '#1A1A2E',
  textSecondary: '#4A4A68',
  textMuted: '#8888A0',

  statusActive: '#00C853',
  statusExpired: '#FF1744',
  statusFrozen: '#FF9E18',
  statusCancelled: 'rgba(0,0,0,0.4)',

  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

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
  lg: 24,
  xl: 32,
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
  primary: ['#00E5FF', '#00B8D4'] as const, // Neon Cyan to Deep Cyan
  accent: ['#7C4DFF', '#FF007F'] as const, // Purple to Pink
  surfaceGlow: ['rgba(0,229,255,0.22)', 'transparent'] as const, // Cyan glow
  profileHero: ['#00E5FF', '#00B8D4', '#00838F'] as const, // Cyan gradient
};
