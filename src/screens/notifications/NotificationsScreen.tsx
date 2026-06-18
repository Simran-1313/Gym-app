import React, { useEffect, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getNotifications, AppNotification } from '../../services/member.service';
import { DARK_COLORS, LIGHT_COLORS, FONT_SIZE, RADIUS, SPACING, TYPOGRAPHY } from '../../config/theme';
import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { GlassCard } from '../../components/ui/GlassCard';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { StaggerItem } from '../../components/ui/StaggerItem';
import { useAuth } from '../../context/AuthContext';

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

const formatTimeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const NotificationCard: React.FC<{ item: AppNotification; index: number }> = ({ item, index }) => {
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  const icon = notificationIcons[item.type] ?? 'notifications-outline';
  const nColors = getNotificationColors(colors);
  const color = nColors[item.type as keyof typeof nColors] ?? colors.primary;
  const isUnread = !item.readAt;

  return (
    <StaggerItem index={index}>
      <GlassCard glowColor={isUnread ? color : undefined} style={styles.card}>
        <View style={styles.cardLeft}>
          <View style={[styles.iconBox, { backgroundColor: `${color}18` }]}>
            <Ionicons name={icon} size={20} color={color} />
          </View>
          <View style={styles.details}>
            <View style={styles.titleRow}>
              <Text 
                style={[
                  styles.title, 
                  { color: colors.textSecondary },
                  isUnread && [styles.unreadText, { color: colors.text }]
                ]} 
                numberOfLines={1}
              >
                {item.title}
              </Text>
              {isUnread && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
            </View>
            <Text style={[styles.body, { color: colors.textSecondary }]}>{item.body}</Text>
            <Text style={[styles.time, { color: colors.textMuted }]}>{formatTimeAgo(item.createdAt)}</Text>
          </View>
        </View>
      </GlassCard>
    </StaggerItem>
  );
};

export const NotificationsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch {
      // ignore
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

  return (
    <AnimatedScreen>
      <FlatList
        style={[styles.root, { backgroundColor: colors.background }]}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 56, paddingBottom: insets.bottom + 100 }
        ]}
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => <NotificationCard item={item} index={index} />}
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
  content: { padding: SPACING.md, gap: SPACING.sm },
  card: { padding: SPACING.sm },
  cardLeft: { flexDirection: 'row', gap: SPACING.md },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  details: { flex: 1, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: {
    fontSize: FONT_SIZE.md,
    fontWeight: '500',
    flex: 1,
  },
  unreadText: {
    fontWeight: '700',
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  body: {
    fontSize: FONT_SIZE.sm,
    lineHeight: 18,
  },
  time: {
    fontSize: FONT_SIZE.xs,
    marginTop: 2,
  },
});
