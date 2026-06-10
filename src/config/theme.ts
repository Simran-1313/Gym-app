export const COLORS = {
  background: '#0A0A0F',
  backgroundGradient: ['#0A0A0F', '#1A0F0A'] as const,
  surface: 'rgba(255,255,255,0.06)',
  surfaceBorder: 'rgba(255,255,255,0.12)',
  card: 'rgba(255,255,255,0.06)',
  cardBorder: 'rgba(255,255,255,0.12)',

  primary: '#FF5722',
  primaryGlow: '#FF7043',
  primaryDark: '#E64A19',
  primaryLight: '#FF8A65',

  secondary: '#FF1744',
  accent: '#FFAB40',

  success: '#00E676',
  warning: '#FFD600',
  danger: '#FF1744',
  error: '#FF1744',
  info: '#FF5722',

  text: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.6)',
  textMuted: 'rgba(255,255,255,0.4)',

  statusActive: '#00E676',
  statusExpired: '#FF1744',
  statusFrozen: '#FF5722',
  statusCancelled: 'rgba(255,255,255,0.4)',

  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

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

export const TYPOGRAPHY = {
  hero: { fontSize: 32, fontWeight: '800' as const, letterSpacing: 0.5 },
  title: { fontSize: 24, fontWeight: '700' as const },
  heading: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  caption: { fontSize: 12, fontWeight: '400' as const },
};

export const GRADIENTS = {
  primary: ['#FF5722', '#FF1744'] as const,
  accent: ['#FFAB40', '#FF5722'] as const,
  surfaceGlow: ['rgba(255,87,34,0.25)', 'transparent'] as const,
};
