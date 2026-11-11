import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CommonActions, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';

import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../services/member.service';
import { AppNotification } from '../../types';
import { FONTS, RADIUS } from '../../config/theme';
import type { ThemeColors } from '../../config/theme';
import { RootStackParams } from '../../navigation/AppNavigator';
import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { GlassCard } from '../../components/ui/GlassCard';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { StaggerItem } from '../../components/ui/StaggerItem';
import { useThemeColors } from '../../hooks/useThemeColors';

/** `.scroll { padding: 0 18px 18px }` */
const GUTTER = 18;
/** `rgba(45,212,200,0.14)` / `rgba(245,168,60,0.14)` — alpha suffix for a themed icon-tile tint (matches CheckInsScreen's TEAL_WASH). */
const TINT_WASH = '24';
const PAGE_SIZE = 20;

/** Icon and tint by `data.type`, the field every notification the API writes carries. */
const kindOf = (type: string | undefined, colors: ThemeColors): { icon: keyof typeof Ionicons.glyphMap; color: string } => {
  switch (type) {
    case 'ADMIN_BROADCAST':
      return { icon: 'megaphone-outline', color: colors.primary };
    case 'BIRTHDAY_GREETING':
    case 'ANNIVERSARY_GREETING':
      return { icon: 'gift-outline', color: colors.accent };
    case 'CLASS_WAITLIST_PROMOTED':
      return { icon: 'barbell-outline', color: colors.success };
    case 'FREEZE_APPROVED':
      return { icon: 'pause-circle-outline', color: colors.success };
    case 'FREEZE_DECLINED':
      return { icon: 'close-circle-outline', color: colors.danger };
    default:
      return { icon: 'notifications-outline', color: colors.primary };
  }
};

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

const NotificationCard: React.FC<{ item: AppNotification; index: number; onPress: (n: AppNotification) => void }> = ({
  item,
  index,
  onPress,
}) => {
  const colors = useThemeColors();

  const { icon, color: typeColor } = kindOf(item.data?.type, colors);
  const isUnread = !item.readAt;

  return (
    <StaggerItem index={index}>
      <Pressable onPress={() => onPress(item)} accessibilityRole="button" accessibilityLabel={item.title}>
      {/* `.notif-row-full.unread { border-color: rgba(teal,0.25) }` — a fixed
          teal-tinted border regardless of notification type. */}
      <GlassCard
        style={[styles.card, isUnread && { borderColor: `${colors.primary}40` }]}
        innerStyle={styles.cardInner}
      >        {/* `.notif-icon` — tinted background only while unread; read rows fall
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
      </Pressable>
    </StaggerItem>
  );
};

export const NotificationsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const colors = useThemeColors();
  const onBack = navigation.canGoBack() ? () => navigation.goBack() : undefined;

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await getNotifications(1, PAGE_SIZE);
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
      setPage(1);
      setHasMore(data.meta.hasNext);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const loadMore = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await getNotifications(page + 1, PAGE_SIZE);
      setNotifications((prev) => [...prev, ...data.notifications.filter((n) => !prev.some((p) => p.id === n.id))]);
      setPage(page + 1);
      setHasMore(data.meta.hasNext);
    } catch {
      // The next pull or scroll tries again.
    } finally {
      setLoadingMore(false);
    }
  };

  /** Reading one marks it read (optimistically) and opens what it's about. */
  const open = (n: AppNotification) => {
    Haptics.selectionAsync().catch(() => {});
    if (!n.readAt) {
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)));
      setUnreadCount((c) => Math.max(0, c - 1));
      markNotificationRead(n.id).catch(() => {});
    }
    const type = n.data?.type ?? '';
    if (type.startsWith('FREEZE_')) navigation.navigate('Membership');
    else if (type.startsWith('CLASS_')) navigation.dispatch(CommonActions.navigate({ name: 'MainTabs', params: { screen: 'Classes' } }));
  };

  const markAll = () => {
    const now = new Date().toISOString();
    setNotifications((prev) => prev.map((x) => (x.readAt ? x : { ...x, readAt: now })));
    setUnreadCount(0);
    markAllNotificationsRead().catch(() => {});
  };

  const header = (
    <ScreenHeader
      title="Notifications"
      onBack={onBack}
      right={
        unreadCount > 0 ? (
          <Pressable onPress={markAll} hitSlop={8} accessibilityRole="button" accessibilityLabel="Mark all as read">
            <Text style={[styles.markAll, { color: colors.primary }]}>Mark all read</Text>
          </Pressable>
        ) : undefined
      }
    />
  );

  if (loading) {
    return (
      <AnimatedScreen>
        {header}
        <LoadingSpinner fullScreen />
      </AnimatedScreen>
    );
  }

  if (error) {
    return (
      <AnimatedScreen>
        {header}
        <View style={{ flex: 1, paddingTop: 12, paddingHorizontal: GUTTER }}>
          <EmptyState
            icon="warning-outline"
            title="Couldn’t load notifications"
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
      {header}
      <FlatList
        style={styles.root}
        contentContainerStyle={[
          styles.content,
          { paddingTop: 8, paddingBottom: insets.bottom + GUTTER + 10 },
        ]}
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => <NotificationCard item={item} index={index} onPress={open} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={loadingMore ? <LoadingSpinner /> : null}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        ListEmptyComponent={
          <EmptyState
            icon="notifications-off-outline"
            title="All caught up!"
            subtitle="Gym announcements, class updates and replies about your membership will show up here."
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
  markAll: { fontSize: 13, fontFamily: FONTS.bodySemi },
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
