export const DARK_COLORS = {
  background: '#040407',
  backgroundGradient: ['#040407', '#0E090D'] as const,
  surface: 'rgba(255,255,255,0.045)',
  surfaceBorder: 'rgba(255,255,255,0.09)',
  card: 'rgba(255,255,255,0.045)',
  cardBorder: 'rgba(255,255,255,0.09)',

  primary: '#FF4F18',
  primaryGlow: '#FF6F43',
  primaryDark: '#C83200',
  primaryLight: '#FF8F65',

  secondary: '#FF1744',
  accent: '#FF9E18',

  success: '#00E676',
  warning: '#FFD600',
  danger: '#FF1744',
  error: '#FF1744',
  info: '#29B6F6',

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

  primary: '#FF4F18',
  primaryGlow: '#FF6F43',
  primaryDark: '#C83200',
  primaryLight: '#FF8F65',

  secondary: '#FF1744',
  accent: '#FF9E18',

  success: '#00C853',
  warning: '#FFC400',
  danger: '#FF1744',
  error: '#FF1744',
  info: '#00B0FF',

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

export const TYPOGRAPHY = {
  hero: { fontSize: 32, fontWeight: '800' as const, letterSpacing: 0.5 },
  title: { fontSize: 24, fontWeight: '700' as const },
  heading: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  caption: { fontSize: 12, fontWeight: '400' as const },
};

export const GRADIENTS = {
  primary: ['#FF4F18', '#FF1744'] as const,
  accent: ['#FF9E18', '#FF4F18'] as const,
  surfaceGlow: ['rgba(255,79,24,0.22)', 'transparent'] as const,
  profileHero: ['#FF4F18', '#FF1744', '#C83200'] as const,
};
