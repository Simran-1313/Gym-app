import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useAuth } from '../../context/AuthContext';
import { changePassword } from '../../services/auth.service';
import { clearCookie } from '../../services/api';
import { FONTS, SPACING } from '../../config/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { GlassInput } from '../../components/ui/GlassInput';
import { AnimatedButton } from '../../components/ui/AnimatedButton';
import { SuccessBurst } from '../../components/ui/SuccessBurst';

/**
 * Ported from `#screen-change-password` in docs/UI_PROTOTYPE.html: an eyebrow
 * line and three bare `.field`s directly on the scroll — no hero logo, no
 * card wrapper, matching the equally plain in-app variant
 * (`#screen-change-password-inapp`), which this same component also serves
 * (reached from Profile once `isFirstLogin` is false).
 */
export const ChangePasswordScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const colors = useThemeColors();
  const navigation = useNavigation();
  const isFirstLogin = !!user?.isFirstLogin;

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  // Each field reveals independently — toggling one shouldn't expose the others.
  const [revealed, setRevealed] = useState({ current: false, next: false, confirm: false });

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

  const fields = [
    { key: 'current' as const, label: 'Current Password', value: current, onChange: setCurrent },
    { key: 'next' as const, label: 'New Password', value: next, onChange: setNext },
    { key: 'confirm' as const, label: 'Confirm New Password', value: confirm, onChange: setConfirm },
  ];

  return (
    <AnimatedScreen>
      <ScreenHeader
        title="Change Password"
        onBack={isFirstLogin ? undefined : navigation.canGoBack() ? () => navigation.goBack() : undefined}
      />
      <SuccessBurst visible={showSuccess} />
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          {/* `.eyebrow { margin:14px 2px 18px }` — only makes sense as a forced
              first-login notice; the in-app entry already knows why it's here. */}
          {isFirstLogin ? (
            <Text style={[s.eyebrow, { color: colors.textMuted }]}>
              For your security, choose a new password before continuing
            </Text>
          ) : null}

          {fields.map(({ key, label, value, onChange }, i) => (
            <Animated.View key={key} entering={FadeIn.delay(i * 80).duration(300)}>
              <GlassInput
                label={label}
                placeholder={label}
                value={value}
                onChangeText={onChange}
                secureTextEntry={!revealed[key]}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType={key === 'current' ? 'password' : 'newPassword'}
                editable={!loading}
                leftIcon={<Ionicons name="lock-closed-outline" size={16} color={colors.textFaint} />}
                rightIcon={
                  <TouchableOpacity
                    onPress={() => setRevealed((r) => ({ ...r, [key]: !r[key] }))}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={`${revealed[key] ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
                  >
                    <Ionicons
                      name={revealed[key] ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={colors.textFaint}
                    />
                  </TouchableOpacity>
                }
              />
            </Animated.View>
          ))}

          <AnimatedButton label="Update Password" onPress={handleSubmit} loading={loading} style={s.btn} />

          {/* The prototype's back chevron returns to Login without changing
              anything — this is that same escape, just as a ghost button
              since the forced flow hides the header's back control. It would
              be a confusing way to leave a *voluntary* password change
              (Profile → Change Password), where the header back button
              already does that without logging anyone out, so it's hidden
              outside the first-login gate. */}
          {isFirstLogin ? (
            <AnimatedButton label="Skip for now" variant="ghost" onPress={logout} />
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </AnimatedScreen>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, padding: SPACING.lg, paddingTop: SPACING.md, gap: SPACING.xs },
  eyebrow: { fontSize: 12.5, fontFamily: FONTS.body, lineHeight: 18, marginBottom: 6 },
  btn: { marginTop: SPACING.sm },
});
