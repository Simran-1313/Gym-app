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
import { getMyBookings, cancelBooking } from '../../services/member.service';
import { ClassBooking } from '../../types';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../../config/theme';

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

const statusConfig: Record<string, { color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  CONFIRMED: { color: COLORS.primary, icon: 'checkmark-circle-outline' },
  ATTENDED: { color: COLORS.success, icon: 'checkmark-done-circle' },
  NO_SHOW: { color: COLORS.error, icon: 'close-circle-outline' },
  CANCELLED: { color: COLORS.textMuted, icon: 'ban-outline' },
};

export const BookingsScreen: React.FC = () => {
  const [bookings, setBookings] = useState<ClassBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await getMyBookings();
      setBookings(data);
    } catch {
      // silently fail on refresh
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

  const handleCancel = useCallback(
    (booking: ClassBooking) => {
      Alert.alert(
        'Cancel Booking',
        `Cancel your booking for ${booking.schedule.class.name}?`,
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes, Cancel',
            style: 'destructive',
            onPress: async () => {
              setCancellingId(booking.id);
              try {
                await cancelBooking(booking.id);
                await load();
              } catch (err: unknown) {
                Alert.alert('Error', err instanceof Error ? err.message : 'Cancel failed');
              } finally {
                setCancellingId(null);
              }
            },
          },
        ],
      );
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
      {bookings.length === 0 ? (
        <EmptyState
          icon="bookmark-outline"
          title="No bookings yet"
          subtitle="Book a class from the Classes tab to see it here."
        />
      ) : (
        bookings.map((b) => {
          const cfg = statusConfig[b.status] ?? statusConfig.CONFIRMED;
          const canCancel = b.status === 'CONFIRMED';
          return (
            <View key={b.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.classBlock}>
                  <Text style={styles.className}>{b.schedule.class.name}</Text>
                  <Text style={styles.classTime}>
                    {formatDate(b.schedule.startTime)} · {formatTime(b.schedule.startTime)} – {formatTime(b.schedule.endTime)}
                  </Text>
                  <Text style={styles.duration}>{b.schedule.class.durationMinutes} min</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: cfg.color + '22' }]}>
                  <Ionicons name={cfg.icon} size={14} color={cfg.color} />
                  <Text style={[styles.statusText, { color: cfg.color }]}>{b.status}</Text>
                </View>
              </View>

              {canCancel && (
                <TouchableOpacity
                  style={[styles.cancelBtn, cancellingId === b.id && styles.cancelBtnDisabled]}
                  onPress={() => handleCancel(b)}
                  disabled={cancellingId === b.id}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelBtnText}>
                    {cancellingId === b.id ? 'Cancelling…' : 'Cancel Booking'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, gap: SPACING.md, paddingBottom: SPACING.xxl },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    gap: SPACING.md,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  classBlock: { flex: 1, gap: 4 },
  className: { color: COLORS.text, fontSize: FONT_SIZE.md, fontWeight: '700' },
  classTime: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm },
  duration: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  statusText: { fontSize: FONT_SIZE.xs, fontWeight: '700' },

  cancelBtn: {
    borderWidth: 1,
    borderColor: COLORS.error,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelBtnDisabled: { opacity: 0.5 },
  cancelBtnText: { color: COLORS.error, fontSize: FONT_SIZE.sm, fontWeight: '600' },
});
