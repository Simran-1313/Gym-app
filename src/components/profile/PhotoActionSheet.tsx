import React from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { AnimatedButton } from '../ui/AnimatedButton';
import { FitnessAvatar } from '../ui/FitnessAvatar';
import { FONTS, RADIUS } from '../../config/theme';
import { useAuth } from '../../context/AuthContext';
import { useThemeColors } from '../../hooks/useThemeColors';

interface Props {
  visible: boolean;
  name?: string | null;
  uri?: string | null;
  onChoose: () => void;
  onRemove: () => void;
  onClose: () => void;
}

/**
 * Photo actions for Edit Profile, in the same bottom-sheet language as
 * GlassOverlay (scrim, overlay surface, grab handle, spring up from the
 * bottom edge) instead of the system alert, which read as a different app.
 * Renders inside the Edit Profile modal, so it's positioned absolutely
 * rather than opening a Modal of its own.
 */
export const PhotoActionSheet: React.FC<Props> = ({ visible, name, uri, onChoose, onRemove, onClose }) => {
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  React.useEffect(() => {
    if (!visible) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  if (!visible) return null;

  const run = (fn: () => void) => () => {
    Haptics.selectionAsync().catch(() => {});
    onClose();
    fn();
  };

  return (
    <View style={s.host} pointerEvents="box-none">
      <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(180)} style={StyleSheet.absoluteFill}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(0,0,0,0.55)' : 'rgba(15,23,42,0.35)' }]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
        />
      </Animated.View>

      <Animated.View
        entering={SlideInDown.springify().damping(22).stiffness(240)}
        exiting={SlideOutDown.springify().damping(26).stiffness(300)}
        style={[
          s.sheet,
          { backgroundColor: colors.overlay, borderColor: colors.overlayBorder, paddingBottom: insets.bottom + 26 },
        ]}
      >
        <View style={[s.handle, { backgroundColor: colors.overlayBorder }]} />

        <View style={s.header}>
          <FitnessAvatar name={name} uri={uri} size={48} />
          <View style={s.headerText}>
            <Text style={[s.title, { color: colors.text }]}>Profile Photo</Text>
            <Text style={[s.sub, { color: colors.textMuted }]}>
              {uri ? 'Shown on your profile, in chat and to your trainer.' : 'Add a photo so your trainer knows it’s you.'}
            </Text>
          </View>
        </View>

        <View style={[s.group, { backgroundColor: colors.inset, borderColor: colors.cardBorder }]}>
          <ActionRow
            icon="images-outline"
            label={uri ? 'Choose New Photo' : 'Choose from Library'}
            color={colors.text}
            iconColor={colors.primary}
            onPress={run(onChoose)}
          />
          {uri ? (
            <ActionRow
              icon="trash-outline"
              label="Remove Photo"
              color={colors.danger}
              iconColor={colors.danger}
              onPress={run(onRemove)}
              divider={colors.cardBorder}
            />
          ) : null}
        </View>

        <AnimatedButton label="Cancel" variant="ghost" onPress={onClose} />
      </Animated.View>
    </View>
  );
};

const ActionRow: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  iconColor: string;
  onPress: () => void;
  divider?: string;
}> = ({ icon, label, color, iconColor, onPress, divider }) => {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        s.row,
        divider && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: divider },
        pressed && { backgroundColor: colors.cardPressed },
      ]}
    >
      <View style={[s.rowIcon, { backgroundColor: `${iconColor}1F` }]}>
        <Ionicons name={icon} size={17} color={iconColor} />
      </View>
      <Text style={[s.rowLabel, { color }]}>{label}</Text>
    </Pressable>
  );
};

const s = StyleSheet.create({
  host: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, justifyContent: 'flex-end' },
  sheet: {
    width: '100%',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 18,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: -12 },
    elevation: 24,
  },
  handle: { width: 36, height: 4, borderRadius: 4, alignSelf: 'center', marginTop: 6, marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  headerText: { flex: 1 },
  title: { fontFamily: FONTS.bodyExtra, fontSize: 16, marginBottom: 2 },
  sub: { fontFamily: FONTS.body, fontSize: 12.5, lineHeight: 17 },
  group: { borderRadius: RADIUS.md, borderWidth: 1, overflow: 'hidden', marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, height: 54 },
  rowIcon: { width: 30, height: 30, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontFamily: FONTS.bodySemi, fontSize: 14.5 },
});
