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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getMyBookings, cancelBooking } from '../../services/member.service';
import { ClassBooking } from '../../types';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { COLORS, FONT_SIZE, RADIUS, SPACING, TYPOGRAPHY } from '../../config/theme';
import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { GlassCard } from '../../components/ui/GlassCard';
import { StatBadge } from '../../components/ui/StatBadge';
import { StaggerItem } from '../../components/ui/StaggerItem';
import { AnimatedButton } from '../../components/ui/AnimatedButton';
import { GlassOverlay } from '../../components/ui/GlassOverlay';

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
  const insets = useSafeAreaInsets();
  const [bookings, setBookings] = useState<ClassBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<ClassBooking | null>(null);

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

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <AnimatedScreen>
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
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 56, paddingBottom: insets.bottom + 40 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {bookings.length === 0 ? (
          <EmptyState
            icon="bookmark-outline"
            title="No bookings yet"
            subtitle="Book a class from the Classes tab to see it here."
          />
        ) : (
          bookings.map((b, i) => {
            const cfg = statusConfig[b.status] ?? statusConfig.CONFIRMED;
            const canCancel = b.status === 'CONFIRMED';
            return (
              <StaggerItem key={b.id} index={i}>
                <GlassCard glowColor={cfg.color} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={styles.classBlock}>
                      <Text style={styles.className}>{b.schedule.class.name}</Text>
                      <Text style={styles.classTime}>
                        {formatDate(b.schedule.startTime)} · {formatTime(b.schedule.startTime)} – {formatTime(b.schedule.endTime)}
                      </Text>
                      <StatBadge
                        icon="time-outline"
                        label="Duration"
                        value={`${b.schedule.class.durationMinutes} min`}
                        color={COLORS.accent}
                      />
                    </View>
                    <StatBadge icon={cfg.icon} label="Status" value={b.status} color={cfg.color} />
                  </View>

                  {canCancel && (
                    <AnimatedButton
                      label={cancellingId === b.id ? 'Cancelling…' : 'Cancel Booking'}
                      variant="secondary"
                      onPress={() => setCancelTarget(b)}
                      disabled={!!cancellingId}
                      loading={cancellingId === b.id}
                    />
                  )}
                </GlassCard>
              </StaggerItem>
            );
          })
        )}
      </ScrollView>
    </AnimatedScreen>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: SPACING.md, gap: SPACING.md },

  card: { gap: SPACING.md },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: SPACING.sm },
  classBlock: { flex: 1, gap: 8 },
  className: { ...TYPOGRAPHY.heading, color: COLORS.text },
  classTime: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm },
});
