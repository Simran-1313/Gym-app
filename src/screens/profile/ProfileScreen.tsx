import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../context/AuthContext';
import { updateProfile } from '../../services/auth.service';
import { COLORS, FONT_SIZE, RADIUS, SPACING, TYPOGRAPHY } from '../../config/theme';
import { RootStackParams } from '../../navigation/AppNavigator';
import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassInput } from '../../components/ui/GlassInput';
import { AnimatedButton } from '../../components/ui/AnimatedButton';
import { GlassOverlay } from '../../components/ui/GlassOverlay';
import { StaggerItem } from '../../components/ui/StaggerItem';

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
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const insets = useSafeAreaInsets();
  const { user, logout, refreshUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
      setShowLogoutConfirm(false);
    }
  };

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : '—';

  return (
    <AnimatedScreen>
      <GlassOverlay
        visible={showLogoutConfirm}
        title="Logout"
        message="Are you sure you want to log out?"
        confirmLabel="Logout"
        cancelLabel="Cancel"
        destructive
        loading={loggingOut}
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />

      <ScrollView
        style={styles.root}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 56, paddingBottom: insets.bottom + 100 }]}
      >
        <GlassCard glowColor={COLORS.primary} style={styles.hero}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarLetter}>{user?.name?.[0]?.toUpperCase() ?? 'M'}</Text>
          </View>
          <Text style={styles.heroName}>{user?.name ?? 'Member'}</Text>
          <Text style={styles.heroEmail}>{user?.email ?? ''}</Text>
          <Text style={styles.memberSince}>Member since {memberSince}</Text>
        </GlassCard>

        {user?.isFirstLogin && (
          <GlassCard glowColor={COLORS.warning}>
            <View style={styles.alertBanner}>
              <Ionicons name="warning" size={18} color={COLORS.warning} />
              <Text style={styles.alertText}>Please change your temporary password.</Text>
            </View>
          </GlassCard>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Personal Info</Text>
            {!editing && (
              <AnimatedButton label="Edit" variant="ghost" onPress={() => setEditing(true)} />
            )}
          </View>

          {editing ? (
            <GlassCard style={styles.editCard}>
              <GlassInput label="Full Name" value={name} onChangeText={setName} placeholder="Your name" autoCapitalize="words" editable={!saving} />
              <GlassInput label="Phone" value={phone} onChangeText={setPhone} placeholder="Phone number" keyboardType="phone-pad" editable={!saving} />
              <View style={styles.editActions}>
                <AnimatedButton
                  label="Cancel"
                  variant="secondary"
                  onPress={() => {
                    setEditing(false);
                    setName(user?.name ?? '');
                    setPhone(user?.phone ?? '');
                  }}
                  disabled={saving}
                  style={styles.flex1}
                />
                <AnimatedButton label="Save" onPress={handleSave} loading={saving} style={styles.flex1} />
              </View>
            </GlassCard>
          ) : (
            <GlassCard>
              <InfoRow icon="person-outline" label="Name" value={user?.name ?? ''} />
              <View style={styles.separator} />
              <InfoRow icon="mail-outline" label="Email" value={user?.email ?? ''} />
              <View style={styles.separator} />
              <InfoRow icon="call-outline" label="Phone" value={user?.phone ?? ''} />
            </GlassCard>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <StaggerItem index={0}>
            <GlassCard glowColor={COLORS.accent} style={styles.menuTile}>
              <AnimatedButton
                label="My Diet Plan"
                variant="secondary"
                onPress={() => navigation.navigate('DietPlan')}
                icon={<Ionicons name="nutrition-outline" size={20} color={COLORS.accent} />}
              />
            </GlassCard>
          </StaggerItem>
          <GlassCard style={styles.menuCard}>
            <View style={styles.statusRow}>
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
          </GlassCard>
        </View>

        <AnimatedButton
          label="Logout"
          variant="secondary"
          onPress={() => setShowLogoutConfirm(true)}
          loading={loggingOut}
          icon={<Ionicons name="log-out-outline" size={20} color={COLORS.error} />}
        />
      </ScrollView>
    </AnimatedScreen>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: SPACING.lg, gap: SPACING.lg },

  hero: { alignItems: 'center', gap: SPACING.sm },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: RADIUS.full,
    backgroundColor: `${COLORS.primary}33`,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  avatarLetter: { color: COLORS.primary, fontSize: FONT_SIZE.hero, fontWeight: '800' },
  heroName: { ...TYPOGRAPHY.title, color: COLORS.text },
  heroEmail: { ...TYPOGRAPHY.body, color: COLORS.textSecondary },
  memberSince: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm },

  alertBanner: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
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

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.sm },
  infoText: { flex: 1 },
  infoLabel: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs, marginBottom: 2 },
  infoValue: { color: COLORS.text, fontSize: FONT_SIZE.md, fontWeight: '500' },
  separator: { height: 1, backgroundColor: COLORS.surfaceBorder },

  editCard: { gap: SPACING.md },
  editActions: { flexDirection: 'row', gap: SPACING.md },
  flex1: { flex: 1 },

  menuTile: { marginBottom: SPACING.sm },
  menuCard: {},
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  menuLabel: { color: COLORS.text, fontSize: FONT_SIZE.md },
});
