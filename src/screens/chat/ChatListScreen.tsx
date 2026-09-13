import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
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
import { useHeaderHeight } from '@react-navigation/elements';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';

import { chatService, deletedLabel, ChatRoom } from '../../services/chat.service';
import { connectSocket } from '../../services/socket';
import { FONTS, GRADIENTS, RADIUS } from '../../config/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import type { ThemeColors } from '../../config/theme';
import { useAuth } from '../../context/AuthContext';
import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { GlassCard } from '../../components/ui/GlassCard';
import { StaggerItem } from '../../components/ui/StaggerItem';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import type { ChatStackParams } from '../../navigation/AppNavigator';
import type { TabParams } from '../../navigation/AppNavigator';

/**
 * Ported from `#screen-chat` in docs/UI_PROTOTYPE.html.
 *
 * `.search-bar` (radius 14, 11/14 padding, gap 8), `.ai-banner` (a flat —
 * unrounded, per the prototype's own CSS — lavender-wash strip, not a
 * `.card`), `.section-label` (10.5/700 uppercase at .08em) and
 * `.thread-row` / `.avatar` / `.thread-meta` are all lifted from that file's
 * stylesheet rather than eyeballed.
 */

const GUTTER = 18; // .scroll { padding: 0 18px 18px }
const ROW_GAP = 9; // .thread-row { margin-bottom: 9px }
/** rgba(lavender, N) alpha suffixes for `colors.lavender` below — the
 *  prototype's fixed AI-Coach accent, distinct from the tenant-brandable teal. */
const LAV_WASH = '24'; // 0.14
const LAV_WASH_SOFT = '08'; // 0.03
const LAV_BORDER = '38'; // 0.22
const LAV_ICON_BG = '2E'; // 0.18

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

type ChatListNav = CompositeNavigationProp<
  NativeStackNavigationProp<ChatStackParams, 'ChatList'>,
  BottomTabNavigationProp<TabParams>
>;

/* ─── AI Coach banner (`.ai-banner`) ─── */

const AiBanner: React.FC<{ colors: ThemeColors; onPress: () => void }> = ({ colors, onPress }) => (
  <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
    <LinearGradient
      colors={[`${colors.lavender}${LAV_WASH}`, `${colors.lavender}${LAV_WASH_SOFT}`]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0.3 }}
      style={[styles.aiBanner, { borderColor: `${colors.lavender}${LAV_BORDER}` }]}
    >
      <View style={[styles.aiBannerIcon, { backgroundColor: `${colors.lavender}${LAV_ICON_BG}` }]}>
        <Ionicons name="shield-checkmark-outline" size={20} color={colors.lavender} />
        <View style={[styles.aiSparkle, { backgroundColor: colors.background }]}>
          <Ionicons name="sparkles" size={11} color={colors.warning} />
        </View>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.aiBannerTitle, { color: colors.lavender }]}>FitCoach AI</Text>
        <Text style={[styles.aiBannerSub, { color: colors.textSecondary }]}>
          Ask about your plan, form, or recovery — anytime
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={13} color={colors.textMuted} />
    </LinearGradient>
  </TouchableOpacity>
);

/* ─── Section label (`.section-label`) ─── */

const SectionLabel: React.FC<{ children: string; colors: ThemeColors }> = ({ children, colors }) => (
  <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{children}</Text>
);

/* ─── Thread row (`.card.tap.thread-row`) ─── */

interface RoomItemProps {
  room: ChatRoom;
  currentUserId: string;
  colors: ThemeColors;
  index: number;
  onPress: () => void;
}

const RoomItem: React.FC<RoomItemProps> = ({ room, currentUserId, colors, index, onPress }) => {
  const isGroup = room.type === 'GROUP';
  const otherUser = !isGroup
    ? room.members.find((m) => m.user.id !== currentUserId)?.user
    : null;

  const displayName = isGroup
    ? (room.name || 'Gym Group Chat')
    : (otherUser?.name || 'Direct Message');

  const lastMsg = room.messages?.[0] ?? null;
  const preview = !lastMsg
    ? 'No messages yet'
    : lastMsg.isDeleted
      ? deletedLabel(lastMsg, currentUserId)
      : lastMsg.type === 'IMAGE'
        ? (lastMsg.senderId === currentUserId ? 'You: Photo' : 'Photo')
        : (lastMsg.senderId === currentUserId ? `You: ${lastMsg.content}` : lastMsg.content);
  const time = lastMsg ? formatTime(lastMsg.createdAt) : '';
  const unread = room.unreadCount ?? 0;

  return (
    <StaggerItem index={index} style={{ marginBottom: ROW_GAP }}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
        <GlassCard innerStyle={styles.rowInner}>
          {isGroup ? (
            <LinearGradient colors={[...GRADIENTS.primary]} style={styles.avatar}>
              <Ionicons name="people" size={20} color="#07231F" />
            </LinearGradient>
          ) : (
            <View style={[styles.avatar, { backgroundColor: colors.inset }]}>
              <Text style={[styles.avatarText, { color: colors.primary }]}>
                {getInitials(displayName)}
              </Text>
            </View>
          )}

          <View style={styles.threadBody}>
            <Text style={[styles.threadTitle, { color: colors.text }]} numberOfLines={1}>
              {displayName}
            </Text>
            <Text
              style={[
                styles.threadSub,
                { color: lastMsg ? colors.textSecondary : colors.textMuted },
                !lastMsg && styles.threadSubEmpty,
              ]}
              numberOfLines={1}
            >
              {preview}
            </Text>
          </View>

          <View style={styles.threadMeta}>
            {!!time && <Text style={[styles.threadTime, { color: colors.textMuted }]}>{time}</Text>}
            {unread > 0 && (
              <View style={[styles.unreadDot, { backgroundColor: colors.primary }]}>
                <Text style={styles.unreadDotText}>{unread > 99 ? '99+' : unread}</Text>
              </View>
            )}
          </View>
        </GlassCard>
      </TouchableOpacity>
    </StaggerItem>
  );
};

export const ChatListScreen: React.FC = () => {
  const { user } = useAuth();
  const colors = useThemeColors();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<ChatListNav>();

  // `.nav-title` reads "Chat" in the prototype (the stack default is "Messages").
  useLayoutEffect(() => {
    navigation.setOptions({ title: 'Chat' });
  }, [navigation]);

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
    let unsubscribe: (() => void) | undefined;

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

      // A message was deleted — re-fetch so the preview reflects what's left
      const onMessageDeleted = () => { loadRooms(); };

      socket.on('chat:message', onMessage);
      socket.on('chat:message_deleted', onMessageDeleted);
      unsubscribe = () => {
        socket.off('chat:message', onMessage);
        socket.off('chat:message_deleted', onMessageDeleted);
      };
    });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [user?.id, loadRooms]);

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

  // Prototype order: Direct Messages, then Groups.
  const sections = useMemo(() => {
    const dms = filteredRooms.filter((r) => r.type === 'DIRECT');
    const group = filteredRooms.filter((r) => r.type === 'GROUP');
    const result: { title: string; data: ChatRoom[] }[] = [];
    if (dms.length) result.push({ title: 'Direct Messages', data: dms });
    if (group.length) result.push({ title: 'Groups', data: group });
    return result;
  }, [filteredRooms]);

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <AnimatedScreen>
      <SectionList
        sections={error ? [] : sections}
        keyExtractor={(r) => r.id}
        contentContainerStyle={[
          styles.content,
          { paddingTop: headerHeight + 8, paddingBottom: insets.bottom + 110 },
        ]}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadRooms(); }}
            tintColor={colors.primary}
            progressViewOffset={headerHeight}
          />
        }
        ListHeaderComponent={
          <View>
            <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
              <Ionicons name="search" size={15} color={colors.textMuted} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search messages…"
                placeholderTextColor={colors.textMuted}
                style={[styles.searchInput, { color: colors.text }]}
              />
              {!!search && (
                <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={15} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <AiBanner colors={colors} onPress={() => navigation.navigate('AiCoach')} />

            {error ? (
              <EmptyState
                icon="warning-outline"
                title="Oops, something went wrong!"
                subtitle={error}
                actionLabel="Try Again"
                onAction={() => { setLoading(true); loadRooms(); }}
              />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          !error ? (
            <EmptyState
              icon="chatbubbles-outline"
              title="No chats found"
              subtitle={search ? 'Try a different search' : 'Your gym chats will appear here'}
            />
          ) : null
        }
        renderSectionHeader={({ section: { title } }) => (
          <SectionLabel colors={colors}>{title}</SectionLabel>
        )}
        renderItem={({ item, index }) => (
          <RoomItem
            room={item}
            currentUserId={user?.id || ''}
            colors={colors}
            index={index}
            onPress={() => openRoom(item)}
          />
        )}
      />
    </AnimatedScreen>
  );
};

const styles = StyleSheet.create({
  content: { paddingHorizontal: GUTTER, paddingBottom: GUTTER },

  // .search-bar { gap:8; radius:14; padding:11px 14px; margin-bottom:14px }
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  searchInput: { flex: 1, fontSize: 13, fontFamily: FONTS.body, padding: 0 },

  // .ai-banner { gap:12; padding:15px; margin-bottom:16px } — no radius: the
  // prototype never gives this class a `.card`, unlike every other tile here.
  aiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 15,
    marginBottom: 16,
    borderWidth: 1,
  },
  // .ai-banner-icon { 42x42; radius:14 }
  aiBannerIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  // .ai-sparkle { top:-3; right:-3; 14x14 } — a tiny opaque disc under the
  // glyph stands in for the SVG's own transparent background.
  aiSparkle: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiBannerTitle: { fontSize: 13, fontFamily: FONTS.bodyBold },
  aiBannerSub: { fontSize: 11.5, marginTop: 2, fontFamily: FONTS.body },

  // .section-label { font-size:10.5; weight:700; letter-spacing:.08em; margin:14px 2px 10px }
  sectionLabel: {
    fontSize: 10.5,
    fontFamily: FONTS.bodyBold,
    letterSpacing: 0.84,
    textTransform: 'uppercase',
    marginTop: 14,
    marginBottom: 10,
    marginHorizontal: 2,
  },

  // .thread-row { gap:13; padding:14px 15px; margin-bottom:9px }
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 14,
    paddingHorizontal: 15,
  },

  // .avatar { 44x44; radius:50%; font-size:14; weight:700 }
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: { fontSize: 14, fontFamily: FONTS.bodyBold },

  threadBody: { flex: 1, minWidth: 0 },
  // .thread-title { font-size:13.5; weight:600 }
  threadTitle: { fontSize: 13.5, fontFamily: FONTS.bodySemi },
  // .thread-sub { font-size:12; margin-top:2 }
  threadSub: { fontSize: 12, marginTop: 2, fontFamily: FONTS.body },
  threadSubEmpty: { fontStyle: 'italic' },

  // .thread-meta { column; align:flex-end; gap:6 }
  threadMeta: { alignItems: 'flex-end', gap: 6, flexShrink: 0 },
  // .thread-time { font-size:10 }
  threadTime: { fontSize: 10 },
  // .unread-dot { min-width:17; height:17; padding:0 4; radius:9; font-size:9.5; weight:800 }
  unreadDot: {
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadDotText: { color: '#07231F', fontSize: 9.5, fontFamily: FONTS.bodyExtra },
});
