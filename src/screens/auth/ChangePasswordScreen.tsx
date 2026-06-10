import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { useAuth } from '../../context/AuthContext';
import { changePassword } from '../../services/auth.service';
import { clearCookie } from '../../services/api';
import { COLORS, FONT_SIZE, SPACING, TYPOGRAPHY } from '../../config/theme';
import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassInput } from '../../components/ui/GlassInput';
import { AnimatedButton } from '../../components/ui/AnimatedButton';
import { SuccessBurst } from '../../components/ui/SuccessBurst';

export const ChangePasswordScreen: React.FC = () => {
  const { logout, setFirstLoginDone } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!current || !next || !confirm) {
      Alert.alert('Missing Fields', 'Please fill in all fields.');
      return;
    }
    if (next !== confirm) {
      Alert.alert('Mismatch', 'New password and confirm password do not match.');
      return;
    }
    if (next.length < 8) {
      Alert.alert('Weak Password', 'Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      await changePassword({ currentPassword: current, newPassword: next, confirmPassword: confirm });
      setShowSuccess(true);
      setTimeout(() => {
        Alert.alert('Password Changed', 'Please log in with your new password.', [
          {
            text: 'OK',
            onPress: async () => {
              await clearCookie();
              logout();
            },
          },
        ]);
      }, 900);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to change password.';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatedScreen>
      <SuccessBurst visible={showSuccess} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Animated.View entering={ZoomIn.duration(400)} style={styles.iconBox}>
            <Ionicons name="shield-checkmark" size={48} color={COLORS.primary} />
          </Animated.View>
          <Text style={styles.title}>Set Your Password</Text>
          <Text style={styles.subtitle}>
            This is your first login. Please change your temporary password to continue.
          </Text>

          <GlassCard glowColor={COLORS.primary}>
            {[
              { label: 'Current Password', value: current, onChange: setCurrent },
              { label: 'New Password', value: next, onChange: setNext },
              { label: 'Confirm New Password', value: confirm, onChange: setConfirm },
            ].map(({ label, value, onChange }, i) => (
              <Animated.View key={label} entering={FadeIn.delay(i * 80).duration(300)}>
                <GlassInput
                  label={label}
                  placeholder={label}
                  value={value}
                  onChangeText={onChange}
                  secureTextEntry
                  autoCapitalize="none"
                  editable={!loading}
                  leftIcon={<Ionicons name="lock-closed-outline" size={18} color={COLORS.textSecondary} />}
                />
              </Animated.View>
            ))}

            <AnimatedButton
              label="Change Password"
              onPress={handleSubmit}
              loading={loading}
              style={styles.btn}
            />
            <AnimatedButton label="Skip for now" variant="ghost" onPress={logout} />
          </GlassCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </AnimatedScreen>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, padding: SPACING.lg, paddingTop: SPACING.xl },
  iconBox: { alignItems: 'center', marginBottom: SPACING.md },
  title: { ...TYPOGRAPHY.title, color: COLORS.text, textAlign: 'center' },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.xl,
    lineHeight: 22,
  },
  btn: { marginTop: SPACING.xs },
});
