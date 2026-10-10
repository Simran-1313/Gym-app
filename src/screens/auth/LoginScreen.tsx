import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useAuth } from '../../context/AuthContext';
import { FONTS, INPUT, INPUT_LABEL, INPUT_TEXT, SPACING } from '../../config/theme';
import { isValidHex } from '../../utils/color';
import { AnimatedButton } from '../../components/ui/AnimatedButton';

/**
 * Auth is a fixed dark surface in both themes, matching docs/UI_PROTOTYPE.html
 * (#screen-login). The theme toggle lives behind the login wall, so there is no
 * preference to honour yet — and the scene is artwork, which cannot recolour.
 */
const SCENE = {
  glow: 'rgba(45,212,200,0.22)',
  skyTop: '#0D1A22',
  skyMid: '#0A141C',
  skyBottom: '#08090C',
  ridgeNear: '#101F28',
  ridgeMid: '#172933',
  ridgeFar: '#0D1C24',
};

/** Dark-mode tokens, lifted verbatim from the prototype's `:root`. */
const INK = {
  bg: '#08090C',
  surface: '#0F1319',
  hairline: 'rgba(255,255,255,0.13)',
  teal: '#2DD4C8',
  text: '#F5F7F9',
  muted: 'rgba(245,247,249,0.64)',
  dim: 'rgba(245,247,249,0.4)',
  danger: '#FF5A5F',
};

const SCENE_H = 280;
/** The prototype's ridge geometry is authored against a 390pt-wide frame. */
const BASE_W = 390;

const MountainScene: React.FC<{ width: number }> = ({ width }) => {
  const k = width / BASE_W;
  const pt = (x: number, y: number) => `${x * k},${y}`;
  /** [left edge, apex, right edge] — CSS `left` + border-widths of each .mtn. */
  const ridge = (left: number, halfBase: number, height: number) =>
    [
      pt(left, SCENE_H),
      pt(left + halfBase, SCENE_H - height),
      pt(left + halfBase * 2, SCENE_H),
    ].join(' ');

  return (
    <Svg width={width} height={SCENE_H} style={StyleSheet.absoluteFill}>
      <Defs>
        <SvgLinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={SCENE.skyTop} />
          <Stop offset="0.45" stopColor={SCENE.skyMid} />
          <Stop offset="1" stopColor={SCENE.skyBottom} />
        </SvgLinearGradient>
        <RadialGradient id="glow" cx="70%" cy="20%" rx="87%" ry="79%">
          <Stop offset="0" stopColor={SCENE.glow} />
          <Stop offset="0.65" stopColor={SCENE.glow} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={width} height={SCENE_H} fill="url(#sky)" />
      <Rect x={0} y={0} width={width} height={SCENE_H} fill="url(#glow)" />
      {/* Paint order is mtn2 → mtn1 → mtn3, as in the prototype's markup:
          the tall translucent ridge sits behind the two solid ones. */}
      <Polygon points={ridge(90, 170, 170)} fill={SCENE.ridgeMid} opacity={0.45} />
      <Polygon points={ridge(-30, 140, 130)} fill={SCENE.ridgeNear} opacity={0.9} />
      <Polygon points={ridge(260, 120, 100)} fill={SCENE.ridgeFar} opacity={0.9} />
    </Svg>
  );
};

/** "Ironworks Gym" → "IG"; a single word falls back to its first two letters. */
const initialsOf = (name: string): string => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return words.slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  }
  return (words[0] ?? '').slice(0, 2).toUpperCase();
};

export const LoginScreen: React.FC = () => {
  const { login, gym } = useAuth();
  const { width } = useWindowDimensions();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState<'email' | 'password' | null>(null);

  // Tenant branding still applies pre-login — the gym is resolved before the
  // member signs in, so its accent should already be on the login screen.
  const accent = isValidHex(gym?.primaryColor) ? (gym!.primaryColor as string) : INK.teal;
  // The mark and the wordmark must agree, so both read from one resolved name.
  const gymName = gym?.name?.trim() || 'Clasendra';

  const shakeX = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));

  /** Mirrors the prototype's `@keyframes shakeX`: 0.4s linear, -9/8/-5/4. */
  const triggerShake = () => {
    const step = { duration: 80, easing: Easing.linear };
    shakeX.value = withSequence(
      withTiming(-9, step),
      withTiming(8, step),
      withTiming(-5, step),
      withTiming(4, step),
      withTiming(0, step),
    );
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Enter both your email and password to continue.');
      triggerShake();
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login({ email: email.trim().toLowerCase(), password });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  // No self-serve reset exists on the backend; the gym resets member passwords.
  const handleForgot = () =>
    Alert.alert(
      'Forgot password?',
      'Ask your gym’s front desk to reset it — they’ll send you a new temporary password.',
    );

  const handleFirstTime = () =>
    Alert.alert(
      'First time here?',
      'Sign in with the temporary email and password your gym sent you. You’ll set your own password and build your profile straight after.',
    );

  const fieldBorder = (name: 'email' | 'password') =>
    focused === name ? accent : INK.hairline;

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* ── Scene ── */}
          <View style={styles.scene}>
            <MountainScene width={width} />
            <Animated.View entering={FadeIn.duration(500)} style={styles.brand}>
              <View
                style={[
                  styles.tenantMark,
                  { backgroundColor: `${accent}24`, borderColor: `${accent}4D` },
                ]}
              >
                <Text style={[styles.tenantMarkText, { color: accent }]}>
                  {initialsOf(gymName)}
                </Text>
              </View>
              <Text style={styles.wordmark} numberOfLines={1} adjustsFontSizeToFit>
                {gymName.toUpperCase()}
              </Text>
              <Text style={styles.tagline}>Progress. Not perfection.</Text>
            </Animated.View>
          </View>

          {/* ── Body sheet, overlapping the scene ── */}
          <Animated.View style={[styles.body, shakeStyle]}>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.sub}>Sign in to continue your training</Text>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Email</Text>
              <View style={[styles.inputWrap, { borderColor: fieldBorder('email') }]}>
                <Ionicons name="mail-outline" size={INPUT.iconSize} color={INK.dim} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused(null)}
                  placeholder="you@example.com"
                  placeholderTextColor={INK.dim}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Password</Text>
              <View style={[styles.inputWrap, { borderColor: fieldBorder('password') }]}>
                <Ionicons name="lock-closed-outline" size={INPUT.iconSize} color={INK.dim} />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  placeholder="••••••••"
                  placeholderTextColor={INK.dim}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  onSubmitEditing={handleLogin}
                  returnKeyType="done"
                  editable={!loading}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((v) => !v)}
                  style={styles.eyeBtn}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={INPUT.iconSize}
                    color={INK.dim}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity onPress={handleForgot} style={styles.links} hitSlop={8}>
              <Text style={[styles.linkText, { color: accent }]}>Forgot password?</Text>
            </TouchableOpacity>

            {error ? (
              <Animated.View entering={FadeIn.duration(180)} style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={16} color={INK.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </Animated.View>
            ) : null}

            <AnimatedButton label="Log In" onPress={handleLogin} loading={loading} />

            <Text style={styles.foot}>
              First time here?{' '}
              <Text style={[styles.footLink, { color: accent }]} onPress={handleFirstTime}>
                Set up your profile
              </Text>
            </Text>

            <Text style={styles.poweredBy}>Powered by Clasendra</Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: INK.bg },
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },

  scene: { height: SCENE_H, overflow: 'hidden' },
  brand: { position: 'absolute', top: 54, left: 0, right: 0, alignItems: 'center', gap: 10 },
  tenantMark: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(45,212,191,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(45,212,191,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tenantMarkText: { fontFamily: FONTS.bodyExtra, fontSize: 16, color: INK.teal },
  wordmark: {
    fontFamily: FONTS.bodyExtra,
    fontSize: 17,
    letterSpacing: 3,
    color: INK.text,
    paddingHorizontal: SPACING.lg,
    textAlign: 'center',
  },
  tagline: { fontFamily: FONTS.body, fontSize: 12, color: INK.muted },

  // Pulled up over the scene with a large top radius, per .login-body.
  body: {
    flex: 1,
    marginTop: -24,
    backgroundColor: INK.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
  },
  title: { fontFamily: FONTS.bodyExtra, fontSize: 22, color: INK.text, marginBottom: 4 },
  sub: { fontFamily: FONTS.body, fontSize: 14, lineHeight: 20, color: INK.muted, marginBottom: 24 },

  field: { marginBottom: 16 },
  fieldLabel: {
    ...INPUT_LABEL,
    color: INK.muted,
    marginBottom: INPUT.labelGap,
  },
  // Explicit height, not vertical padding: padding resolved to ~30pt-tall
  // fields on Android because the platforms pad text differently.
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: INPUT.gap,
    backgroundColor: INK.surface,
    borderWidth: INPUT.borderWidth,
    borderRadius: INPUT.radius,
    paddingHorizontal: INPUT.paddingHorizontal,
    height: INPUT.height,
  },
  input: { ...INPUT_TEXT, color: INK.text },
  // 44pt target; the negative margin keeps the glyph aligned to the field's padding.
  eyeBtn: {
    width: INPUT.hitTarget,
    height: INPUT.hitTarget,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -(INPUT.hitTarget - INPUT.iconSize) / 2,
  },

  links: { alignSelf: 'flex-end', marginTop: -2, marginBottom: 20, paddingVertical: 4 },
  linkText: { fontFamily: FONTS.bodySemi, fontSize: 13, color: INK.teal },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,90,95,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,90,95,0.25)',
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 11,
    marginBottom: 16,
  },
  errorText: { flex: 1, fontFamily: FONTS.body, fontSize: 13, lineHeight: 18, color: INK.danger },

  foot: { textAlign: 'center', fontFamily: FONTS.body, fontSize: 13, color: INK.muted, marginTop: 20 },
  footLink: { fontFamily: FONTS.bodySemi, color: INK.teal },
  poweredBy: {
    textAlign: 'center',
    fontFamily: FONTS.body,
    fontSize: 11,
    color: INK.dim,
    marginTop: 14,
    letterSpacing: 0.4,
  },
});
