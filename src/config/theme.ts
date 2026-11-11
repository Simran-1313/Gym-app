/**
 * Clasendra design system, matched to clasendra.com: near-black and warm
 * off-white grounds with a single lime accent.
 *
 * One accent, not five. The previous palette gave every surface its own neon
 * hue, which made nothing feel important because everything shouted. Here a
 * single lime carries interaction and progress, the greys carry structure, and
 * the muted tints below are reserved for biometric categories only — so a lime
 * element on screen always means "this is live or actionable".
 */

// Biometric category tints. Deliberately desaturated: these sit on small icons
// at 16px, where saturated hues vibrate against the dark ground.
const TINTS_DARK = {
  heart: '#F0768B',
  sleep: '#9BA9F0',
  oxygen: '#7FD1E8',
  recovery: '#9FE870',
  energy: '#F0B36B',
  hydration: '#6BB8F0',
  exercise: '#C7FF4A',
} as const;

const TINTS_LIGHT = {
  heart: '#D93B57',
  sleep: '#5566D6',
  oxygen: '#1E88A8',
  recovery: '#3F6B00',
  energy: '#C77A1E',
  hydration: '#1D7CC4',
  exercise: '#3F6B00',
} as const;

export const DARK_COLORS = {
  // The website's near-black. Pure #000 makes the lime look radioactive and
  // crushes the card elevation; the slight lift keeps surfaces separable.
  background: '#080A0A',
  backgroundGradient: ['#080A0A', '#0C0F0F', '#080A0A'] as const,

  surface: '#111414',
  surfaceElevated: '#171B1B',
  surfaceBorder: 'rgba(255,255,255,0.07)',
  // Bottom sheets sit above every other surface, so they step up once more and
  // take a stronger hairline than a card would.
  overlay: '#1F2424',
  overlayBorder: 'rgba(255,255,255,0.13)',
  card: '#111414',
  cardBorder: 'rgba(255,255,255,0.07)',
  cardPressed: '#171B1B',
  // Recessed area *inside* a card (progress tracks, nested tiles, steppers).
  // Must stay opaque: a translucent fill over the animated ground reads muddy.
  inset: '#1A1F1F',
  insetBorder: 'rgba(255,255,255,0.06)',

  // The website's lime (--lime). Reads as "active" on the near-black ground.
  primary: '#C7FF4A',
  primaryGlow: '#DCFF85',
  primaryDark: '#8ED952',
  primaryLight: '#E6FA68',
  primarySoft: 'rgba(199,255,74,0.12)',
  primaryBorder: 'rgba(199,255,74,0.24)',
  // A deepened primary for surfaces that always carry white text (CTAs,
  // filled chips, banners) — `primary` itself is a bright lime that white
  // fails badly against. This is the website's --lime-ink (white on it is
  // 6.3:1). See utils/color.ts's `solidFillFor`, which is how
  // useThemeColors derives this for a tenant's own brand color.
  primarySolid: '#3F6B00',

  secondary: '#7FD1E8',
  accent: '#9FE870',
  // `--lavender` in the prototype: the AI/assistant accent (chat banner icon,
  // shield-milestone outline) and the default (non-booked, non-full) class
  // capacity bar fill. Distinct from `secondary`/`info`, which are a cyan.
  lavender: '#7C8CFF',

  success: '#4ADE80',
  warning: '#FBBF24',
  danger: '#F0768B',
  error: '#F0768B',
  info: '#7FD1E8',

  text: '#F5F3ED',
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
    'rgba(8,10,10,0.78)',
    'rgba(8,10,10,0.22)',
    'rgba(8,10,10,0.30)',
    'rgba(8,10,10,0.88)',
  ] as const,

  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

export const LIGHT_COLORS = {
  background: '#F5F3ED',
  backgroundGradient: ['#F5F3ED', '#EFEDE6', '#F5F3ED'] as const,

  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceBorder: 'rgba(8,10,10,0.09)',
  overlay: '#FFFFFF',
  overlayBorder: 'rgba(8,10,10,0.15)',
  card: '#FFFFFF',
  cardBorder: 'rgba(8,10,10,0.09)',
  cardPressed: '#EFEDE6',
  inset: '#EFEDE6',
  insetBorder: 'rgba(8,10,10,0.07)',

  // The website's --lime-ink. The dark-mode lime is invisible on a light
  // ground, so light mode uses the deep olive the site uses for lime text.
  primary: '#3F6B00',
  primaryGlow: '#4D8200',
  primaryDark: '#2F5200',
  primaryLight: '#9FE870',
  primarySoft: 'rgba(63,107,0,0.10)',
  primaryBorder: 'rgba(63,107,0,0.22)',
  primarySolid: '#3F6B00',

  secondary: '#1E88A8',
  accent: '#3F6B00',
  lavender: '#5A6EEA',

  success: '#16A34A',
  warning: '#D97706',
  danger: '#DC2626',
  error: '#DC2626',
  info: '#1E88A8',

  text: '#080A0A',
  textSecondary: 'rgba(8,10,10,0.62)',
  textMuted: 'rgba(8,10,10,0.42)',
  textFaint: 'rgba(8,10,10,0.24)',

  statusActive: '#16A34A',
  statusExpired: '#DC2626',
  statusFrozen: '#D97706',
  statusCancelled: 'rgba(8,10,10,0.34)',

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

/** The three activity metrics' colors — rings legend, metric chips, bar chart
 *  and Metric Detail all read these, so Move/Exercise/Hydration look the same
 *  on every screen and follow light mode. */
export const metricTint = (
  colors: { tint: { energy: string; exercise: string; hydration: string } },
  metric: 'CALORIES' | 'DURATION' | 'WATER',
) =>
  metric === 'CALORIES' ? colors.tint.energy : metric === 'DURATION' ? colors.tint.exercise : colors.tint.hydration;

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

/** The one blur recipe for floating chrome (tab bar, top bars, popovers):
 *  the system chrome material, slightly lighter in dark mode. */
export const BLUR = {
  dark: { tint: 'systemChromeMaterialDark' as const, intensity: 60 },
  light: { tint: 'systemChromeMaterialLight' as const, intensity: 70 },
};

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
  primary: ['#C7FF4A', '#8ED952'] as const,
  accent: ['#E6FA68', '#C7FF4A'] as const,
  surfaceGlow: ['rgba(199,255,74,0.16)', 'transparent'] as const,
  profileHero: ['#C7FF4A', '#8ED952', '#3A9E47'] as const,
  // Deep forest green behind vector scenery in hero cards.
  scenery: ['#0E1A10', '#13261A', '#0A120C'] as const,
} as const;

/**
 * Spring physics, named by job rather than by number. Before this existed,
 * every pressable picked its own {damping, stiffness} pair by feel, so eight
 * near-identical gestures across the app each settled at a slightly
 * different speed — the kind of inconsistency that reads as carelessness
 * even when no single instance looks wrong on its own.
 *
 * Values are in Reanimated's duration/dampingRatio form (`withSpring(v,
 * MOTION.press)`), which is the same vocabulary Apple designs springs in:
 * dampingRatio 1 = critically damped (no overshoot), <1 = overshoots and
 * settles. duration is the *perceptual* settle time, not a fixed clock — the
 * spring still reacts to velocity and can be redirected mid-flight.
 */
export const MOTION = {
  // Default press feedback: nothing was thrown, so nothing should bounce.
  // Buttons, cards, rows. Apple's baseline for a non-gestural move (WWDC18
  // "Designing Fluid Interfaces": damping 1.0, response ~0.4).
  press: { duration: 260, dampingRatio: 1 },
  // Same job at small sizes (chips, glyphs) — the full 260ms settle reads
  // sluggish under a 24px icon.
  pressSmall: { duration: 200, dampingRatio: 1 },
  // A control that slides to a resting position (toggle knob, segmented
  // control). Apple's drawer spec: damping 0.8, response 0.3.
  settle: { duration: 240, dampingRatio: 0.8 },
  // Momentum was carried into this motion — a success burst, a tab icon
  // popping on select — so visible overshoot reads as "thrown", not sloppy.
  bouncy: { duration: 260, dampingRatio: 0.65 },
} as const;

/**
 * Elevation. Dark mode leans on a black shadow for depth; light mode uses a
 * warm near-black at low opacity to sit on the off-white ground.
 */
export const shadow = (isDark: boolean, level: 'sm' | 'md' | 'lg' = 'md') => {
  const config = {
    sm: { radius: 8, offset: 2, darkOpacity: 0.3, lightOpacity: 0.06, elevation: 2 },
    md: { radius: 18, offset: 8, darkOpacity: 0.45, lightOpacity: 0.09, elevation: 6 },
    lg: { radius: 30, offset: 14, darkOpacity: 0.6, lightOpacity: 0.13, elevation: 12 },
  }[level];

  return {
    shadowColor: isDark ? '#000000' : '#2A2E2C',
    shadowOpacity: isDark ? config.darkOpacity : config.lightOpacity,
    shadowRadius: config.radius,
    shadowOffset: { width: 0, height: config.offset },
    elevation: config.elevation,
  };
};

/**
 * Text-field geometry. Fields used to size themselves with vertical padding,
 * which iOS and Android resolve differently (Android adds font padding, iOS
 * doesn't) — the login fields came out ~30pt tall on Android. An explicit
 * `height` on the row, with the TextInput filling it and centring its text,
 * renders the same box on both platforms. 54pt sits in the 48–56 band that
 * both Material and the HIG treat as a comfortable single-line field, and
 * matches the primary button so a form reads as one rhythm.
 */
export const INPUT = {
  height: 54,
  radius: RADIUS.md,
  paddingHorizontal: 16,
  fontSize: 16,
  iconSize: 18,
  borderWidth: 1.5,
  gap: 10,
  labelSize: 13,
  labelGap: 8,
  /** Multiline fields (notes, allergies) grow from this, text top-aligned. */
  multilineMinHeight: 96,
  multilinePaddingVertical: 14,
  /** Minimum tap target for in-field controls (show/hide password, clear). */
  hitTarget: 44,
} as const;

/** Field label: sentence case, never uppercase-transformed. */
export const INPUT_LABEL = {
  fontFamily: FONTS.bodySemi,
  fontSize: INPUT.labelSize,
  letterSpacing: 0.1,
} as const;

/**
 * Applied to every single-line TextInput so text is optically centred in the
 * row on Android (no extra font padding) as well as iOS.
 */
export const INPUT_TEXT = {
  flex: 1,
  height: '100%',
  fontFamily: FONTS.body,
  fontSize: INPUT.fontSize,
  paddingVertical: 0,
  paddingHorizontal: 0,
  includeFontPadding: false,
  textAlignVertical: 'center',
} as const;

/** Search bars: a pill, a step shorter than a form field. */
export const SEARCH = {
  height: 46,
  radius: RADIUS.full,
  paddingHorizontal: 16,
  fontSize: 15,
  iconSize: 17,
  gap: 10,
} as const;

/** Chat composers: a growing pill with a 44pt floor, and 44pt round buttons beside it. */
export const COMPOSER = {
  minHeight: 44,
  fontSize: 16,
  lineHeight: 20,
  paddingHorizontal: 16,
  // (44 - 20 line - 2 border) / 2
  paddingVertical: 11,
  buttonSize: 44,
} as const;

/** Button heights, in the same family as INPUT.height. */
export const BUTTON = {
  height: INPUT.height,
  ghostHeight: 44,
} as const;
