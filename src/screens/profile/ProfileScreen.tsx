import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { updateProfile } from '../../services/auth.service';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../../config/theme';

const InfoRow: React.FC<{ icon: keyof typeof Ionicons.glyphMap; label: string; value: string }> = ({
  icon,
  label,
  value,
}) => (
  <View style={styles.infoRow}>
    <Ionicons name={icon} size={18} color={COLORS.primary} />
    <View style={styles.infoText}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '—'}</Text>
    </View>
  </View>
);

export const ProfileScreen: React.FC = () => {
  const { user, logout, refreshUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name cannot be empty.');
      return;
    }
    setSaving(true);
    try {
      await updateProfile({ name: name.trim(), phone: phone.trim() || undefined });
      await refreshUser();
      setEditing(false);
      Alert.alert('Saved', 'Profile updated successfully.');
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          try {
            await logout();
          } finally {
            setLoggingOut(false);
          }
        },
      },
    ]);
  };

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : '—';

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarLetter}>{user?.name?.[0]?.toUpperCase() ?? 'M'}</Text>
        </View>
        <Text style={styles.heroName}>{user?.name ?? 'Member'}</Text>
        <Text style={styles.heroEmail}>{user?.email ?? ''}</Text>
        <Text style={styles.memberSince}>Member since {memberSince}</Text>
      </View>

      {user?.isFirstLogin && (
        <View style={styles.alertBanner}>
          <Ionicons name="warning" size={18} color={COLORS.warning} />
          <Text style={styles.alertText}>Please change your temporary password.</Text>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Personal Info</Text>
          {!editing && (
            <TouchableOpacity onPress={() => setEditing(true)} style={styles.editBtn}>
              <Ionicons name="create-outline" size={16} color={COLORS.primary} />
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {editing ? (
          <View style={styles.editCard}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="words"
                editable={!saving}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Phone</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Phone number"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="phone-pad"
                editable={!saving}
              />
            </View>
            <View style={styles.editActions}>
              <TouchableOpacity
                style={styles.cancelEditBtn}
                onPress={() => {
                  setEditing(false);
                  setName(user?.name ?? '');
                  setPhone(user?.phone ?? '');
                }}
                disabled={saving}
              >
                <Text style={styles.cancelEditText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.saveBtnText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.infoCard}>
            <InfoRow icon="person-outline" label="Name" value={user?.name ?? ''} />
            <View style={styles.separator} />
            <InfoRow icon="mail-outline" label="Email" value={user?.email ?? ''} />
            <View style={styles.separator} />
            <InfoRow icon="call-outline" label="Phone" value={user?.phone ?? ''} />
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.menuCard}>
          <View style={[styles.statusRow]}>
            <View style={styles.statusLeft}>
              <Ionicons
                name={user?.isActive ? 'checkmark-circle' : 'close-circle'}
                size={20}
                color={user?.isActive ? COLORS.success : COLORS.error}
              />
              <Text style={styles.menuLabel}>Account Status</Text>
            </View>
            <Text style={{ color: user?.isActive ? COLORS.success : COLORS.error, fontSize: FONT_SIZE.sm, fontWeight: '600' }}>
              {user?.isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.logoutBtn, loggingOut && styles.logoutBtnDisabled]}
        onPress={handleLogout}
        disabled={loggingOut}
        activeOpacity={0.8}
      >
        {loggingOut ? (
          <ActivityIndicator color={COLORS.error} />
        ) : (
          <>
            <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
            <Text style={styles.logoutText}>Logout</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, gap: SPACING.lg, paddingBottom: SPACING.xxl },

  hero: { alignItems: 'center', paddingVertical: SPACING.lg, gap: SPACING.sm },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary + '33',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  avatarLetter: { color: COLORS.primary, fontSize: FONT_SIZE.xxxl, fontWeight: '800' },
  heroName: { color: COLORS.text, fontSize: FONT_SIZE.xxl, fontWeight: '700' },
  heroEmail: { color: COLORS.textSecondary, fontSize: FONT_SIZE.md },
  memberSince: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm },

  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warning + '22',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.warning + '44',
  },
  alertText: { color: COLORS.warning, fontSize: FONT_SIZE.sm, flex: 1 },

  section: { gap: SPACING.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editBtnText: { color: COLORS.primary, fontSize: FONT_SIZE.sm, fontWeight: '600' },

  infoCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.sm },
  infoText: { flex: 1 },
  infoLabel: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs, marginBottom: 2 },
  infoValue: { color: COLORS.text, fontSize: FONT_SIZE.md, fontWeight: '500' },
  separator: { height: 1, backgroundColor: COLORS.cardBorder },

  editCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    gap: SPACING.md,
  },
  field: { gap: SPACING.xs },
  fieldLabel: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm, fontWeight: '500' },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    paddingHorizontal: SPACING.md,
    height: 48,
  },
  editActions: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.xs },
  cancelEditBtn: {
    flex: 1,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: RADIUS.md,
  },
  cancelEditText: { color: COLORS.textSecondary, fontSize: FONT_SIZE.md, fontWeight: '600' },
  saveBtn: {
    flex: 1,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: COLORS.white, fontSize: FONT_SIZE.md, fontWeight: '700' },

  menuCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  menuLabel: { color: COLORS.text, fontSize: FONT_SIZE.md },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    borderWidth: 1.5,
    borderColor: COLORS.error,
    borderRadius: RADIUS.md,
    height: 52,
    marginTop: SPACING.sm,
  },
  logoutBtnDisabled: { opacity: 0.5 },
  logoutText: { color: COLORS.error, fontSize: FONT_SIZE.lg, fontWeight: '700' },
});
