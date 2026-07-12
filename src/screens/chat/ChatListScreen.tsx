import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';

import { chatService, ChatRoom } from '../../services/chat.service';
import { connectSocket } from '../../services/socket';
import { DARK_COLORS, LIGHT_COLORS, SPACING, FONT_SIZE, RADIUS } from '../../config/theme';
import { useAuth } from '../../context/AuthContext';
import { EmptyState } from '../../components/ui/EmptyState';
import type { ChatStackParams } from '../../navigation/AppNavigator';
import type { TabParams } from '../../navigation/AppNavigator';

type ChatListNav = CompositeNavigationProp<
  NativeStackNavigationProp<ChatStackParams, 'ChatList'>,
  BottomTabNavigationProp<TabParams>
>;

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString('en-IN', { weekday: 'short' });
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function normalizeRooms(rooms: ChatRoom[]): ChatRoom[] {
  const groupRooms = rooms.filter((r) => r.type === 'GROUP');
  const dmRooms = rooms.filter((r) => r.type === 'DIRECT');

  const canonicalGroup = groupRooms.length
    ? groupRooms.sort((a, b) =>
      new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime()
    )[0]
    : null;

  const sortByActivity = (a: ChatRoom, b: ChatRoom) => {
    const aTime = a.messages[0]?.createdAt ? new Date(a.messages[0].createdAt).getTime() : 0;
    const bTime = b.messages[0]?.createdAt ? new Date(b.messages[0].createdAt).getTime() : 0;
    return bTime - aTime;
  };

  const sortedDms = [...dmRooms].sort(sortByActivity);
  return canonicalGroup ? [canonicalGroup, ...sortedDms] : sortedDms;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

interface RoomItemProps {
  room: ChatRoom;
  currentUserId: string;
  colors: typeof DARK_COLORS;
  onPress: () => void;
}

const RoomItem: React.FC<RoomItemProps> = ({ room, currentUserId, colors, onPress }) => {
  const isGroup = room.type === 'GROUP';
  const otherUser = !isGroup
    ? room.members.find((m) => m.user.id !== currentUserId)?.user
    : null;

  const displayName = isGroup
    ? (room.name || 'Gym Group Chat')
    : (otherUser?.name || 'Direct Message');

  const lastMsg = room.messages?.[0] ?? null;
  const preview = lastMsg
    ? lastMsg.type === 'IMAGE'
      ? (lastMsg.senderId === currentUserId ? 'You: Photo' : 'Photo')
      : (lastMsg.senderId === currentUserId ? `You: ${lastMsg.content}` : lastMsg.content)
    : 'No messages yet';
  const time = lastMsg ? formatTime(lastMsg.createdAt) : '';
  const unread = room.unreadCount ?? 0;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.65}>
      <View style={[styles.roomCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        {isGroup ? (
          <LinearGradient
            colors={['#5856D6', '#007AFF']}
            style={styles.avatarCircle}
          >
            <Ionicons name="people" size={22} color="#fff" />
          </LinearGradient>
        ) : (
          <View style={[styles.avatarCircle, { backgroundColor: `${colors.primary}22` }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {getInitials(displayName)}
            </Text>
          </View>
        )}

        <View style={styles.roomInfo}>
          <View style={styles.roomTop}>
            <Text style={[styles.roomName, { color: colors.text }]} numberOfLines={1}>
              {displayName}
            </Text>
            {!!time && (
              <Text style={[styles.timeText, { color: colors.textMuted }]}>{time}</Text>
            )}
          </View>
          <View style={styles.roomBottom}>
            <Text
              style={[
                styles.previewText,
                { color: lastMsg ? colors.textSecondary : colors.textMuted },
                !lastMsg && styles.previewEmpty,
              ]}
              numberOfLines={1}
            >
              {preview}
            </Text>
            {unread > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.info }]}>
                <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export const ChatListScreen: React.FC = () => {
  const { user, theme } = useAuth();
  const isDark = theme === 'dark';
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<ChatListNav>();

  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadRooms = useCallback(async () => {
    setError(null);
    try {
      const data = await chatService.getRooms();
      setRooms(normalizeRooms(data));
    } catch (err: any) {
      setError(err.message || 'Failed to load chats');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  useEffect(() => {
    let active = true;
    connectSocket().then((socket) => {
      if (!active) return;

      const onMessage = (msg: { roomId: string; senderId: string; content: string; createdAt: string }) => {
        setRooms((prev) => {
          const updated = prev.map((r) => {
            if (r.id !== msg.roomId) return r;
            return {
              ...r,
              messages: [msg as ChatRoom['messages'][0]],
              unreadCount: msg.senderId !== user?.id ? (r.unreadCount ?? 0) + 1 : r.unreadCount,
            };
          });
          return normalizeRooms(updated);
        });
      };

      socket.on('chat:message', onMessage);
      return () => { socket.off('chat:message', onMessage); };
    });

    return () => { active = false; };
  }, [user?.id]);

  const openRoom = (room: ChatRoom) => {
    const roomName = room.type === 'GROUP'
      ? (room.name || 'Gym Group Chat')
      : (room.members.find((m) => m.user.id !== user?.id)?.user.name || 'Chat');
    navigation.navigate('ChatRoom', { roomId: room.id, roomName });
  };

  const q = search.trim().toLowerCase();
  const filteredRooms = useMemo(() => {
    if (!q) return rooms;
    return rooms.filter((r) => {
      if (r.type === 'GROUP') {
        return (r.name || 'gym group chat').toLowerCase().includes(q);
      }
      const other = r.members.find((m) => m.user.id !== user?.id)?.user;
      return other?.name.toLowerCase().includes(q);
    });
  }, [rooms, q, user?.id]);

  const sections = useMemo(() => {
    const group = filteredRooms.filter((r) => r.type === 'GROUP');
    const dms = filteredRooms.filter((r) => r.type === 'DIRECT');
    const result: { title: string; data: ChatRoom[] }[] = [];
    if (group.length) result.push({ title: 'Group', data: group });
    if (dms.length) result.push({ title: 'Direct Messages', data: dms });
    return result;
  }, [filteredRooms]);

  const headerOffset = insets.top + 56;

  return (
    <LinearGradient colors={[...colors.backgroundGradient]} style={styles.screen}>
      <View style={[styles.container, { paddingTop: headerOffset }]}>
        {/* AI Coach banner */}
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => navigation.navigate('AiCoach')}
          style={{ marginHorizontal: SPACING.md, marginBottom: SPACING.md }}
        >
          <LinearGradient
            colors={['#FF4F18', '#FF1744']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.aiCoachBanner}
          >
            <View style={styles.aiCoachIcon}>
              <Ionicons name="fitness" size={22} color="#FF4F18" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.aiCoachTitle}>FitCoach AI</Text>
              <Text style={styles.aiCoachSub}>Your personal fitness &amp; nutrition assistant</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Search */}
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search conversations…"
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.text }]}
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : error ? (
          <View style={[styles.centered, { padding: SPACING.lg }]}>
            <EmptyState
              icon="warning-outline"
              title="Oops, something went wrong!"
              subtitle={error}
              actionLabel="Try Again"
              onAction={() => { setLoading(true); loadRooms(); }}
            />
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(r) => r.id}
            contentContainerStyle={styles.list}
            stickySectionHeadersEnabled={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => { setRefreshing(true); loadRooms(); }}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="chatbubbles-outline" size={48} color={colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No chats found</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                  {search ? 'Try a different search' : 'Your gym chats will appear here'}
                </Text>
              </View>
            }
            renderSectionHeader={({ section: { title } }) => (
              <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>{title}</Text>
            )}
            renderItem={({ item }) => (
              <RoomItem
                room={item}
                currentUserId={user?.id || ''}
                colors={colors}
                onPress={() => openRoom(item)}
              />
            )}
            ItemSeparatorComponent={() => <View style={{ height: SPACING.sm }} />}
          />
        )}
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    paddingVertical: 0,
  },
  list: {
    paddingHorizontal: SPACING.md,
    paddingBottom: 110,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: SPACING.sm,
    marginTop: SPACING.xs,
  },
  roomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  roomInfo: {
    flex: 1,
    minWidth: 0,
  },
  roomTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  roomName: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    flex: 1,
  },
  timeText: {
    fontSize: 11,
    flexShrink: 0,
  },
  roomBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 3,
    gap: 8,
  },
  previewText: {
    fontSize: FONT_SIZE.xs,
    flex: 1,
  },
  previewEmpty: {
    fontStyle: 'italic',
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: FONT_SIZE.xs,
    textAlign: 'center',
  },
  aiCoachBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  aiCoachIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  aiCoachTitle: {
    color: '#fff',
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
  },
  aiCoachSub: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: FONT_SIZE.xs,
    marginTop: 1,
  },
});
