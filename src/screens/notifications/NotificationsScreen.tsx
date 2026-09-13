import React, { useEffect, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useHeaderHeight } from '@react-navigation/elements';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getNotifications, AppNotification } from '../../services/member.service';
import { FONTS, RADIUS } from '../../config/theme';
import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { GlassCard } from '../../components/ui/GlassCard';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { StaggerItem } from '../../components/ui/StaggerItem';
import { useThemeColors } from '../../hooks/useThemeColors';

/** `.scroll { padding: 0 18px 18px }` */
const GUTTER = 18;
/** `rgba(45,212,200,0.14)` / `rgba(245,168,60,0.14)` — alpha suffix for a themed icon-tile tint (matches CheckInsScreen's TEAL_WASH). */
const TINT_WASH = '24';

const notificationIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  SYSTEM: 'settings-outline',
  CLASS: 'barbell-outline',
  DIET: 'nutrition-outline',
};

const getNotificationColors = (colors: { primary: string; accent: string; success: string }) => ({
  SYSTEM: colors.primary,
  CLASS: colors.accent,
  DIET: colors.success,
});

/** `.notif-time` — the prototype shows "2m" / "1h" / "Yesterday", never "…ago". */
const formatTimeAgo = (iso: string) => {
  const created = new Date(iso);
  const now = new Date();
  const mins = Math.floor((now.getTime() - created.getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.round((startOfDay(now) - startOfDay(created)) / 86400000);
  if (dayDiff === 1) return 'Yesterday';
  return created.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const NotificationCard: React.FC<{ item: AppNotification; index: number }> = ({ item, index }) => {
  const colors = useThemeColors();

  const icon = notificationIcons[item.type] ?? 'notifications-outline';
  const nColors = getNotificationColors(colors);
  const typeColor = nColors[item.type as keyof typeof nColors] ?? colors.primary;
  const isUnread = !item.readAt;

  return (
    <StaggerItem index={index}>
      {/* `.notif-row-full.unread { border-color: rgba(teal,0.25) }` — a fixed
          teal-tinted border regardless of notification type. */}
      <GlassCard
        style={[styles.card, isUnread && { borderColor: `${colors.primary}40` }]}
        innerStyle={styles.cardInner}
      >
        {/* `.notif-icon` — tinted background only while unread; read rows fall
            back to the neutral recessed tile background. */}
        <View
          style={[
            styles.iconBox,
            { backgroundColor: isUnread ? `${typeColor}${TINT_WASH}` : colors.inset },
          ]}
        >
          <Ionicons name={icon} size={16} color={isUnread ? typeColor : colors.text} />
        </View>

        <View style={styles.details}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[styles.body, { color: colors.textSecondary }]} numberOfLines={2}>
            {item.body}
          </Text>
        </View>

        <Text style={[styles.time, { color: colors.textMuted }]}>{formatTimeAgo(item.createdAt)}</Text>

        {/* `.notif-unread-dot { top:16; right:14; width:7; height:7 }` */}
        {isUnread ? <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} /> : null}
      </GlassCard>
    </StaggerItem>
  );
};

export const NotificationsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const colors = useThemeColors();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load notifications');
    }
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading) return <LoadingSpinner fullScreen />;

  if (error) {
    return (
      <AnimatedScreen>
        <View style={{ flex: 1, paddingTop: headerHeight, paddingHorizontal: GUTTER }}>
          <EmptyState
            icon="warning-outline"
            title="Oops, something went wrong!"
            subtitle={error}
            actionLabel="Try Again"
            onAction={() => {
              setLoading(true);
              load().finally(() => setLoading(false));
            }}
          />
        </View>
      </AnimatedScreen>
    );
  }

  return (
    <AnimatedScreen>
      <FlatList
        style={styles.root}
        contentContainerStyle={[
          styles.content,
          { paddingTop: headerHeight + 8, paddingBottom: insets.bottom + GUTTER + 10 },
        ]}
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => <NotificationCard item={item} index={index} />}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        ListEmptyComponent={
          <EmptyState
            icon="notifications-off-outline"
            title="All caught up!"
            subtitle="Any updates or class announcements will appear here."
          />
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      />
    </AnimatedScreen>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: GUTTER },

  /* `.notif-row-full { margin-bottom:9px }` */
  card: { marginBottom: 9 },
  /* `.notif-row-full { gap:12px; padding:14px 15px }` — GlassCard always pads
     its children in an inner View, so the row's own layout and padding must
     go on innerStyle, never style, or the row collapses to content width. */
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 15,
  },

  /* `.notif-icon { width:38; height:38; border-radius:11 }` */
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  details: { flex: 1, minWidth: 0 },
  /* `.notif-title { font-size:12.5px; font-weight:600 }` */
  title: {
    fontSize: 12.5,
    fontFamily: FONTS.bodySemi,
  },
  /* `.notif-sub { font-size:11.5px; margin-top:2; line-height:1.4 }` */
  body: {
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 2,
  },
  /* `.notif-time { font-size:10px }` */
  time: {
    fontSize: 10,
    fontFamily: FONTS.bodyMedium,
    flexShrink: 0,
  },
  /* `.notif-unread-dot { position:absolute; top:16; right:14; width:7; height:7 }` */
  unreadDot: {
    position: 'absolute',
    top: 16,
    right: 14,
    width: 7,
    height: 7,
    borderRadius: RADIUS.full,
  },
});
