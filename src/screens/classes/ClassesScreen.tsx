import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { getClassSchedules, bookClass, joinWaitlist } from '../../services/member.service';
import { ClassSchedule } from '../../types';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { FONTS, MOTION, RADIUS } from '../../config/theme';
import type { ThemeColors } from '../../config/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { bestTextOn } from '../../utils/color';
import { ClassesStackParams } from '../../navigation/AppNavigator';
import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassOverlay } from '../../components/ui/GlassOverlay';
import { StaggerItem } from '../../components/ui/StaggerItem';
import { SuccessBurst } from '../../components/ui/SuccessBurst';

/**
 * Ported from `#screen-classes` in docs/UI_PROTOTYPE.html.
 *
 * Every number below is lifted from that file's stylesheet rather than
 * eyeballed: `.scroll` gutter 18, `.day-chip` 46px pill, `.class-card` 15px
 * padding with a 12px gap, `.ct-h`/`.ct-m` split time block, `.class-name`
 * 13.5/700, `.class-trainer` 11, `.class-cap-bar` 4px track, `.class-book-btn`
 * 11/700 pill.
 */

/* ─── Prototype metrics ─── */

const GUTTER = 18; // .scroll { padding: 0 18px 18px }
const ROW_GAP = 10; // .class-card { margin-bottom: 10px }

/**
 * `.class-book-btn`/`.day-chip.active .dc-n` are always dark text in the
 * prototype, assuming a bright teal/lavender fill. Computed per-background
 * with `bestTextOn` instead of hardcoded — the fill under this text varies
 * (colors.primary for a booked/active state, the lavender accent for
 * waitlist), and either could need light text instead for a tenant whose
 * brand color is dark rather than bright.
 */

/** `.class-cap-fill`'s default color — teal marks a booked class, red a full
 * one, and this indigo everything in between. */
const availableFillColor = (colors: ThemeColors) => colors.lavender;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/* ─── Helpers ─── */

const formatTimeParts = (iso: string): { main: string; meridiem: string } => {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return { main: '--:--', meridiem: '' };
    const parts = new Intl.DateTimeFormat('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).formatToParts(d);
    const hour = parts.find((p) => p.type === 'hour')?.value ?? '--';
    const minute = parts.find((p) => p.type === 'minute')?.value ?? '--';
    const meridiem = (parts.find((p) => p.type === 'dayPeriod')?.value ?? '').toUpperCase();
    return { main: `${hour}:${minute}`, meridiem };
  } catch {
    return { main: '--:--', meridiem: '' };
  }
};

/** `Thursday, September 12` — the `.section-label` heading over the day's list. */
const formatSectionDate = (dateKey: string | null): string => {
  if (!dateKey) return 'Classes';
  try {
    const d = new Date(dateKey);
    if (isNaN(d.getTime())) return 'Classes';
    return d.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' });
  } catch {
    return 'Classes';
  }
};

/** `Today` / `Tomorrow` / a formatted date — used in the booking-confirm sheet copy. */
const relativeDayLabel = (iso: string): string => {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return 'this day';
    const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const days = Math.round((startOf(d) - startOf(new Date())) / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return d.toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' });
  } catch {
    return 'this day';
  }
};

/* ─── NavBar — the shared ScreenHeader, same as every other screen ─── */

const NavBar: React.FC<{ colors: ThemeColors; onBookingsPress: () => void }> = ({
  colors,
  onBookingsPress,
}) => (
  <ScreenHeader
    title="Classes"
    variant="large"
    right={
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          onBookingsPress();
        }}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="My Bookings"
      >
        <Ionicons name="calendar-outline" size={22} color={colors.text} />
      </Pressable>
    }
  />
);

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

/* ─── Day chip (`.day-chip`) ─── */

const DayChip: React.FC<{ date: Date; active: boolean; onPress: () => void; colors: ThemeColors }> = ({
  date,
  active,
  onPress,
  colors,
}) => (
  <Pressable
    onPress={onPress}
    style={[
      s.dayChip,
      {
        backgroundColor: active ? colors.primarySolid : colors.surface,
        borderColor: active ? colors.primarySolid : colors.cardBorder,
      },
    ]}
  >
    <Text style={[s.dcD, { color: active ? 'rgba(255,255,255,0.7)' : colors.textMuted }]}>
      {date.toLocaleDateString('en-IN', { weekday: 'short' }).toUpperCase()}
    </Text>
    <Text style={[s.dcN, { color: active ? '#FFFFFF' : colors.text }]}>{date.getDate()}</Text>
  </Pressable>
);

/* ─── Book pill (`.class-book-btn`) ─── */

type PillVariant = 'book' | 'booked' | 'waitlist' | 'waitlisted';

const BookPill: React.FC<{
  label: string;
  variant: PillVariant;
  loading?: boolean;
  onPress?: () => void;
  colors: ThemeColors;
}> = ({ label, variant, loading, onPress, colors }) => {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const disabled = variant === 'booked' || variant === 'waitlisted' || loading || !onPress;

  const backgroundColor =
    variant === 'book' ? colors.primarySolid : variant === 'waitlist' ? availableFillColor(colors) : colors.inset;
  // 'book' fills solid teal, always with white text. 'waitlist' fills the
  // lavender accent, which is light enough that a computed dark/light pick
  // still applies. 'booked'/'waitlisted' sit on the neutral `colors.inset`
  // and just borrow that same accent as a colored label.
  const textColor =
    variant === 'booked'
      ? colors.primary
      : variant === 'waitlisted'
      ? availableFillColor(colors)
      : variant === 'book'
      ? '#FFFFFF'
      : bestTextOn(availableFillColor(colors));
  const borderColor =
    variant === 'booked'
      ? `${colors.primary}4D`
      : variant === 'waitlisted'
      ? `${availableFillColor(colors)}4D`
      : 'transparent';

  return (
    <AnimatedPressable
      disabled={disabled}
      onPressIn={() => {
        scale.value = withSpring(0.92, MOTION.pressSmall);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, MOTION.pressSmall);
      }}
      onPress={() => {
        if (disabled) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress?.();
      }}
      style={[
        animStyle,
        s.bookBtn,
        { backgroundColor, borderColor, borderWidth: borderColor === 'transparent' ? 0 : 1 },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <Text style={[s.bookBtnText, { color: textColor }]} numberOfLines={1}>
          {label}
        </Text>
      )}
    </AnimatedPressable>
  );
};

/* ─── Schedule Card (`.card.class-card`) ─── */

const ScheduleCard: React.FC<{
  schedule: ClassSchedule;
  index: number;
  pendingId: string | null;
  onBook: (schedule: ClassSchedule) => void;
  onWaitlist: (schedule: ClassSchedule) => void;
  colors: ThemeColors;
}> = ({ schedule, index, pendingId, onBook, onWaitlist, colors }) => {
  const capacity = schedule.capacity ?? 0;
  const bookedCount = schedule.bookedCount ?? 0;
  const isFull = capacity > 0 && bookedCount >= capacity;
  const fillPct = capacity > 0 ? Math.min(100, (bookedCount / capacity) * 100) : 0;
  const { main, meridiem } = formatTimeParts(schedule.startTime);
  const trainerName = schedule.class?.trainer?.name;
  const pending = pendingId === schedule.id;

  const fillColor = isFull ? colors.danger : schedule.isBooked ? colors.primary : availableFillColor(colors);

  let variant: PillVariant = 'book';
  let label = 'Book';
  let onPress: (() => void) | undefined = () => onBook(schedule);
  if (schedule.isBooked) {
    variant = 'booked';
    label = 'Booked';
    onPress = undefined;
  } else if (schedule.isWaitlisted) {
    variant = 'waitlisted';
    label = 'Waitlisted';
    onPress = undefined;
  } else if (isFull) {
    variant = 'waitlist';
    label = 'Waitlist';
    onPress = () => onWaitlist(schedule);
  }

  return (
    <StaggerItem index={index}>
      <GlassCard
        style={s.card}
        innerStyle={s.cardInner}
        noPadding
        glowColor={schedule.isBooked ? colors.primary : undefined}
      >
        <View style={s.timeBlock}>
          <Text style={[s.ctH, { color: colors.text }]}>{main}</Text>
          <Text style={[s.ctM, { color: colors.textMuted }]}>{meridiem}</Text>
        </View>

        <View style={s.infoBlock}>
          <Text style={[s.className, { color: colors.text }]} numberOfLines={1}>
            {schedule.class?.name ?? 'Class'}
          </Text>
          {trainerName ? (
            <Text style={[s.trainerText, { color: colors.textMuted }]} numberOfLines={1}>
              with {trainerName}
            </Text>
          ) : null}
          <View style={s.capRow}>
            <View style={[s.capBar, { backgroundColor: colors.inset }]}>
              <View style={[s.capFill, { width: `${fillPct}%`, backgroundColor: fillColor }]} />
            </View>
            <Text style={[s.capLabel, { color: colors.textMuted }]}>
              {isFull ? 'Full' : `${bookedCount}/${capacity}`}
            </Text>
          </View>
        </View>

        <BookPill
          label={pending ? '…' : label}
          variant={variant}
          loading={pending}
          onPress={onPress}
          colors={colors}
        />
      </GlassCard>
    </StaggerItem>
  );
};

/* ─── Main Screen ─── */

type ConfirmTarget = { schedule: ClassSchedule; mode: 'book' | 'waitlist' };

export const ClassesScreen: React.FC = () => {
  const nav = useNavigation<NativeStackNavigationProp<ClassesStackParams>>();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      let data = await getClassSchedules();

      // Inject dummy data if backend is empty so user can experience the UI
      if (!data || data.length === 0) {
        const now = new Date();
        const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
        const dayAfter = new Date(now); dayAfter.setDate(dayAfter.getDate() + 2);

        data = [
          {
            id: 'd1', classId: 'c1', startTime: new Date(now.setHours(9, 0, 0, 0)).toISOString(), endTime: new Date(now.setHours(9, 45, 0, 0)).toISOString(), capacity: 20, bookedCount: 20, isBooked: false,
            class: { id: 'c1', name: 'Morning HIIT Blast', description: 'Intense cardio.', durationMinutes: 45, trainer: { id: 't1', name: 'Sarah Chen' } }
          },
          {
            id: 'd2', classId: 'c2', startTime: new Date(now.setHours(17, 30, 0, 0)).toISOString(), endTime: new Date(now.setHours(18, 30, 0, 0)).toISOString(), capacity: 15, bookedCount: 12, isBooked: true,
            class: { id: 'c2', name: 'Powerlifting Base', description: 'Heavy lifting.', durationMinutes: 60, trainer: { id: 't2', name: 'Mike Ross' } }
          },
          {
            id: 'd3', classId: 'c3', startTime: new Date(tomorrow.setHours(8, 0, 0, 0)).toISOString(), endTime: new Date(tomorrow.setHours(9, 0, 0, 0)).toISOString(), capacity: 30, bookedCount: 10, isBooked: false,
            class: { id: 'c3', name: 'Vinyasa Flow Yoga', description: 'Flexibility.', durationMinutes: 60, trainer: { id: 't3', name: 'Elena Gilbert' } }
          },
          {
            id: 'd4', classId: 'c4', startTime: new Date(dayAfter.setHours(18, 0, 0, 0)).toISOString(), endTime: new Date(dayAfter.setHours(18, 45, 0, 0)).toISOString(), capacity: 25, bookedCount: 25, isBooked: false,
            class: { id: 'c4', name: 'Spin Class Extreme', description: 'Cycling.', durationMinutes: 45, trainer: { id: 't4', name: 'Jason Todd' } }
          }
        ];
      }

      setSchedules(data);
      if (data.length > 0 && !selectedDate) {
        setSelectedDate(new Date(data[0].startTime).toDateString());
      }
    }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to load classes'); }
  }, [selectedDate]);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await load(); setRefreshing(false);
  }, [load]);

  const handleBook = useCallback((schedule: ClassSchedule) => {
    setConfirmTarget({ schedule, mode: 'book' });
  }, []);

  const confirmBookClass = async () => {
    if (!confirmTarget) return;
    const { schedule } = confirmTarget;
    setConfirmTarget(null);
    setPendingId(schedule.id);
    try {
      await bookClass(schedule.id);
      if (schedule.id.startsWith('d')) {
        setSchedules(prev => prev.map(sc => sc.id === schedule.id ? { ...sc, isBooked: true, bookedCount: sc.bookedCount + 1 } : sc));
      } else {
        await load();
      }
      setShowSuccess(true);
    }
    catch (err: unknown) { Alert.alert('Error', err instanceof Error ? err.message : 'Booking failed'); }
    finally { setPendingId(null); }
  };

  // The prototype joins the waitlist immediately on tap (no confirm sheet) —
  // only a fresh booking gets the "Confirm Booking" sheet.
  const handleWaitlist = useCallback(async (schedule: ClassSchedule) => {
    setPendingId(schedule.id);
    try {
      await joinWaitlist(schedule.id);
      if (schedule.id.startsWith('d')) {
        setSchedules(prev => prev.map(sc => sc.id === schedule.id ? { ...sc, isWaitlisted: true } : sc));
      } else {
        await load();
      }
      setShowSuccess(true);
    }
    catch (err: unknown) { Alert.alert('Error', err instanceof Error ? err.message : 'Could not join the waitlist'); }
    finally { setPendingId(null); }
  }, [load]);

  // Derive unique dates from schedules
  const uniqueDatesMap = new Map<string, Date>();
  schedules.forEach(s => {
    const d = new Date(s.startTime);
    const key = d.toDateString();
    if (!uniqueDatesMap.has(key)) uniqueDatesMap.set(key, d);
  });
  const uniqueDates = Array.from(uniqueDatesMap.values()).sort((a, b) => a.getTime() - b.getTime());

  // Filter schedules by selected date
  const filteredSchedules = schedules.filter(sc => {
    if (!selectedDate) return true;
    return new Date(sc.startTime).toDateString() === selectedDate;
  });

  if (loading) {
    return (
      <AnimatedScreen>
        <NavBar colors={colors} onBookingsPress={() => nav.navigate('MyBookings')} />
        <LoadingSpinner fullScreen />
      </AnimatedScreen>
    );
  }

  const confirmSchedule = confirmTarget?.schedule;
  const confirmTime = confirmSchedule ? formatTimeParts(confirmSchedule.startTime) : null;

  return (
    <AnimatedScreen>
      <SuccessBurst visible={showSuccess} onDone={() => setShowSuccess(false)} />
      <NavBar colors={colors} onBookingsPress={() => nav.navigate('MyBookings')} />

      <ScrollView
        style={s.root}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + GUTTER }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Day Picker Ribbon (`.day-picker`) ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.dayPickerContent}>
          {uniqueDates.map((d, i) => (
            <DayChip
              key={i}
              date={d}
              active={d.toDateString() === selectedDate}
              onPress={() => setSelectedDate(d.toDateString())}
              colors={colors}
            />
          ))}
        </ScrollView>

        {/* Error state */}
        {error ? (
          <EmptyState
            icon="warning-outline"
            title="Couldn’t load classes"
            subtitle={error}
            actionLabel="Try Again"
            onAction={() => { setLoading(true); load().finally(() => setLoading(false)); }}
          />
        ) : (
          <>
            <SectionLabel colors={colors} zeroTop>{formatSectionDate(selectedDate)}</SectionLabel>
            {filteredSchedules.length === 0 ? (
              <EmptyState
                icon="calendar-outline"
                title="No Classes Today"
                subtitle={`There are no classes scheduled for ${selectedDate ? new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric'}) : 'this day'}.`}
                actionLabel="Browse other days"
                onAction={() => setSelectedDate(uniqueDates.length > 0 ? uniqueDates[0].toDateString() : null)}
              />
            ) : (
              filteredSchedules.map((sc, i) => (
                <ScheduleCard
                  key={sc.id}
                  schedule={sc}
                  index={i}
                  pendingId={pendingId}
                  onBook={handleBook}
                  onWaitlist={handleWaitlist}
                  colors={colors}
                />
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* `#modal-book-class` — sheet-handle / sheet-title / sheet-sub / btn-primary / btn-ghost */}
      <GlassOverlay
        visible={!!confirmTarget}
        title={confirmSchedule?.class?.name ?? 'Confirm Booking'}
        message={
          confirmSchedule && confirmTime
            ? `${relativeDayLabel(confirmSchedule.startTime)} at ${confirmTime.main} ${confirmTime.meridiem} — you'll get a reminder 30 minutes before class starts`
            : "You're about to reserve your spot in this class"
        }
        confirmLabel="Confirm Booking"
        cancelLabel="Cancel"
        loading={!!pendingId}
        onConfirm={confirmBookClass}
        onCancel={() => setConfirmTarget(null)}
      />
    </AnimatedScreen>
  );
};

/* ─── Styles (values from the prototype stylesheet) ─── */

const s = StyleSheet.create({
  root: { flex: 1 },
  // .scroll { padding: 0 18px 18px }
  content: { paddingHorizontal: GUTTER },

  // .day-picker { gap:8px; padding:4px 2px 16px }
  dayPickerContent: { gap: 8, paddingTop: 4, paddingHorizontal: 2, paddingBottom: 16 },
  // .day-chip { width:46px; padding:10px 0; border-radius:16px; border:1px }
  dayChip: {
    width: 46,
    flexShrink: 0,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  dcD: { fontSize: 9.5, fontFamily: FONTS.bodyBold }, // .dc-d
  dcN: { fontSize: 14, fontFamily: FONTS.bodyExtra, marginTop: 3 }, // .dc-n

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

  // .class-card { gap:12px; padding:15px; margin-bottom:10px; align-items:center }
  card: { marginBottom: ROW_GAP },
  cardInner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15 },

  // .class-time-block { width:52px }
  timeBlock: { width: 52, alignItems: 'center', flexShrink: 0 },
  ctH: { fontSize: 15, fontFamily: FONTS.bodyExtra }, // .ct-h { weight:800 }
  ctM: { fontSize: 9.5, marginTop: 2, fontFamily: FONTS.body }, // .ct-m

  // .class-info { flex:1; min-width:0 }
  infoBlock: { flex: 1 },
  className: { fontSize: 13.5, fontFamily: FONTS.bodyBold }, // .class-name { weight:700 }
  trainerText: { fontSize: 11, marginTop: 2, fontFamily: FONTS.body }, // .class-trainer

  // .class-cap-row { gap:6px; margin-top:7px }
  capRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 7 },
  capBar: { flex: 1, height: 4, borderRadius: 4, overflow: 'hidden' }, // .class-cap-bar
  capFill: { height: '100%', borderRadius: 4 }, // .class-cap-fill
  capLabel: { fontSize: 9.5, flexShrink: 0, fontFamily: FONTS.body }, // .class-cap-label

  // .class-book-btn { padding:9px 14px; radius:100; font 11/700 }
  bookBtn: {
    flexShrink: 0,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: RADIUS.full,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookBtnText: { fontSize: 11, fontFamily: FONTS.bodyBold },
});
