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
import { FONT_SIZE, FONTS, INPUT, INPUT_LABEL, SPACING, TYPOGRAPHY } from '../../config/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { FitnessAvatar } from '../ui/FitnessAvatar';
import { PhotoActionSheet } from './PhotoActionSheet';
import { GlassInput } from '../ui/GlassInput';
import { AnimatedChip } from '../ui/AnimatedChip';
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

/* ─────────────── Form primitives ─────────────── */

/** Section title + its fields, spaced on the same rhythm as the app's other forms. */
const Section: React.FC<{ title: string; footer?: string; children: React.ReactNode }> = ({
  title,
  footer,
  children,
}) => {
  const colors = useThemeColors();
  return (
    <View style={s.section}>
      <Text style={[s.sectionTitle, { color: colors.text }]} accessibilityRole="header">
        {title}
      </Text>
      {children}
      {footer ? <Text style={[s.footnote, { color: colors.textMuted }]}>{footer}</Text> : null}
    </View>
  );
};

/**
 * A number field with −/+ inside it. Same box as GlassInput (54pt, INPUT
 * radius/border, label above) so it sits in a form without looking like a
 * different control; the glyphs get full 44pt targets at either end.
 */
const StepperField: React.FC<{
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
    <View style={s.field}>
      <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View
        style={[s.stepper, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ text: `${value} ${unit}` }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => {
          if (disabled) return;
          step(e.nativeEvent.actionName === 'increment' ? 1 : -1);
        }}
      >
        <Pressable
          onPress={() => step(-1)}
          disabled={disabled || atMin}
          style={({ pressed }) => [s.stepBtn, pressed && { opacity: 0.5 }]}
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label.toLowerCase()}`}
        >
          <Ionicons name="remove" size={20} color={atMin ? colors.textFaint : colors.text} />
        </Pressable>
        <Text style={[s.stepValue, { color: colors.text }]} numberOfLines={1}>
          {value}
          <Text style={[s.stepUnit, { color: colors.textSecondary }]}> {unit}</Text>
        </Text>
        <Pressable
          onPress={() => step(1)}
          disabled={disabled || atMax}
          style={({ pressed }) => [s.stepBtn, pressed && { opacity: 0.5 }]}
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label.toLowerCase()}`}
        >
          <Ionicons name="add" size={20} color={atMax ? colors.textFaint : colors.text} />
        </Pressable>
      </View>
    </View>
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
  const [photoSheetOpen, setPhotoSheetOpen] = useState(false);

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
    setPhotoSheetOpen(false);
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
    // Android back lands here (the Modal swallows BackHandler); close the
    // photo sheet first rather than the whole editor.
    if (photoSheetOpen) {
      setPhotoSheetOpen(false);
      return;
    }
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setPhotoSheetOpen(true);
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
              <FitnessAvatar name={trimmedName || user?.name} uri={previewUri} size={96} editable onPress={openPhotoActions} accessibilityLabel="Change profile photo" />
              <Pressable
                onPress={openPhotoActions}
                disabled={saving}
                style={({ pressed }) => [s.photoLink, pressed && { opacity: 0.5 }]}
                accessibilityRole="button"
              >
                <Text style={[s.photoLinkText, { color: colors.primary }]}>
                  {previewUri ? 'Change photo' : 'Add photo'}
                </Text>
              </Pressable>
            </View>

            {/* ── Personal ── */}
            <Section
              title="Personal info"
              footer={user?.email ? 'Your email is used to sign in and can’t be changed here.' : undefined}
            >
              <GlassInput
                label="Name"
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
                returnKeyType="next"
                onSubmitEditing={() => phoneRef.current?.focus()}
                submitBehavior="submit"
                editable={!saving}
                selectionColor={colors.primary}
              />
              <GlassInput
                // React 19 passes `ref` as a plain prop, and GlassInput spreads its
                // rest props onto the TextInput — its Props type just doesn't
                // declare it yet, hence the spread instead of `ref={phoneRef}`.
                ref={phoneRef}
                label="Phone"
                value={phone}
                onChangeText={setPhone}
                placeholder="Add phone"
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                editable={!saving}
                selectionColor={colors.primary}
              />
              {user?.email ? (
                <GlassInput
                  label="Email"
                  value={user.email}
                  editable={false}
                  selectTextOnFocus={false}
                  style={{ color: colors.textSecondary }}
                  accessibilityHint="Can’t be changed here"
                  rightIcon={<Ionicons name="lock-closed-outline" size={INPUT.iconSize} color={colors.textFaint} />}
                />
              ) : null}
            </Section>

            {profile ? (
              <>
                {/* ── Body ── */}
                <Section title="Body" footer="Used to calculate your BMI and tailor your plans.">
                  <View style={s.fieldRow}>
                    <StepperField
                      label="Weight"
                      unit="kg"
                      value={weight}
                      onChange={setWeight}
                      disabled={saving}
                      {...WEIGHT_RANGE}
                    />
                    <StepperField
                      label="Height"
                      unit="cm"
                      value={height}
                      onChange={setHeight}
                      disabled={saving}
                      {...HEIGHT_RANGE}
                    />
                  </View>
                </Section>

                {/* ── Goal ── */}
                <Section
                  title="Goal"
                  footer={
                    fitnessChanged
                      ? 'Saving body or goal changes will refresh your workout and diet plans.'
                      : undefined
                  }
                >
                  <View style={s.field}>
                    <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>What are you training for?</Text>
                    <View style={s.chips} accessibilityRole="radiogroup">
                      {GOALS.map((g) => (
                        <AnimatedChip
                          key={g.key}
                          label={g.label}
                          selected={goal === g.key}
                          onPress={() => setGoal(g.key)}
                          disabled={saving}
                        />
                      ))}
                    </View>
                  </View>
                </Section>
              </>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>

        <PhotoActionSheet
          visible={photoSheetOpen}
          name={trimmedName || user?.name}
          uri={previewUri}
          onChoose={pickPhoto}
          onRemove={removePhoto}
          onClose={() => setPhotoSheetOpen(false)}
        />
      </View>
    </Modal>
  );
};

/* ─────────────── Styles ─────────────── */

const INSET_X = 16;

// Same scale as Onboarding / auth forms: 8 between a label and its control,
// 16 between fields in a section, 24 between sections.
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

  content: { paddingHorizontal: SPACING.gutter, paddingTop: SPACING.lg, gap: SPACING.lg },

  avatarBlock: { alignItems: 'center', gap: SPACING.xs },
  photoLink: {
    minHeight: INPUT.hitTarget,
    paddingHorizontal: SPACING.md,
    justifyContent: 'center',
  },
  photoLinkText: { fontSize: FONT_SIZE.md, fontFamily: FONTS.bodySemi },

  section: { gap: SPACING.md },
  sectionTitle: { ...TYPOGRAPHY.heading, fontSize: 16 },
  footnote: { ...TYPOGRAPHY.caption, marginTop: -SPACING.sm },

  field: { gap: INPUT.labelGap },
  fieldLabel: INPUT_LABEL,
  fieldRow: { flexDirection: 'row', gap: SPACING.sm },

  stepper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: INPUT.height,
    borderRadius: INPUT.radius,
    borderWidth: INPUT.borderWidth,
    // Centres the 44pt targets vertically and horizontally inside the 54pt box.
    paddingHorizontal: (INPUT.height - INPUT.hitTarget) / 2 - INPUT.borderWidth,
  },
  stepBtn: {
    width: INPUT.hitTarget,
    height: INPUT.hitTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // tabular-nums so 2↔3-digit values never shift the glyphs.
  stepValue: {
    flex: 1,
    textAlign: 'center',
    fontSize: INPUT.fontSize,
    fontFamily: FONTS.bodySemi,
    fontVariant: ['tabular-nums'],
  },
  stepUnit: { fontSize: INPUT.fontSize, fontFamily: FONTS.body },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
});
