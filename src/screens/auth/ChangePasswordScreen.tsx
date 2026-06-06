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
import { changePassword } from '../../services/auth.service';
import { clearCookie } from '../../services/api';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../../config/theme';

export const ChangePasswordScreen: React.FC = () => {
  const { logout, setFirstLoginDone } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

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
      Alert.alert('Password Changed', 'Please log in with your new password.', [
        {
          text: 'OK',
          onPress: async () => {
            await clearCookie();
            logout();
          },
        },
      ]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to change password.';
      Alert.alert('Error', message);
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
        <View style={styles.iconBox}>
          <Ionicons name="shield-checkmark" size={48} color={COLORS.primary} />
        </View>
        <Text style={styles.title}>Set Your Password</Text>
        <Text style={styles.subtitle}>
          This is your first login. Please change your temporary password to continue.
        </Text>

        <View style={styles.card}>
          {[
            { label: 'Current Password', value: current, onChange: setCurrent },
            { label: 'New Password', value: next, onChange: setNext },
            { label: 'Confirm New Password', value: confirm, onChange: setConfirm },
          ].map(({ label, value, onChange }) => (
            <View key={label} style={styles.field}>
              <Text style={styles.label}>{label}</Text>
              <View style={styles.inputRow}>
                <Ionicons name="lock-closed-outline" size={18} color={COLORS.textSecondary} style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder={label}
                  placeholderTextColor={COLORS.textMuted}
                  value={value}
                  onChangeText={onChange}
                  secureTextEntry
                  autoCapitalize="none"
                  editable={!loading}
                />
              </View>
            </View>
          ))}

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.btnText}>Change Password</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={logout} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flexGrow: 1, padding: SPACING.lg, paddingTop: SPACING.xl },
  iconBox: { alignItems: 'center', marginBottom: SPACING.md },
  title: { color: COLORS.text, fontSize: FONT_SIZE.xxl, fontWeight: '700', textAlign: 'center' },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.md,
    textAlign: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.xl,
    lineHeight: 22,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    gap: SPACING.md,
  },
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
  icon: { marginRight: SPACING.sm },
  input: { flex: 1, color: COLORS.text, fontSize: FONT_SIZE.md },
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
  skipBtn: { alignItems: 'center', paddingVertical: SPACING.sm },
  skipText: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm },
});
