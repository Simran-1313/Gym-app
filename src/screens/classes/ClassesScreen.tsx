import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { getClassSchedules, bookClass } from '../../services/member.service';
import { ClassSchedule } from '../../types';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { DARK_COLORS, LIGHT_COLORS, FONT_SIZE, RADIUS, SPACING } from '../../config/theme';
import { ClassesStackParams } from '../../navigation/AppNavigator';
import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { GlassCard } from '../../components/ui/GlassCard';
import { AnimatedButton } from '../../components/ui/AnimatedButton';
import { StaggerItem } from '../../components/ui/StaggerItem';
import { SuccessBurst } from '../../components/ui/SuccessBurst';
import { useAuth } from '../../context/AuthContext';

/* ─── Helpers ─── */

const safeFormatTime = (iso: string): string => {
  try { const d = new Date(iso); return isNaN(d.getTime()) ? '—' : d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }); }
  catch { return '—'; }
};

const safeFormatDay = (iso: string): string => {
  try { const d = new Date(iso); return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }); }
  catch { return '—'; }
};

const safeFormatMonth = (iso: string): string => {
  try { const d = new Date(iso); return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { month: 'short' }); }
  catch { return '—'; }
};

const safeFormatDayNum = (iso: string): string => {
  try { const d = new Date(iso); return isNaN(d.getTime()) ? '—' : d.getDate().toString(); }
  catch { return '—'; }
};

/* ─── Schedule Card ─── */

const ScheduleCard: React.FC<{
  schedule: ClassSchedule;
  onBook: (id: string) => void;
  booking: boolean;
  index: number;
}> = ({ schedule, onBook, booking, index }) => {
  const capacity = schedule.capacity ?? 0;
  const bookedCount = schedule.bookedCount ?? 0;
  const spotsLeft = Math.max(0, capacity - bookedCount);
  const isFull = spotsLeft <= 0;
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;
  const fillPct = capacity > 0 ? Math.min(100, (bookedCount / capacity) * 100) : 0;

  return (
    <StaggerItem index={index}>
      <GlassCard glowColor={schedule.isBooked ? colors.success : colors.primary} style={s.card} noPadding>
        <View style={s.cardBody}>
          {/* Date block */}
          <View style={[s.dateBlock, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)' }]}>
            <Text style={[s.dateMonth, { color: colors.primary }]}>{safeFormatMonth(schedule.startTime)}</Text>
            <Text style={[s.dateNum, { color: colors.text }]}>{safeFormatDayNum(schedule.startTime)}</Text>
          </View>

          {/* Info */}
          <View style={s.infoBlock}>
            <Text style={[s.className, { color: colors.text }]} numberOfLines={1}>{schedule.class?.name ?? 'Class'}</Text>
            <View style={s.metaRow}>
              <Ionicons name="time-outline" size={13} color={colors.textMuted} />
              <Text style={[s.metaText, { color: colors.textSecondary }]}>
                {safeFormatTime(schedule.startTime)} • {schedule.class?.durationMinutes ?? 0}m
              </Text>
            </View>
            {schedule.class?.trainer && (
              <View style={s.metaRow}>
                <Ionicons name="person-outline" size={13} color={colors.textMuted} />
                <Text style={[s.metaText, { color: colors.textSecondary }]}>{schedule.class.trainer.name}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Capacity bar */}
        <View style={[s.capacitySection, { borderTopColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }]}>
          <View style={s.capacityRow}>
            <View style={s.capacityInfo}>
              <View style={[s.capacityBarBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                <View style={[s.capacityBarFill, {
                  width: `${fillPct}%`,
                  backgroundColor: isFull ? colors.danger : colors.primary,
                }]} />
              </View>
              <Text style={[s.spotsText, { color: isFull ? colors.danger : colors.textSecondary }]}>
                {isFull ? 'Full' : `${spotsLeft} of ${capacity} spots left`}
              </Text>
            </View>

            {schedule.isBooked ? (
              <View style={[s.bookedBadge, { backgroundColor: `${colors.success}15`, borderColor: `${colors.success}30` }]}>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                <Text style={[s.bookedText, { color: colors.success }]}>Booked</Text>
              </View>
            ) : (
              <AnimatedButton
                label={isFull ? 'Class Full' : 'Book Now'}
                variant={isFull ? "secondary" : "primary"}
                onPress={() => onBook(schedule.id)}
                disabled={isFull || booking}
                loading={booking}
                style={s.bookBtn}
              />
            )}
          </View>
        </View>
      </GlassCard>
    </StaggerItem>
  );
};

/* ─── Main Screen ─── */

export const ClassesScreen: React.FC = () => {
  const nav = useNavigation<NativeStackNavigationProp<ClassesStackParams>>();
  const insets = useSafeAreaInsets();
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
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

  const handleBook = useCallback(async (scheduleId: string) => {
    Alert.alert('Confirm Booking', 'Book this class?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Book',
        onPress: async () => {
          setBookingId(scheduleId);
          try { await bookClass(scheduleId); await load(); setShowSuccess(true); }
          catch (err: unknown) { Alert.alert('Error', err instanceof Error ? err.message : 'Booking failed'); }
          finally { setBookingId(null); }
        },
      },
    ]);
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
  const filteredSchedules = schedules.filter(s => {
    if (!selectedDate) return true;
    return new Date(s.startTime).toDateString() === selectedDate;
  });

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <AnimatedScreen>
      <SuccessBurst visible={showSuccess} onDone={() => setShowSuccess(false)} />
      <ScrollView
        style={s.root}
        contentContainerStyle={[s.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 110 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        showsVerticalScrollIndicator={false}
      >
        {/* Inline page title */}
        <Animated.View entering={FadeInUp.duration(350)} style={s.pageHeader}>
          <Text style={[s.pageTitle, { color: colors.text }]}>Classes</Text>
          <Text style={[s.pageSubtitle, { color: colors.textSecondary }]}>Browse & book upcoming sessions</Text>
        </Animated.View>

        {/* Bookings shortcut */}
        <Animated.View entering={FadeInUp.duration(350).delay(60)}>
          <AnimatedButton
            label="View My Bookings"
            variant="secondary"
            onPress={() => nav.navigate('MyBookings')}
            icon={<Ionicons name="calendar-outline" size={16} color={isDark ? '#FFF' : colors.primary} />}
          />
        </Animated.View>

        {/* ── Day Picker Ribbon ── */}
        <Animated.View entering={FadeInUp.duration(350).delay(100)}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.dayPickerContent}>
            {uniqueDates.map((d, i) => {
              const isSelected = d.toDateString() === selectedDate;
              return (
                <Pressable
                  key={i}
                  onPress={() => setSelectedDate(d.toDateString())}
                  style={[
                    s.dayBubble,
                    { backgroundColor: isSelected ? colors.primary : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)') },
                    isSelected && s.dayBubbleActive
                  ]}
                >
                  <Text style={[s.dayBubbleName, { color: isSelected ? '#FFF' : colors.textSecondary }]}>
                    {d.toLocaleDateString('en-IN', { weekday: 'short' })}
                  </Text>
                  <Text style={[s.dayBubbleNum, { color: isSelected ? '#FFF' : colors.text }]}>
                    {d.getDate()}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* Error state */}
        {error ? (
          <EmptyState
            icon="warning-outline"
            title="Oops, something went wrong!"
            subtitle={error}
            actionLabel="Try Again"
            onAction={() => { setLoading(true); load().finally(() => setLoading(false)); }}
          />
        ) : filteredSchedules.length === 0 ? (
          <EmptyState
            icon="calendar-outline"
            title="No Classes Today"
            subtitle={`There are no classes scheduled for ${selectedDate ? new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric'}) : 'this day'}.`}
            actionLabel="Browse other days"
            onAction={() => setSelectedDate(uniqueDates.length > 0 ? uniqueDates[0].toDateString() : null)}
          />
        ) : (
          <>
            {/* Schedule count */}
            <Text style={[s.countLabel, { color: colors.textMuted }]}>
              {filteredSchedules.length} class{filteredSchedules.length !== 1 ? 'es' : ''} available
            </Text>
            {filteredSchedules.map((sc, i) => (
              <ScheduleCard
                key={sc.id}
                schedule={sc}
                onBook={handleBook}
                booking={bookingId === sc.id}
                index={i}
              />
            ))}
          </>
        )}
      </ScrollView>
    </AnimatedScreen>
  );
};

/* ─── Styles ─── */

const s = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 14, gap: 12 },

  pageHeader: { gap: 4, marginBottom: 4 },
  pageTitle: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  pageSubtitle: { fontSize: FONT_SIZE.sm },

  dayPickerContent: { gap: SPACING.md, paddingVertical: SPACING.sm, paddingHorizontal: 4 },
  dayBubble: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
    height: 72,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dayBubbleActive: {
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
  },
  dayBubbleName: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  dayBubbleNum: { fontSize: 20, fontWeight: '900' },

  countLabel: { fontSize: FONT_SIZE.xs, fontWeight: '600', letterSpacing: 0.3, marginTop: 2 },

  // Card
  card: { gap: 0 },
  cardBody: { flexDirection: 'row', padding: SPACING.md, gap: SPACING.md },
  dateBlock: {
    width: 62, height: 66, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.md,
  },
  dateMonth: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  dateNum: { fontSize: 26, fontWeight: '900', marginTop: -2 },

  infoBlock: { flex: 1, gap: 4, justifyContent: 'center' },
  className: { fontSize: 17, fontWeight: '800', letterSpacing: -0.2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: FONT_SIZE.xs, fontWeight: '500' },

  // Capacity section
  capacitySection: {
    paddingHorizontal: SPACING.md, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth,
  },
  capacityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: SPACING.md },
  capacityInfo: { flex: 1, gap: 4 },
  capacityBarBg: { height: 5, borderRadius: 3, overflow: 'hidden' },
  capacityBarFill: { height: '100%', borderRadius: 3 },
  spotsText: { fontSize: 11, fontWeight: '600' },

  bookedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, height: 50, borderRadius: 14, borderWidth: 1,
    justifyContent: 'center', minWidth: 110,
  },
  bookedText: { fontSize: 15, fontWeight: '700' },
  bookBtn: { minWidth: 110 },

  // Error
  errorBox: { alignItems: 'center', gap: SPACING.sm, padding: SPACING.lg },
  errorTitle: { fontSize: FONT_SIZE.lg, fontWeight: '700' },
  errorText: { fontSize: FONT_SIZE.sm, textAlign: 'center' },
});
