import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getMyBookings, cancelBooking } from '../../services/member.service';
import { ClassBooking } from '../../types';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { FONTS, RADIUS } from '../../config/theme';
import { solidFillFor } from '../../utils/color';
import { useThemeColors } from '../../hooks/useThemeColors';
import type { ThemeColors } from '../../config/theme';
import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { GlassCard } from '../../components/ui/GlassCard';
import { StaggerItem } from '../../components/ui/StaggerItem';
import { GlassOverlay } from '../../components/ui/GlassOverlay';

/**
 * Ported from `#screen-bookings` in docs/UI_PROTOTYPE.html.
 *
 * `.scroll` gutter 18, `.section-label` "Upcoming" / "Past" (10.5/700
 * uppercase), `.booking-row` 14/15 padding with a 9px rhythm, `.checkin-icon`
 * 40×40 r12, `.checkin-name` 13.5/600, `.checkin-meta` 11.5, `.booking-status`
 * 9.5/700 uppercase pill, past rows at 0.75 opacity.
 *
 * The screen keeps the native stack header (`ClassSchedules` sets
 * `headerShown:false` but `MyBookings` does not — that's set in
 * AppNavigator.tsx, out of scope here), so there's no custom navbar; the
 * prototype's back-arrow + "My Bookings" title is already provided by that
 * header.
 */

const GUTTER = 18; // .scroll { padding: 0 18px 18px }
const ROW_GAP = 9; // .booking-row { margin-bottom: 9px }
/** rgba(color, 0.14) wash behind `.checkin-icon` / `.booking-status` — same ratio as `#screen-checkins`. */
const WASH = '24';

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

/** `Today` / `Tomorrow` / `Yesterday` / `Mon` / `Last Fri` — matches the four sample rows in the prototype. */
const relativeDayLabel = (iso: string): string => {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const days = Math.round((startOf(d) - startOf(new Date())) / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days === -1) return 'Yesterday';
    if (days > 1 && days < 7) return d.toLocaleDateString('en-IN', { weekday: 'short' });
    if (days < -1 && days > -7) return `Last ${d.toLocaleDateString('en-IN', { weekday: 'short' })}`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch {
    return '—';
  }
};

type StatusKey = ClassBooking['status'];

/**
 * Colors/icons per the prototype's four sample rows: Confirmed → teal,
 * Attended → neutral (surface-2 / text-muted, NOT a tint — the prototype's
 * "Attended" row has no background override), Cancelled → red. NO_SHOW and
 * WAITLISTED aren't in the mockup; they're extended sensibly (danger /
 * accent) since the real API can return them.
 */
const getStatusConfig = (colors: ThemeColors): Record<StatusKey, { color: string; icon: keyof typeof Ionicons.glyphMap; label: string; neutral?: boolean }> => ({
  CONFIRMED: { color: colors.primary, icon: 'checkmark-circle-outline', label: 'Confirmed' },
  ATTENDED: { color: colors.textSecondary, icon: 'checkmark-done-circle', label: 'Attended', neutral: true },
  NO_SHOW: { color: colors.danger, icon: 'close-circle-outline', label: 'No Show' },
  CANCELLED: { color: colors.danger, icon: 'close-circle-outline', label: 'Cancelled' },
  WAITLISTED: { color: colors.accent, icon: 'hourglass-outline', label: 'Waitlisted' },
});

const isUpcoming = (status: StatusKey) => status === 'CONFIRMED' || status === 'WAITLISTED';

/* ─── Section label (`.section-label`) ─── */

const SectionLabel: React.FC<{ children: string; colors: ThemeColors; zeroTop?: boolean }> = ({
  children,
  colors,
  zeroTop,
}) => (
  <Text style={[s.sectionLabel, { color: colors.textMuted }, zeroTop && s.sectionLabelZero]}>
    {children}
  </Text>
);

/* ─── Booking row (`.card.booking-row`) ─── */

const BookingRow: React.FC<{
  booking: ClassBooking;
  index: number;
  isPast: boolean;
  colors: ThemeColors;
  onCancelPress: (b: ClassBooking) => void;
}> = ({ booking, index, isPast, colors, onCancelPress }) => {
  const cfg = getStatusConfig(colors)[booking.status] ?? getStatusConfig(colors).CONFIRMED;
  const canCancel = booking.status === 'CONFIRMED';

  const card = (
    <GlassCard style={[s.row, isPast && s.rowPast]} innerStyle={s.rowInner}>
      <View
        style={[
          s.checkinIcon,
          { backgroundColor: cfg.neutral ? colors.inset : `${cfg.color}${WASH}` },
        ]}
      >
        <Ionicons name={cfg.icon} size={17} color={cfg.color} />
      </View>

      <View style={s.rowCopy}>
        <Text style={[s.checkinName, { color: colors.text }]} numberOfLines={1}>
          {booking.schedule.class.name}
        </Text>
        <Text style={[s.checkinMeta, { color: colors.textSecondary }]} numberOfLines={1}>
          {relativeDayLabel(booking.schedule.startTime)} · {formatTime(booking.schedule.startTime)}
        </Text>
      </View>

      {/* Solid fill + white text: a 9.5px coloured label on a faint wash of
          the same colour was too low-contrast to read. `solidFillFor` deepens
          each status colour just enough for white to clear AA. */}
      <View style={[s.statusPill, { backgroundColor: cfg.neutral ? colors.inset : solidFillFor(cfg.color) }]}>
        <Text style={[s.statusText, { color: cfg.neutral ? colors.textSecondary : '#FFFFFF' }]}>{cfg.label}</Text>
      </View>
    </GlassCard>
  );

  // The prototype has no cancel affordance drawn in the row itself (it's a
  // static mock); tapping a still-confirmed booking is how the existing
  // cancel flow is kept reachable without adding a button the design doesn't
  // show.
  // `reflow`: cancelling moves this exact row from Upcoming to Past (same
  // `booking.id` key, so it's a reposition, not a remount) — without it the
  // row and its now-shifted siblings would snap to their new spot in one frame.
  if (canCancel) {
    return (
      <StaggerItem index={index} reflow>
        <Pressable
          onPress={() => onCancelPress(booking)}
          accessibilityRole="button"
          accessibilityLabel={`Cancel booking for ${booking.schedule.class.name}`}
        >
          {card}
        </Pressable>
      </StaggerItem>
    );
  }

  return (
    <StaggerItem index={index} reflow>
      {card}
    </StaggerItem>
  );
};

export const BookingsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const navigation = useNavigation();

  const [bookings, setBookings] = useState<ClassBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<ClassBooking | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await getMyBookings();
      setBookings(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load bookings');
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setCancellingId(cancelTarget.id);
    try {
      await cancelBooking(cancelTarget.id);
      await load();
      setCancelTarget(null);
    } catch (err: unknown) {
      setCancelTarget(null);
      Alert.alert('Error', err instanceof Error ? err.message : 'Cancel failed');
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) {
    return (
      <AnimatedScreen>
        <ScreenHeader title="My Bookings" onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined} />
        <LoadingSpinner fullScreen />
      </AnimatedScreen>
    );
  }

  const upcoming = bookings.filter((b) => isUpcoming(b.status));
  const past = bookings.filter((b) => !isUpcoming(b.status));

  return (
    <AnimatedScreen>
      <ScreenHeader
        title="My Bookings"
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      />
      <GlassOverlay
        visible={!!cancelTarget}
        title="Cancel Booking"
        message={`Cancel your booking for ${cancelTarget?.schedule.class.name ?? 'this class'}?`}
        confirmLabel="Yes, Cancel"
        cancelLabel="Keep Booking"
        destructive
        loading={!!cancellingId}
        onConfirm={confirmCancel}
        onCancel={() => setCancelTarget(null)}
      />

      <ScrollView
        style={styles.root}
        contentContainerStyle={[styles.content, { paddingTop: 12, paddingBottom: insets.bottom + GUTTER }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <EmptyState
            icon="warning-outline"
            title="Couldn’t load your bookings"
            subtitle={error}
            actionLabel="Try Again"
            onAction={() => { setLoading(true); load().finally(() => setLoading(false)); }}
          />
        ) : bookings.length === 0 ? (
          <EmptyState
            icon="bookmark-outline"
            title="No classes booked yet"
            subtitle="Reserve a spot in a class and it’ll wait for you here, with a reminder before it starts."
            actionLabel="Browse Classes"
            onAction={() => navigation.dispatch(CommonActions.navigate({ name: 'MainTabs', params: { screen: 'Classes' } }))}
          />
        ) : (
          <>
            {upcoming.length > 0 && (
              <>
                <SectionLabel colors={colors} zeroTop>Upcoming</SectionLabel>
                {upcoming.map((b, i) => (
                  <BookingRow
                    key={b.id}
                    booking={b}
                    index={i}
                    isPast={false}
                    colors={colors}
                    onCancelPress={setCancelTarget}
                  />
                ))}
              </>
            )}
            {past.length > 0 && (
              <>
                <SectionLabel colors={colors} zeroTop={upcoming.length === 0}>Past</SectionLabel>
                {past.map((b, i) => (
                  <BookingRow
                    key={b.id}
                    booking={b}
                    index={upcoming.length + i}
                    isPast
                    colors={colors}
                    onCancelPress={setCancelTarget}
                  />
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>
    </AnimatedScreen>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  // .scroll { padding: 0 18px 18px }
  content: { paddingHorizontal: GUTTER },
});

const s = StyleSheet.create({
  // .section-label { font-size:10.5; weight:700; letter-spacing:.08em; margin:14px 2px 10px }
  sectionLabel: {
    fontSize: 10.5,
    fontFamily: FONTS.bodyBold,
    letterSpacing: 0.84,
    textTransform: 'uppercase',
    marginTop: 14,
    marginBottom: 10,
    marginHorizontal: 2,
  },
  sectionLabelZero: { marginTop: 0 },

  // .booking-row { gap:12px; padding:14px 15px; margin-bottom:9px }
  row: { marginBottom: ROW_GAP },
  rowPast: { opacity: 0.75 },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 15,
  },
  rowCopy: { flex: 1 },

  // .checkin-icon { 40×40; radius 12 }
  checkinIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkinName: { fontSize: 13.5, fontFamily: FONTS.bodySemi }, // .checkin-name { weight:600 }
  checkinMeta: { fontSize: 11.5, fontFamily: FONTS.body, marginTop: 2 }, // .checkin-meta

  // .booking-status { 9.5/700; padding:4px 9px; radius:100; uppercase; .03em }
  statusPill: {
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: RADIUS.full,
  },
  statusText: {
    fontSize: 9.5,
    fontFamily: FONTS.bodyBold,
    textTransform: 'uppercase',
    letterSpacing: 0.29,
  },
});
