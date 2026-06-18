import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
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

import { getClassSchedules, bookClass } from '../../services/member.service';
import { ClassSchedule } from '../../types';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { DARK_COLORS, LIGHT_COLORS, FONT_SIZE, RADIUS, SPACING, TYPOGRAPHY } from '../../config/theme';
import { ClassesStackParams } from '../../navigation/AppNavigator';
import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { GlassCard } from '../../components/ui/GlassCard';
import { AnimatedButton } from '../../components/ui/AnimatedButton';
import { StatBadge } from '../../components/ui/StatBadge';
import { StaggerItem } from '../../components/ui/StaggerItem';
import { SuccessBurst } from '../../components/ui/SuccessBurst';
import { useAuth } from '../../context/AuthContext';

// Safe date formatters with fallback for invalid dates
const safeFormatTime = (iso: string): string => {
  try {
    const date = new Date(iso);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch {
    return '—';
  }
};

const safeFormatDay = (iso: string): string => {
  try {
    const date = new Date(iso);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  } catch {
    return '—';
  }
};

const safeFormatMonth = (iso: string): string => {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-IN', { month: 'short' });
  } catch {
    return '-';
  }
};

const safeFormatDayNum = (iso: string): string => {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '-';
    return d.getDate().toString();
  } catch {
    return '-';
  }
};

interface ScheduleCardProps {
  schedule: ClassSchedule;
  onBook: (id: string) => void;
  booking: boolean;
  index: number;
}

const ScheduleCard: React.FC<ScheduleCardProps> = ({ schedule, onBook, booking, index }) => {
  const capacity = schedule.capacity ?? 0;
  const bookedCount = schedule.bookedCount ?? 0;
  const spotsLeft = Math.max(0, capacity - bookedCount);
  const isFull = spotsLeft <= 0;
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  return (
    <StaggerItem index={index}>
      <GlassCard glowColor={colors.primary} style={styles.card} noPadding>
        <View style={styles.cardInner}>
          <View style={[styles.dateBlock, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
            <Text style={[styles.dateMonth, { color: colors.primary }]}>{safeFormatMonth(schedule.startTime)}</Text>
            <Text style={[styles.dateNum, { color: colors.text }]}>{safeFormatDayNum(schedule.startTime)}</Text>
          </View>
          
          <View style={styles.infoBlock}>
            <Text style={[styles.className, { color: colors.text }]}>{schedule.class.name}</Text>
            
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                {safeFormatTime(schedule.startTime)} • {schedule.class.durationMinutes ?? 0}m
              </Text>
            </View>
            
            {schedule.class.trainer && (
              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={14} color={colors.textSecondary} />
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>{schedule.class.trainer.name}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={[styles.horizontalDivider, { backgroundColor: colors.surfaceBorder }]} />

        <View style={styles.cardFooter}>
          <View style={styles.spotsContainer}>
            <Ionicons
              name="people-circle-outline"
              size={20}
              color={isFull ? colors.danger : colors.textSecondary}
            />
            <Text style={[styles.spotsText, { color: isFull ? colors.danger : colors.textSecondary }]}>
              {isFull ? 'Class Full' : `${spotsLeft} spots available`}
            </Text>
          </View>

          {schedule.isBooked ? (
            <View style={[styles.bookedBadge, { backgroundColor: `${colors.success}18` }]}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={[styles.bookedText, { color: colors.success }]}>Booked</Text>
            </View>
          ) : (
            <AnimatedButton
              label={isFull ? 'Full' : 'Book'}
              variant="primary"
              onPress={() => onBook(schedule.id)}
              disabled={isFull || booking}
              loading={booking}
              style={styles.bookBtn}
            />
          )}
        </View>
      </GlassCard>
    </StaggerItem>
  );
};

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

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await getClassSchedules();
      setSchedules(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load classes');
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

  const handleBook = useCallback(
    async (scheduleId: string) => {
      Alert.alert('Confirm Booking', 'Book this class?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Book',
          onPress: async () => {
            setBookingId(scheduleId);
            try {
              await bookClass(scheduleId);
              await load();
              setShowSuccess(true);
            } catch (err: unknown) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Booking failed');
            } finally {
              setBookingId(null);
            }
          },
        },
      ]);
    },
    [load],
  );

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <AnimatedScreen>
      <SuccessBurst visible={showSuccess} onDone={() => setShowSuccess(false)} />
      <ScrollView
        style={[styles.root, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom + 100 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
      >
        <GlassCard glowColor={colors.primary}>
          <AnimatedButton
            label="View My Bookings"
            variant="secondary"
            onPress={() => nav.navigate('MyBookings')}
            icon={<Ionicons name="bookmark-outline" size={18} color={colors.primary} />}
          />
        </GlassCard>

        {error ? (
          <GlassCard glowColor={colors.danger}>
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={24} color={colors.danger} />
              <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
            </View>
          </GlassCard>
        ) : schedules.length === 0 ? (
          <EmptyState
            icon="barbell-outline"
            title="No classes available"
            subtitle="Check back later for upcoming class schedules."
          />
        ) : (
          schedules.map((s, i) => (
            <ScheduleCard
              key={s.id}
              schedule={s}
              onBook={handleBook}
              booking={bookingId === s.id}
              index={i}
            />
          ))
        )}
      </ScrollView>
    </AnimatedScreen>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: SPACING.md, gap: SPACING.md },

  card: { gap: 0 },
  cardInner: { flexDirection: 'row', padding: SPACING.md, gap: SPACING.md },
  dateBlock: {
    width: 68,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
  },
  dateMonth: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  dateNum: { fontSize: 28, fontWeight: '900', marginTop: -2 },
  
  infoBlock: { flex: 1, gap: 4, justifyContent: 'center' },
  className: { fontSize: 18, fontWeight: '800' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { fontSize: FONT_SIZE.sm, fontWeight: '500' },
  
  horizontalDivider: { height: 1 },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
  },
  spotsContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  spotsText: { fontSize: FONT_SIZE.sm, fontWeight: '600' },
  
  bookedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
  },
  bookedText: { fontSize: FONT_SIZE.sm, fontWeight: '700' },
  bookBtn: { minWidth: 100, height: 40 },

  errorBox: { alignItems: 'center', gap: SPACING.sm, padding: SPACING.md },
  errorText: { fontSize: FONT_SIZE.md, textAlign: 'center' },
});
