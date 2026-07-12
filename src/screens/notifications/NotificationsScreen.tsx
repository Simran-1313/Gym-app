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
      <GlassCard 
        glowColor={isUnread ? color : undefined} 
        style={[styles.card, isUnread && { borderColor: `${color}40`, borderWidth: 1 }]}
      >
        <View style={styles.cardLeft}>
          <View style={[styles.iconBox, { backgroundColor: `${color}20` }]}>
            <Ionicons name={icon} size={22} color={color} />
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
              {isUnread && (
                <View style={[styles.unreadBadge, { backgroundColor: `${colors.primary}20` }]}>
                  <Text style={[styles.unreadBadgeText, { color: colors.primary }]}>New</Text>
                </View>
              )}
            </View>
            <Text style={[styles.body, { color: colors.textSecondary }]} numberOfLines={2}>{item.body}</Text>
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
        <View style={{ flex: 1, paddingTop: insets.top + 90, paddingHorizontal: SPACING.lg }}>
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
          { paddingTop: insets.top + 90, paddingBottom: insets.bottom + 100 }
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
  content: { padding: SPACING.md, gap: SPACING.md },
  card: { marginHorizontal: 2, marginBottom: 4 },
  cardLeft: { flexDirection: 'row', gap: SPACING.md, alignItems: 'center' },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  details: { flex: 1, gap: 4, paddingVertical: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    flex: 1,
  },
  unreadText: {
    fontWeight: '800',
  },
  unreadBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  unreadBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  body: {
    fontSize: FONT_SIZE.sm,
    lineHeight: 20,
  },
  time: {
    fontSize: FONT_SIZE.xs,
    marginTop: 4,
    fontWeight: '500',
  },
});
