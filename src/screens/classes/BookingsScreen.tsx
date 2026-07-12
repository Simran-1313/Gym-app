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
import { DARK_COLORS, LIGHT_COLORS, FONT_SIZE, RADIUS, SPACING, TYPOGRAPHY } from '../../config/theme';
import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { GlassCard } from '../../components/ui/GlassCard';
import { StatBadge } from '../../components/ui/StatBadge';
import { StaggerItem } from '../../components/ui/StaggerItem';
import { AnimatedButton } from '../../components/ui/AnimatedButton';
import { GlassOverlay } from '../../components/ui/GlassOverlay';
import { useAuth } from '../../context/AuthContext';

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

const getStatusConfig = (colors: { primary: string; success: string; danger: string; textMuted: string }) => ({
  CONFIRMED: { color: colors.primary, icon: 'checkmark-circle-outline' as const },
  ATTENDED: { color: colors.success, icon: 'checkmark-done-circle' as const },
  NO_SHOW: { color: colors.danger, icon: 'close-circle-outline' as const },
  CANCELLED: { color: colors.textMuted, icon: 'ban-outline' as const },
});

export const BookingsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

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

  if (loading) return <LoadingSpinner fullScreen />;

  const statusCfg = getStatusConfig(colors);

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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {error ? (
          <EmptyState
            icon="warning-outline"
            title="Oops, something went wrong!"
            subtitle={error}
            actionLabel="Try Again"
            onAction={() => { setLoading(true); load().finally(() => setLoading(false)); }}
          />
        ) : bookings.length === 0 ? (
          <EmptyState
            icon="bookmark-outline"
            title="No bookings yet"
            subtitle="Book a class from the Classes tab to see it here."
          />
        ) : (
          bookings.map((b, i) => {
            const cfg = statusCfg[b.status as keyof typeof statusCfg] ?? statusCfg.CONFIRMED;
            const canCancel = b.status === 'CONFIRMED';
            return (
              <StaggerItem key={b.id} index={i}>
                <GlassCard glowColor={cfg.color} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={styles.classBlock}>
                      <Text style={[styles.className, { color: colors.text }]}>{b.schedule.class.name}</Text>
                      <Text style={[styles.classTime, { color: colors.textSecondary }]}>
                        {formatDate(b.schedule.startTime)} · {formatTime(b.schedule.startTime)} – {formatTime(b.schedule.endTime)}
                      </Text>
                      <StatBadge
                        icon="time-outline"
                        label="Duration"
                        value={`${b.schedule.class.durationMinutes} min`}
                        color={colors.accent}
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
  className: { ...TYPOGRAPHY.heading },
  classTime: { fontSize: FONT_SIZE.sm },
});
