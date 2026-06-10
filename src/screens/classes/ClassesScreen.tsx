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
import { COLORS, FONT_SIZE, RADIUS, SPACING, TYPOGRAPHY } from '../../config/theme';
import { ClassesStackParams } from '../../navigation/AppNavigator';
import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { GlassCard } from '../../components/ui/GlassCard';
import { AnimatedButton } from '../../components/ui/AnimatedButton';
import { StatBadge } from '../../components/ui/StatBadge';
import { StaggerItem } from '../../components/ui/StaggerItem';
import { SuccessBurst } from '../../components/ui/SuccessBurst';

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

const formatDay = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

interface ScheduleCardProps {
  schedule: ClassSchedule;
  onBook: (id: string) => void;
  booking: boolean;
  index: number;
}

const ScheduleCard: React.FC<ScheduleCardProps> = ({ schedule, onBook, booking, index }) => {
  const spotsLeft = schedule.capacity - schedule.bookedCount;
  const isFull = spotsLeft <= 0;

  return (
    <StaggerItem index={index}>
      <GlassCard glowColor={COLORS.primary} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.timeBlock}>
            <Text style={styles.time}>{formatTime(schedule.startTime)}</Text>
            <Text style={styles.date}>{formatDay(schedule.startTime)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.classInfo}>
            <Text style={styles.className}>{schedule.class.name}</Text>
            {schedule.class.trainer ? (
              <Text style={styles.trainer}>
                <Ionicons name="person-outline" size={12} /> {schedule.class.trainer.name}
              </Text>
            ) : null}
            <StatBadge
              icon="time-outline"
              label="Duration"
              value={`${schedule.class.durationMinutes} min`}
              color={COLORS.accent}
            />
          </View>
        </View>

        <View style={styles.cardFooter}>
          <StatBadge
            icon="people-outline"
            label="Spots"
            value={isFull ? 'Full' : `${spotsLeft} left`}
            color={isFull ? COLORS.error : COLORS.success}
          />

          {schedule.isBooked ? (
            <View style={styles.bookedBadge}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
              <Text style={styles.bookedText}>Booked</Text>
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
        style={styles.root}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 56, paddingBottom: insets.bottom + 100 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        <GlassCard glowColor={COLORS.primary}>
          <AnimatedButton
            label="View My Bookings"
            variant="secondary"
            onPress={() => nav.navigate('MyBookings')}
            icon={<Ionicons name="bookmark-outline" size={18} color={COLORS.primary} />}
          />
        </GlassCard>

        {error ? (
          <GlassCard glowColor={COLORS.error}>
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={24} color={COLORS.error} />
              <Text style={styles.errorText}>{error}</Text>
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

  card: { gap: SPACING.md },
  cardHeader: { flexDirection: 'row', gap: SPACING.md },
  timeBlock: { minWidth: 80 },
  time: { color: COLORS.text, fontSize: FONT_SIZE.lg, fontWeight: '700' },
  date: { color: COLORS.textSecondary, fontSize: FONT_SIZE.xs, marginTop: 2 },
  divider: { width: 1, backgroundColor: COLORS.surfaceBorder },
  classInfo: { flex: 1, gap: 8 },
  className: { ...TYPOGRAPHY.heading, color: COLORS.text },
  trainer: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: SPACING.sm },
  bookedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: `${COLORS.success}22`,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
  },
  bookedText: { color: COLORS.success, fontSize: FONT_SIZE.sm, fontWeight: '600' },
  bookBtn: { minWidth: 100 },

  errorBox: { alignItems: 'center', gap: SPACING.sm, padding: SPACING.md },
  errorText: { color: COLORS.error, fontSize: FONT_SIZE.md, textAlign: 'center' },
});
