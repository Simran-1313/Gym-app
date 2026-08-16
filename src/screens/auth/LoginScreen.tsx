import React, { useState } from 'react';
import {
  Alert,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { COLORS, FONT_SIZE, SPACING, TYPOGRAPHY } from '../../config/theme';
import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassInput } from '../../components/ui/GlassInput';
import { AnimatedButton } from '../../components/ui/AnimatedButton';
import { GymLogo } from '../../components/ui/GymLogo';

const BACKGROUND_IMAGE =
  'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=1000&auto=format&fit=crop';

export const LoginScreen: React.FC = () => {
  const { login, gym } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const shakeX = useSharedValue(0);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const triggerShake = () => {
    shakeX.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-8, { duration: 50 }),
      withTiming(8, { duration: 50 }),
      withTiming(0, { duration: 50 }),
    );
  };

  const handleLogin = async () => {
    console.log('[LoginScreen] Sign In button clicked. Email:', email);
    if (!email.trim() || !password.trim()) {
      console.log('[LoginScreen] Validation failed: Email or password field is empty.');
      Alert.alert('Missing Fields', 'Please enter your email and password.');
      triggerShake();
      return;
    }
    console.log('[LoginScreen] Inputs validated. Starting loading state...');
    setLoading(true);
    try {
      console.log('[LoginScreen] Calling authContext login function...');
      await login({ email: email.trim().toLowerCase(), password });
      console.log('[LoginScreen] AuthContext login completed successfully!');
    } catch (err: unknown) {
      console.error('[LoginScreen] Login process encountered an error:', err);
      const message = err instanceof Error ? err.message : 'Login failed. Please try again.';
      triggerShake();
      Alert.alert('Login Failed', message);
    } finally {
      console.log('[LoginScreen] Resetting loading state...');
      setLoading(false);
    }
  };

  return (
    <AnimatedScreen noBackground style={styles.flex}>
      <ImageBackground source={{ uri: BACKGROUND_IMAGE }} style={styles.backgroundImage}>
        <LinearGradient
          colors={['rgba(4,4,7,0.7)', 'rgba(4,4,7,0.92)', '#040407']}
          style={StyleSheet.absoluteFill}
        />
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <Animated.View entering={FadeIn.duration(500)} style={styles.header}>
              <GymLogo name={gym?.name} logo={gym?.logo} size={80} style={styles.logoCard} />
              <Text style={styles.brand} numberOfLines={2} adjustsFontSizeToFit>
                {gym?.name ?? 'Clasendra'}
              </Text>
              <Text style={styles.tagline}>
                {gym ? 'Your gym, in your pocket.' : 'Sign in with the details your gym sent you.'}
              </Text>
            </Animated.View>

            <Animated.View style={shakeStyle}>
              <GlassCard glowColor={COLORS.primaryGlow} innerStyle={styles.cardInner}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>Member Login</Text>
                  <Text style={styles.cardSubtitle}>Welcome back — let's get you training.</Text>
                </View>

                <GlassInput
                  label="Email"
                  placeholder="you@example.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  leftIcon={<Ionicons name="mail-outline" size={18} color={COLORS.textSecondary} />}
                />

                <GlassInput
                  label="Password"
                  placeholder="Enter password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  editable={!loading}
                  onSubmitEditing={handleLogin}
                  returnKeyType="done"
                  leftIcon={<Ionicons name="lock-closed-outline" size={18} color={COLORS.textSecondary} />}
                  rightIcon={
                    <TouchableOpacity
                      onPress={() => setShowPassword((v) => !v)}
                      hitSlop={10}
                      accessibilityRole="button"
                      accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={COLORS.textSecondary}
                      />
                    </TouchableOpacity>
                  }
                />

                <AnimatedButton label="Sign In" onPress={handleLogin} loading={loading} style={styles.btn} />

                <Text style={styles.hint}>Use the email and password sent by your gym.</Text>
              </GlassCard>
            </Animated.View>

            {/* Platform credit stays small and out of the way — the gym owns this screen. */}
            <Text style={styles.poweredBy}>Powered by Clasendra</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </ImageBackground>
    </AnimatedScreen>
  );
};

// Vertical rhythm is one scale, applied consistently: 8 inside a pair (label to
// field), 16 between fields, 24 before an action, 32 between sections.
const styles = StyleSheet.create({
  flex: { flex: 1 },
  backgroundImage: { flex: 1, width: '100%', height: '100%' },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xxl,
  },
  header: { alignItems: 'center', marginBottom: SPACING.xl },
  logoCard: { marginBottom: SPACING.md },
  brand: {
    ...TYPOGRAPHY.hero,
    color: COLORS.text,
    textAlign: 'center',
    paddingHorizontal: SPACING.md,
  },
  tagline: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    textAlign: 'center',
    paddingHorizontal: SPACING.md,
  },

  // `gap` sets the base spacing between every child of the card, so no element
  // needs its own margin to stay clear of its neighbour.
  cardInner: { padding: SPACING.lg, gap: SPACING.md },
  cardHeader: { gap: SPACING.xs, marginBottom: SPACING.xs },
  cardTitle: { ...TYPOGRAPHY.title, color: COLORS.text },
  cardSubtitle: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, fontSize: FONT_SIZE.sm },

  // 8 on top of the card's 16 gap = 24 clear above the primary action.
  btn: { marginTop: SPACING.sm },
  hint: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  poweredBy: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.xl,
    letterSpacing: 0.4,
  },
});
