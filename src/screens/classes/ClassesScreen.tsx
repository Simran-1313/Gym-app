import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { getClassSchedules, bookClass } from '../../services/member.service';
import { ClassSchedule } from '../../types';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../../config/theme';
import { ClassesStackParams } from '../../navigation/AppNavigator';

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

const formatDay = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

interface ScheduleCardProps {
  schedule: ClassSchedule;
  onBook: (id: string) => void;
  booking: boolean;
}

const ScheduleCard: React.FC<ScheduleCardProps> = ({ schedule, onBook, booking }) => {
  const spotsLeft = schedule.capacity - schedule.bookedCount;
  const isFull = spotsLeft <= 0;

  return (
    <View style={styles.card}>
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
          <Text style={styles.duration}>
            <Ionicons name="time-outline" size={12} /> {schedule.class.durationMinutes} min
          </Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.spots}>
          <Ionicons
            name="people-outline"
            size={14}
            color={isFull ? COLORS.error : COLORS.success}
          />
          <Text style={[styles.spotsText, { color: isFull ? COLORS.error : COLORS.success }]}>
            {isFull ? 'Full' : `${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} left`}
          </Text>
        </View>

        {schedule.isBooked ? (
          <View style={styles.bookedBadge}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
            <Text style={styles.bookedText}>Booked</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.bookBtn, (isFull || booking) && styles.bookBtnDisabled]}
            onPress={() => onBook(schedule.id)}
            disabled={isFull || booking}
            activeOpacity={0.8}
          >
            <Text style={styles.bookBtnText}>{isFull ? 'Full' : 'Book'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export const ClassesScreen: React.FC = () => {
  const nav = useNavigation<NativeStackNavigationProp<ClassesStackParams>>();
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
              Alert.alert('Booked!', 'Your class has been booked successfully.');
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
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
    >
      <TouchableOpacity style={styles.bookingsLink} onPress={() => nav.navigate('MyBookings')}>
        <Ionicons name="bookmark-outline" size={18} color={COLORS.primary} />
        <Text style={styles.bookingsLinkText}>View My Bookings</Text>
        <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
      </TouchableOpacity>

      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={24} color={COLORS.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : schedules.length === 0 ? (
        <EmptyState
          icon="barbell-outline"
          title="No classes available"
          subtitle="Check back later for upcoming class schedules."
        />
      ) : (
        schedules.map((s) => (
          <ScheduleCard
            key={s.id}
            schedule={s}
            onBook={handleBook}
            booking={bookingId === s.id}
          />
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, gap: SPACING.md, paddingBottom: SPACING.xxl },

  bookingsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  bookingsLinkText: { flex: 1, color: COLORS.primary, fontSize: FONT_SIZE.md, fontWeight: '600' },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    gap: SPACING.md,
  },
  cardHeader: { flexDirection: 'row', gap: SPACING.md },
  timeBlock: { minWidth: 80 },
  time: { color: COLORS.text, fontSize: FONT_SIZE.lg, fontWeight: '700' },
  date: { color: COLORS.textSecondary, fontSize: FONT_SIZE.xs, marginTop: 2 },
  divider: { width: 1, backgroundColor: COLORS.cardBorder },
  classInfo: { flex: 1, gap: 4 },
  className: { color: COLORS.text, fontSize: FONT_SIZE.md, fontWeight: '700' },
  trainer: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm },
  duration: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  spots: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  spotsText: { fontSize: FONT_SIZE.sm, fontWeight: '600' },

  bookedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.success + '22', paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full },
  bookedText: { color: COLORS.success, fontSize: FONT_SIZE.sm, fontWeight: '600' },

  bookBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
  },
  bookBtnDisabled: { backgroundColor: COLORS.textMuted },
  bookBtnText: { color: COLORS.white, fontSize: FONT_SIZE.sm, fontWeight: '700' },

  errorBox: {
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.xl,
  },
  errorText: { color: COLORS.error, fontSize: FONT_SIZE.md, textAlign: 'center' },
});
