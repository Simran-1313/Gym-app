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
import { COLORS, FONT_SIZE, RADIUS, SPACING, TYPOGRAPHY } from '../../config/theme';
import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassInput } from '../../components/ui/GlassInput';
import { AnimatedButton } from '../../components/ui/AnimatedButton';

const BACKGROUND_IMAGE =
  'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=1000&auto=format&fit=crop';

export const LoginScreen: React.FC = () => {
  const { login } = useAuth();
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
              <GlassCard glowColor={COLORS.primary} style={styles.logoCard} noPadding>
                <View style={styles.logoInner}>
                  <Ionicons name="barbell" size={40} color={COLORS.primary} />
                </View>
              </GlassCard>
              <Text style={styles.brand}>FitStack</Text>
              <Text style={styles.tagline}>Your gym, in your pocket.</Text>
            </Animated.View>

            <Animated.View style={shakeStyle}>
              <GlassCard glowColor={COLORS.primaryGlow}>
                <Text style={styles.cardTitle}>Member Login</Text>

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
                    <TouchableOpacity onPress={() => setShowPassword((v) => !v)}>
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
          </ScrollView>
        </KeyboardAvoidingView>
      </ImageBackground>
    </AnimatedScreen>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backgroundImage: { flex: 1, width: '100%', height: '100%' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: SPACING.lg },
  header: { alignItems: 'center', marginBottom: SPACING.xl },
  logoCard: { marginBottom: SPACING.md, borderRadius: RADIUS.xl },
  logoInner: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: { ...TYPOGRAPHY.hero, color: COLORS.text, letterSpacing: 1 },
  tagline: { ...TYPOGRAPHY.body, color: COLORS.textSecondary, marginTop: 4 },
  cardTitle: { ...TYPOGRAPHY.title, color: COLORS.text, marginBottom: SPACING.xs },
  btn: { marginTop: SPACING.xs },
  hint: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm, textAlign: 'center', lineHeight: 18 },
});
