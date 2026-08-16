import React, { useState } from 'react';
import { Image, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { DARK_COLORS, FONTS, LIGHT_COLORS, RADIUS } from '../../config/theme';
import { useAuth } from '../../context/AuthContext';

const CLASENDRA_MARK = require('../../../assets/clasendra-logo.png');

interface Props {
  name?: string | null;
  logo?: string | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

const initialsOf = (name?: string | null): string => {
  const words = String(name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '';
  return words.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
};

/**
 * The gym's mark, wherever the app needs to look like the member's gym rather
 * than like Clasendra. Three tiers, because a tenant's logo is optional and a
 * remote image can always fail: uploaded logo → gym initials → Clasendra mark.
 * The last tier is only ever reached before the first login, when the device
 * doesn't know which gym it belongs to yet.
 */
export const GymLogo: React.FC<Props> = ({ name, logo, size = 80, style }) => {
  const { theme } = useAuth();
  const colors = theme === 'dark' ? DARK_COLORS : LIGHT_COLORS;
  const [failed, setFailed] = useState(false);

  const initials = initialsOf(name);
  const showImage = Boolean(logo) && !failed;

  return (
    <View
      style={[
        styles.box,
        {
          width: size,
          height: size,
          borderRadius: size * 0.28,
          backgroundColor: showImage ? colors.white : `${colors.primary}1F`,
          borderColor: colors.surfaceBorder,
          shadowColor: colors.primary,
        },
        style,
      ]}
    >
      {showImage ? (
        <Image
          source={{ uri: logo as string }}
          style={{ width: size, height: size, borderRadius: size * 0.28 }}
          resizeMode="cover"
          onError={() => setFailed(true)}
          accessibilityLabel={name ? `${name} logo` : 'Gym logo'}
        />
      ) : initials ? (
        <Text style={[styles.initials, { fontSize: size * 0.36, color: colors.primary }]}>
          {initials}
        </Text>
      ) : (
        <Image
          source={CLASENDRA_MARK}
          style={{ width: size * 0.82, height: size * 0.82 }}
          resizeMode="contain"
          accessibilityLabel="Clasendra"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 6,
  },
  initials: { fontFamily: FONTS.bodyExtra, letterSpacing: 0.5 },
});
