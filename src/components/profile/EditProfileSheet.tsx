import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';

import { useAuth } from '../../context/AuthContext';
import { updateProfile } from '../../services/auth.service';
import { submitProfile } from '../../services/member.service';
import { uploadToCloudinary } from '../../services/cloudinary';
import { FONTS, RADIUS } from '../../config/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { FitnessAvatar } from '../ui/FitnessAvatar';
import { FitnessGoal, MemberProfile } from '../../types';
import { GOALS } from './profileGoals';

/**
 * Photo edits are staged, not applied: picking or removing only changes the
 * preview, and nothing reaches Cloudinary or the API until Done — so Cancel
 * genuinely means "nothing happened", the way iOS Contacts / Apple ID behave.
 */
type PhotoDraft = { kind: 'keep' } | { kind: 'new'; uri: string } | { kind: 'remove' };

interface Props {
  visible: boolean;
  profile: MemberProfile | null;
  onClose: () => void;
  /** Called after a successful save with the re-submitted fitness profile, if it changed. */
  onSaved?: (profile: MemberProfile | null) => void;
}

const WEIGHT_RANGE = { min: 25, max: 300 };
const HEIGHT_RANGE = { min: 90, max: 250 };

/* ─────────────── Grouped-form primitives ─────────────── */

const Section: React.FC<{ header?: string; footer?: string; children: React.ReactNode }> = ({
  header,
  footer,
  children,
}) => {
  const colors = useThemeColors();
  return (
    <View style={s.section}>
      {header ? <Text style={[s.sectionHeader, { color: colors.textMuted }]}>{header}</Text> : null}
      <View style={[s.group, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
        {React.Children.toArray(children)
          .filter(Boolean)
          .map((child, i) => (
            <View key={i}>
              {i > 0 ? <View style={[s.separator, { backgroundColor: colors.cardBorder }]} /> : null}
              {child}
            </View>
          ))}
      </View>
      {footer ? <Text style={[s.sectionFooter, { color: colors.textMuted }]}>{footer}</Text> : null}
    </View>
  );
};

/** Label on the left, value/control filling the rest — iOS Contacts edit row. */
const FieldRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => {
  const colors = useThemeColors();
  return (
    <View style={s.row}>
      <Text style={[s.rowLabel, { color: colors.text }]}>{label}</Text>
      {children}
    </View>
  );
};

/** Compact segmented −/+ control (UIStepper shape) beside a fixed-width tabular value. */
const StepperRow: React.FC<{
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  disabled?: boolean;
  onChange: (next: number) => void;
}> = ({ label, unit, value, min, max, disabled, onChange }) => {
  const colors = useThemeColors();

  const step = (delta: number) => {
    const next = Math.min(max, Math.max(min, value + delta));
    if (next === value) return;
    Haptics.selectionAsync().catch(() => {});
    onChange(next);
  };

  const atMin = value <= min;
  const atMax = value >= max;

  return (
    <FieldRow label={label}>
      <Text style={[s.stepValue, { color: colors.text }]} numberOfLines={1}>
        {value}
        <Text style={[s.stepUnit, { color: colors.textSecondary }]}> {unit}</Text>
      </Text>
      <View style={[s.stepper, { backgroundColor: colors.inset }]}>
        <Pressable
          onPress={() => step(-1)}
          disabled={disabled || atMin}
          style={({ pressed }) => [s.stepperHalf, pressed && { opacity: 0.5 }]}
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label.toLowerCase()}`}
        >
          <Ionicons name="remove" size={18} color={atMin ? colors.textFaint : colors.text} />
        </Pressable>
        <View style={[s.stepperDivider, { backgroundColor: colors.cardBorder }]} />
        <Pressable
          onPress={() => step(1)}
          disabled={disabled || atMax}
          style={({ pressed }) => [s.stepperHalf, pressed && { opacity: 0.5 }]}
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label.toLowerCase()}`}
        >
          <Ionicons name="add" size={18} color={atMax ? colors.textFaint : colors.text} />
        </Pressable>
      </View>
    </FieldRow>
  );
};

/* ─────────────── Sheet ─────────────── */

export const EditProfileSheet: React.FC<Props> = ({ visible, profile, onClose, onSaved }) => {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { user, refreshUser } = useAuth();
  const isIOS = Platform.OS === 'ios';

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [weight, setWeight] = useState(0);
  const [height, setHeight] = useState(0);
  const [goal, setGoal] = useState<FitnessGoal | undefined>(undefined);
  const [photo, setPhoto] = useState<PhotoDraft>({ kind: 'keep' });
  const [saving, setSaving] = useState(false);

  const phoneRef = useRef<TextInput>(null);

  // Re-seed the draft from the live values every time the sheet opens, so a
  // cancelled edit never leaks into the next one.
  useEffect(() => {
    if (!visible) return;
    setName(user?.name ?? '');
    setPhone(user?.phone ?? '');
    setWeight(profile?.weight ?? 0);
    setHeight(profile?.height ?? 0);
    setGoal(profile?.fitnessGoal);
    setPhoto({ kind: 'keep' });
    setSaving(false);
    // Only on open — re-seeding mid-edit (e.g. after refreshUser) would wipe input.
  }, [visible]);

  const trimmedName = name.trim();
  const trimmedPhone = phone.trim();

  const nameChanged = trimmedName !== (user?.name ?? '');
  const phoneChanged = trimmedPhone !== (user?.phone ?? '');
  const photoChanged = photo.kind !== 'keep';
  // Only re-submit the fitness profile when a fitness value actually
  // changed — that endpoint regenerates the AI plan through an LLM, which
  // is far too heavy to run because someone renamed themselves.
  const fitnessChanged =
    profile != null &&
    (weight !== profile.weight || height !== profile.height || goal !== profile.fitnessGoal);

  const dirty = nameChanged || phoneChanged || photoChanged || fitnessChanged;

  const previewUri =
    photo.kind === 'new' ? photo.uri : photo.kind === 'remove' ? null : user?.avatarUrl ?? null;

  /* ── Dismissal ── */

  const requestClose = () => {
    if (saving) return;
    if (!dirty) {
      onClose();
      return;
    }
    Alert.alert('Discard Changes?', 'Your edits to your profile won’t be saved.', [
      { text: 'Keep Editing', style: 'cancel' },
      { text: 'Discard Changes', style: 'destructive', onPress: onClose },
    ]);
  };

  /* ── Photo (staged) ── */

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo access to set a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    Haptics.selectionAsync().catch(() => {});
    setPhoto({ kind: 'new', uri: result.assets[0].uri });
  };

  const removePhoto = () => {
    Haptics.selectionAsync().catch(() => {});
    // Removing a photo that was only picked in this session just un-stages it.
    setPhoto(user?.avatarUrl ? { kind: 'remove' } : { kind: 'keep' });
  };

  const openPhotoActions = () => {
    if (saving) return;
    Alert.alert('Profile Photo', undefined, [
      ...(previewUri
        ? [
            { text: 'Change Photo', onPress: pickPhoto },
            { text: 'Remove Photo', style: 'destructive' as const, onPress: removePhoto },
          ]
        : [{ text: 'Choose Photo', onPress: pickPhoto }]),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  /* ── Save ── */

  const handleDone = async () => {
    if (!dirty || saving) return;
    if (!trimmedName) {
      Alert.alert('Name required', 'Your name cannot be empty.');
      return;
    }
    if (phoneChanged && !trimmedPhone) {
      Alert.alert('Phone required', 'Enter a phone number, or tap Cancel to keep your current one.');
      return;
    }

    setSaving(true);
    try {
      // Account fields go out as one PATCH, so name, phone and photo either
      // all land or none do.
      const payload: { name?: string; phone?: string; avatarUrl?: string | null } = {};
      if (nameChanged) payload.name = trimmedName;
      if (phoneChanged) payload.phone = trimmedPhone;
      if (photo.kind === 'new') {
        const { secure_url } = await uploadToCloudinary(photo.uri, 'avatars');
        payload.avatarUrl = secure_url;
      } else if (photo.kind === 'remove') {
        payload.avatarUrl = null;
      }
      if (Object.keys(payload).length > 0) {
        await updateProfile(payload);
      }

      let savedProfile: MemberProfile | null = null;
      if (fitnessChanged && profile && goal) {
        const { profile: saved } = await submitProfile({
          ...profile,
          weight,
          height,
          fitnessGoal: goal,
        });
        savedProfile = saved;
      }

      await refreshUser();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onSaved?.(savedProfile);
      onClose();
    } catch (err: unknown) {
      Alert.alert('Couldn’t save', err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  /* ── Render ── */

  const doneEnabled = dirty && !saving;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={isIOS ? 'pageSheet' : undefined}
      // Swipe-down is allowed only while there's nothing to lose; with unsaved
      // edits the sheet resists, like UIKit's isModalInPresentation.
      allowSwipeDismissal={!dirty && !saving}
      onRequestClose={requestClose}
      statusBarTranslucent
      navigationBarTranslucent
      backdropColor={colors.background}
    >
      <View style={[s.fill, { backgroundColor: colors.background, paddingTop: isIOS ? 0 : insets.top }]}>
        {/* ── Nav bar ── */}
        <View style={[s.navBar, { borderBottomColor: colors.cardBorder }]}>
          <Pressable
            onPress={requestClose}
            disabled={saving}
            hitSlop={10}
            style={({ pressed }) => [s.navSide, pressed && { opacity: 0.5 }]}
            accessibilityRole="button"
          >
            <Text style={[s.navCancel, { color: saving ? colors.textFaint : colors.primary }]}>Cancel</Text>
          </Pressable>

          <Text style={[s.navTitle, { color: colors.text }]} accessibilityRole="header">
            Edit Profile
          </Text>

          <Pressable
            onPress={handleDone}
            disabled={!doneEnabled}
            hitSlop={10}
            style={({ pressed }) => [s.navSide, s.navSideRight, pressed && { opacity: 0.5 }]}
            accessibilityRole="button"
            accessibilityState={{ disabled: !doneEnabled, busy: saving }}
            accessibilityLabel="Done"
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={[s.navDone, { color: doneEnabled ? colors.primary : colors.textFaint }]}>Done</Text>
            )}
          </Pressable>
        </View>

        <KeyboardAvoidingView style={s.fill} behavior={isIOS ? 'padding' : 'height'}>
          <ScrollView
            style={s.fill}
            contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
          >
            {/* ── Avatar ── */}
            <View style={s.avatarBlock}>
              <FitnessAvatar name={trimmedName || user?.name} uri={previewUri} size={96} onPress={openPhotoActions} />
              <Pressable
                onPress={openPhotoActions}
                disabled={saving}
                hitSlop={8}
                style={({ pressed }) => [s.photoLink, pressed && { opacity: 0.5 }]}
                accessibilityRole="button"
              >
                <Text style={[s.photoLinkText, { color: colors.primary }]}>
                  {previewUri ? 'Change Photo' : 'Add Photo'}
                </Text>
              </Pressable>
            </View>

            {/* ── Personal ── */}
            <Section
              header="Personal"
              footer={user?.email ? 'Your email is used to sign in and can’t be changed here.' : undefined}
            >
              <FieldRow label="Name">
                <TextInput
                  style={[s.input, { color: colors.text }]}
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                  placeholderTextColor={colors.textFaint}
                  autoCapitalize="words"
                  autoComplete="name"
                  textContentType="name"
                  returnKeyType="next"
                  onSubmitEditing={() => phoneRef.current?.focus()}
                  submitBehavior="submit"
                  editable={!saving}
                  selectionColor={colors.primary}
                />
              </FieldRow>
              <FieldRow label="Phone">
                <TextInput
                  ref={phoneRef}
                  style={[s.input, { color: colors.text }]}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Add phone"
                  placeholderTextColor={colors.textFaint}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  textContentType="telephoneNumber"
                  editable={!saving}
                  selectionColor={colors.primary}
                />
              </FieldRow>
              {user?.email ? (
                <FieldRow label="Email">
                  <Text style={[s.readonly, { color: colors.textSecondary }]} numberOfLines={1}>
                    {user.email}
                  </Text>
                </FieldRow>
              ) : null}
            </Section>

            {profile ? (
              <>
                {/* ── Body ── */}
                <Section header="Body" footer="Used to calculate your BMI and tailor your plans.">
                  <StepperRow
                    label="Weight"
                    unit="kg"
                    value={weight}
                    onChange={setWeight}
                    disabled={saving}
                    {...WEIGHT_RANGE}
                  />
                  <StepperRow
                    label="Height"
                    unit="cm"
                    value={height}
                    onChange={setHeight}
                    disabled={saving}
                    {...HEIGHT_RANGE}
                  />
                </Section>

                {/* ── Goal ── */}
                <Section
                  header="Goal"
                  footer={
                    fitnessChanged
                      ? 'Saving body or goal changes will refresh your workout and diet plans.'
                      : undefined
                  }
                >
                  {GOALS.map((g) => {
                    const active = goal === g.key;
                    return (
                      <Pressable
                        key={g.key}
                        onPress={() => {
                          if (active) return;
                          Haptics.selectionAsync().catch(() => {});
                          setGoal(g.key);
                        }}
                        disabled={saving}
                        style={({ pressed }) => [s.row, pressed && { backgroundColor: colors.inset }]}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: active }}
                      >
                        <Text style={[s.goalLabel, { color: colors.text }]}>{g.label}</Text>
                        {active ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
                      </Pressable>
                    );
                  })}
                </Section>
              </>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

/* ─────────────── Styles ─────────────── */

const ROW_MIN_HEIGHT = 50;
const INSET_X = 16;

const s = StyleSheet.create({
  fill: { flex: 1 },

  navBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: INSET_X,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navSide: { minWidth: 72, height: 44, justifyContent: 'center' },
  navSideRight: { alignItems: 'flex-end' },
  navTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontFamily: FONTS.bodySemi },
  navCancel: { fontSize: 17, fontFamily: FONTS.body },
  navDone: { fontSize: 17, fontFamily: FONTS.bodyBold },

  content: { paddingHorizontal: INSET_X, paddingTop: 24 },

  avatarBlock: { alignItems: 'center', marginBottom: 28 },
  photoLink: { marginTop: 12, paddingVertical: 4, paddingHorizontal: 8 },
  photoLinkText: { fontSize: 16, fontFamily: FONTS.bodySemi },

  section: { marginBottom: 28 },
  sectionHeader: {
    fontSize: 12.5,
    fontFamily: FONTS.bodySemi,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 7,
    marginLeft: INSET_X,
  },
  sectionFooter: {
    fontSize: 12.5,
    fontFamily: FONTS.body,
    lineHeight: 17,
    marginTop: 7,
    marginHorizontal: INSET_X,
  },
  group: {
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  // Inset hairline, starting at the text column like UITableView's separators.
  separator: { height: StyleSheet.hairlineWidth, marginLeft: INSET_X },

  row: {
    minHeight: ROW_MIN_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: INSET_X,
    gap: 12,
  },
  rowLabel: { width: 72, fontSize: 16, fontFamily: FONTS.bodyMedium },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: FONTS.body,
    paddingVertical: 14,
    paddingHorizontal: 0,
  },
  readonly: { flex: 1, fontSize: 16, fontFamily: FONTS.body },

  // Fixed width + tabular-nums so 2↔3-digit values never nudge the stepper.
  stepValue: {
    flex: 1,
    fontSize: 16,
    fontFamily: FONTS.bodySemi,
    fontVariant: ['tabular-nums'],
  },
  stepUnit: { fontSize: 16, fontFamily: FONTS.body },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 34,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
  },
  stepperHalf: { width: 46, height: 34, alignItems: 'center', justifyContent: 'center' },
  stepperDivider: { width: StyleSheet.hairlineWidth, height: 18 },

  goalLabel: { flex: 1, fontSize: 16, fontFamily: FONTS.body },
});
