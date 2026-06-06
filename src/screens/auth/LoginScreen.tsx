import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../../config/theme';

export const LoginScreen: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await login({ email: email.trim().toLowerCase(), password });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed. Please try again.';
      Alert.alert('Login Failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Ionicons name="barbell" size={40} color={COLORS.primary} />
          </View>
          <Text style={styles.brand}>FitStack</Text>
          <Text style={styles.tagline}>Your gym, in your pocket.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Member Login</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputRow}>
              <Ionicons name="mail-outline" size={18} color={COLORS.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={COLORS.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputRow}>
              <Ionicons name="lock-closed-outline" size={18} color={COLORS.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.inputFlex]}
                placeholder="Enter password"
                placeholderTextColor={COLORS.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!loading}
                onSubmitEditing={handleLogin}
                returnKeyType="done"
              />
              <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.btnText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.hint}>
            Use the email and password sent by your gym.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: SPACING.lg },
  header: { alignItems: 'center', marginBottom: SPACING.xl },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  brand: { color: COLORS.text, fontSize: FONT_SIZE.xxxl, fontWeight: '800', letterSpacing: 1 },
  tagline: { color: COLORS.textSecondary, fontSize: FONT_SIZE.md, marginTop: 4 },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    gap: SPACING.md,
  },
  cardTitle: { color: COLORS.text, fontSize: FONT_SIZE.xl, fontWeight: '700', marginBottom: SPACING.xs },

  field: { gap: SPACING.xs },
  label: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm, fontWeight: '500' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: SPACING.md,
    height: 52,
  },
  inputIcon: { marginRight: SPACING.sm },
  input: { flex: 1, color: COLORS.text, fontSize: FONT_SIZE.md },
  inputFlex: { flex: 1 },
  eyeBtn: { padding: SPACING.xs },

  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.xs,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: COLORS.white, fontSize: FONT_SIZE.lg, fontWeight: '700' },

  hint: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.sm,
    textAlign: 'center',
    lineHeight: 18,
  },
});
