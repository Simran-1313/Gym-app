import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

import { chatService, deletedLabel, ChatMessage, ChatRoom } from '../../services/chat.service';
import { uploadToCloudinary } from '../../services/cloudinary';
import { connectSocket } from '../../services/socket';
import { COMPOSER, FONTS, RADIUS } from '../../config/theme';
import { shade } from '../../utils/color';
import type { ThemeColors } from '../../config/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useAuth } from '../../context/AuthContext';
import type { ChatStackParams } from '../../navigation/AppNavigator';
import { EmojiPicker } from '../../components/chat/EmojiPicker';
import { EmptyState } from '../../components/ui/EmptyState';
import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

/**
 * Ported from `#screen-chat-thread` in docs/UI_PROTOTYPE.html.
 *
 * `.bubble` (max-width 78%, 11/14 padding, 12.5/1.5 type, 5-16-16-16 /
 * 16-5-16-16 corner pairs for them/me), `.bubble-img` (58% wide, no
 * padding), `.typing-row` (a received-style bubble holding three bouncing
 * dots) and `.chat-input` (39px circular icon buttons + a 100px pill input +
 * a teal circular send button) are all lifted from that file's stylesheet.
 *
 * The prototype's navbar also shows an "Active now" presence line under the
 * coach's name — this backend has no presence/online signal for the other
 * member, so that line is replaced with something we can say truthfully:
 * the socket's own connection state, and a member count for group threads.
 */

type ChatRoomRoute = RouteProp<ChatStackParams, 'ChatRoom'>;


// ── Tick ─────────────────────────────────────────────────────────────────────

type StatusType = 'SENT' | 'DELIVERED' | 'READ';

interface TickProps {
  statuses: { userId: string; status: StatusType }[];
  senderId: string;
  currentUserId: string;
  memberCount: number;
  pending?: boolean;
  failed?: boolean;
  colors: ThemeColors;
}

const MessageTick: React.FC<TickProps> = ({ statuses, senderId, currentUserId, memberCount, pending, failed, colors }) => {
  if (senderId !== currentUserId) return null;

  // The "me" bubble fills colors.primarySolid and always carries white text
  // (see AnimatedButton's ON_SOLID) — its own ticks/timestamp dim from white,
  // not from colors.text*, which could be near-invisible on a solid teal fill.
  const onTeal = '#FFFFFF';
  const onTealDim = 'rgba(255,255,255,0.55)';

  if (failed) return <Ionicons name="alert-circle" size={13} color={colors.danger} />;
  if (pending) return <Ionicons name="time-outline" size={12} color={onTealDim} />;

  const others = statuses.filter((s) => s.userId !== currentUserId);
  const expectedOthers = memberCount - 1; // exclude sender

  if (expectedOthers === 0) return <Ionicons name="checkmark" size={13} color={onTealDim} />;

  const allRead = others.length > 0 && others.every((s) => s.status === 'READ');
  const allDelivered = others.length > 0 && others.every((s) => s.status !== 'SENT');

  if (allRead) return <Ionicons name="checkmark-done" size={13} color={onTeal} />;
  if (allDelivered) return <Ionicons name="checkmark-done" size={13} color={onTealDim} />;
  return <Ionicons name="checkmark" size={13} color={onTealDim} />;
};

// ── Message Bubble (`.bubble`, `.bubble.them`, `.bubble.me`, `.bubble-img`) ──

interface BubbleProps {
  msg: ChatMessage;
  isOwn: boolean;
  showSender: boolean;
  isGroupChat: boolean;
  memberCount: number;
  currentUserId: string;
  colors: ThemeColors;
  onRetry: (msg: ChatMessage) => void;
}

const MessageBubble: React.FC<BubbleProps> = ({
  msg, isOwn, showSender, isGroupChat, memberCount, currentUserId, colors, onRetry,
}) => {
  const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const bubbleInner = msg.isDeleted ? (
    <View
      style={[
        styles.bubble,
        isOwn ? styles.bubbleCornerOwn : styles.bubbleCornerOther,
        styles.bubbleDeleted,
        { borderColor: colors.surfaceBorder },
      ]}
    >
      <View style={styles.deletedRow}>
        <Ionicons name="ban-outline" size={13} color={colors.textMuted} />
        <Text style={[styles.deletedText, { color: colors.textMuted }]}>
          {deletedLabel(msg, currentUserId)}
        </Text>
      </View>
    </View>
  ) : msg.type === 'IMAGE' ? (
    <View
      style={[
        styles.bubbleImageWrap,
        isOwn ? styles.bubbleCornerOwn : styles.bubbleCornerOther,
        { opacity: msg.pending ? 0.7 : 1 },
      ]}
    >
      <Image source={{ uri: msg.content }} style={styles.chatImage} resizeMode="cover" />
    </View>
  ) : (
    <View
      style={[
        styles.bubble,
        isOwn ? styles.bubbleCornerOwn : styles.bubbleCornerOther,
        isOwn
          ? [styles.bubbleOwn, { backgroundColor: colors.primarySolid, opacity: msg.pending ? 0.7 : 1 }]
          : [styles.bubbleOther, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }],
      ]}
    >
      <Text style={[styles.msgText, { color: isOwn ? '#FFFFFF' : colors.text }]}>
        {msg.content}
      </Text>
    </View>
  );

  return (
    <View style={[styles.bubbleRow, isOwn ? styles.bubbleRowOwn : styles.bubbleRowOther]}>
      {!isOwn && isGroupChat && showSender && (
        <View style={[styles.avatarSmall, { backgroundColor: `${colors.info}25` }]}>
          <Text style={{ fontSize: 10, fontFamily: FONTS.bodyBold, color: colors.info }}>
            {msg.sender.name.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      {!isOwn && isGroupChat && !showSender && <View style={{ width: 26 }} />}

      <View style={{ maxWidth: '78%' }}>
        {!isOwn && isGroupChat && showSender && (
          <Text style={[styles.senderName, { color: colors.info }]}>
            {msg.sender.name} · {msg.sender.role === 'ADMIN' ? 'Admin' : 'Member'}
          </Text>
        )}

        {msg.failed ? (
          <TouchableOpacity activeOpacity={0.7} onPress={() => onRetry(msg)}>
            {bubbleInner}
          </TouchableOpacity>
        ) : (
          bubbleInner
        )}

        {/* `.msg-receipt` — a meta row under the bubble, not packed into its corner. */}
        <View style={[styles.msgFooter, isOwn ? styles.msgFooterOwn : styles.msgFooterOther]}>
          {msg.failed && <Text style={[styles.failedText, { color: colors.danger }]}>Failed · tap to retry</Text>}
          <Text style={[styles.msgTime, { color: colors.textMuted }]}>{time}</Text>
          {isOwn && (
            <MessageTick
              statuses={msg.statuses}
              senderId={msg.senderId}
              currentUserId={currentUserId}
              memberCount={memberCount}
              pending={msg.pending}
              failed={msg.failed}
              colors={colors}
            />
          )}
        </View>
      </View>
    </View>
  );
};

// ── Typing indicator (`.typing-row`, three bouncing `.typing-dot`s) ─────────

const TypingDot: React.FC<{ delay: number; colors: ThemeColors }> = ({ delay, colors }) => {
  const y = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    // Mirrors `@keyframes typingBounce` (1.2s cycle, translateY -4 / opacity
    // 1 at the 30% mark) with each dot's CSS `animation-delay` reproduced as
    // a one-time startup delay before its own infinite loop begins.
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(y, { toValue: -4, duration: 360, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: 360, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(y, { toValue: 0, duration: 360, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.5, duration: 360, useNativeDriver: true }),
        ]),
        Animated.delay(480),
      ]),
    );
    const timer = setTimeout(() => loop.start(), delay);
    return () => { clearTimeout(timer); loop.stop(); };
  }, [y, opacity, delay]);

  return (
    <Animated.View
      style={[
        styles.typingDot,
        { backgroundColor: colors.textMuted, opacity, transform: [{ translateY: y }] },
      ]}
    />
  );
};

const TypingIndicator: React.FC<{ names: string[]; colors: ThemeColors }> = ({ names, colors }) => {
  if (!names.length) return null;
  return (
    <View style={styles.bubbleRow}>
      <View style={[styles.typingRow, { backgroundColor: colors.surface }]}>
        <TypingDot delay={0} colors={colors} />
        <TypingDot delay={150} colors={colors} />
        <TypingDot delay={300} colors={colors} />
      </View>
    </View>
  );
};

// ── Main Screen ───────────────────────────────────────────────────────────────

export const ChatRoomScreen: React.FC = () => {
  const { user, theme } = useAuth();
  const isDark = theme === 'dark';
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<ChatRoomRoute>();
  const { roomId, roomName } = route.params;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [roomMembers, setRoomMembers] = useState<{ user: { id: string; name: string; role: string } }[]>([]);
  const [isGroupChat, setIsGroupChat] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const socketRef = useRef<Awaited<ReturnType<typeof connectSocket>> | null>(null);

  // The header is now the shared, uniform ScreenHeader — no room for a
  // status line there. The one functional piece of that old subtitle (a real
  // disconnect happening right now) is already surfaced elsewhere, next to
  // the input bar — nothing here needs replacing, just the header markup.

  // ── Load messages ─────────────────────────────────────────────────────────

  const loadMessages = useCallback(async (cursor?: string) => {
    try {
      if (cursor) setLoadingMore(true);
      if (!cursor) setError(null);
      const data = await chatService.getMessages(roomId, cursor);
      if (cursor) {
        setMessages((prev) => [...data.messages, ...prev]);
      } else {
        setMessages(data.messages);
      }
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (err: any) {
      if (!cursor) setError(err.message || 'Failed to load messages');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [roomId]);

  // ── Mark messages as read ─────────────────────────────────────────────────

  const markRead = useCallback(async (msgs: ChatMessage[]) => {
    if (!user) return;
    const unreadIds = msgs.filter(
      (m) => m.senderId !== user.id && !m.isDeleted &&
        !m.statuses.some((s) => s.userId === user.id && s.status === 'READ')
    ).map((m) => m.id);

    if (!unreadIds.length) return;

    try {
      await chatService.markRead(roomId, unreadIds);
      socketRef.current?.emit('chat:read', { roomId, messageIds: unreadIds });
    } catch (_) {}
  }, [roomId, user]);

  // ── Load room info & join socket room ────────────────────────────────────

  useEffect(() => {
    let mounted = true;

    const setup = async () => {
      try {
        // Load room info to get member list
        const rooms = await chatService.getRooms();
        const room = rooms.find((r) => r.id === roomId);
        if (mounted && room) {
          setRoomMembers(room.members);
          setIsGroupChat(room.type === 'GROUP');
        }
      } catch (_) {}

      await loadMessages();

      const socket = await connectSocket();
      if (!mounted) return;
      socketRef.current = socket;

      setIsConnected(socket.connected);
      socket.on('connect', () => setIsConnected(true));
      socket.on('disconnect', () => setIsConnected(false));

      socket.on('chat:message', (msg: ChatMessage) => {
        if (msg.roomId !== roomId) return;
        setMessages((prev) => {
          // Reconcile our own optimistic message with the server echo
          if (msg.clientId) {
            const tmpIdx = prev.findIndex((m) => m.id === msg.clientId);
            if (tmpIdx !== -1) {
              const next = [...prev];
              next[tmpIdx] = { ...msg, pending: false, failed: false };
              return next;
            }
          }
          // Fallback: match a still-pending optimistic message by content
          // (covers the case where the server echo lacks clientId)
          if (user && msg.senderId === user.id) {
            const pendIdx = prev.findIndex(
              (m) => m.pending && m.senderId === user.id && m.content === msg.content
            );
            if (pendIdx !== -1) {
              const next = [...prev];
              next[pendIdx] = { ...msg, pending: false, failed: false };
              return next;
            }
          }
          // Dedupe by real id (multi-device / re-broadcast)
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });

        // Auto-deliver for messages from others
        if (user && msg.senderId !== user.id) {
          socket.emit('chat:delivered', { messageId: msg.id, roomId });
          // Mark as read since we're in the room
          chatService.markRead(roomId, [msg.id]).catch(() => {});
          socket.emit('chat:read', { roomId, messageIds: [msg.id] });
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
      });

      socket.on('chat:status_update', ({ messageId, userId, status }: { messageId: string; userId: string; status: 'SENT' | 'DELIVERED' | 'READ' }) => {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== messageId) return m;
            const existing = m.statuses.find((s) => s.userId === userId);
            if (existing) return { ...m, statuses: m.statuses.map((s) => s.userId === userId ? { ...s, status } : s) };
            return { ...m, statuses: [...m.statuses, { userId, status }] };
          })
        );
      });

      socket.on('chat:status_update_bulk', ({ messageIds, userId, status }: { messageIds: string[]; userId: string; status: 'SENT' | 'DELIVERED' | 'READ' }) => {
        const idSet = new Set(messageIds);
        setMessages((prev) =>
          prev.map((m) => {
            if (!idSet.has(m.id)) return m;
            const existing = m.statuses.find((s) => s.userId === userId);
            if (existing) return { ...m, statuses: m.statuses.map((s) => s.userId === userId ? { ...s, status } : s) };
            return { ...m, statuses: [...m.statuses, { userId, status }] };
          })
        );
      });

      // An admin (or the sender) deleted a message — leave a tombstone in place
      socket.on('chat:message_deleted', (
        { messageId, roomId: rid, deletedById }: { messageId: string; roomId: string; deletedById: string }
      ) => {
        if (rid !== roomId) return;
        setMessages((prev) => prev.map((m) => (
          m.id === messageId
            ? { ...m, isDeleted: true, deletedById, content: '', type: 'TEXT' as const }
            : m
        )));
      });

      socket.on('chat:typing', ({ userId: tid, name, roomId: rid }: { userId: string; name: string; roomId: string }) => {
        if (rid !== roomId) return;
        setTypingUsers((prev) => ({ ...prev, [tid]: name }));
      });

      socket.on('chat:stop_typing', ({ userId: tid, roomId: rid }: { userId: string; roomId: string }) => {
        if (rid !== roomId) return;
        setTypingUsers((prev) => {
          const next = { ...prev };
          delete next[tid];
          return next;
        });
      });
    };

    setup();

    return () => {
      mounted = false;
      const socket = socketRef.current;
      if (socket) {
        socket.off('connect');
        socket.off('disconnect');
        socket.off('chat:message');
        socket.off('chat:status_update');
        socket.off('chat:status_update_bulk');
        socket.off('chat:message_deleted');
        socket.off('chat:typing');
        socket.off('chat:stop_typing');
      }
    };
  }, [roomId]);

  // ── Mark read when messages load ──────────────────────────────────────────

  useEffect(() => {
    if (messages.length) markRead(messages);
  }, [messages.length]);

  // ── Scroll to bottom on initial load ─────────────────────────────────────

  useEffect(() => {
    if (!loading && messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
    }
  }, [loading]);

  // ── Send message ──────────────────────────────────────────────────────────

  const emitMessage = useCallback((
    content: string,
    clientId: string,
    type: 'TEXT' | 'IMAGE' = 'TEXT',
  ) => {
    const socket = socketRef.current;
    if (!socket) return;

    socket.emit(
      'chat:send',
      { roomId, content, clientId, type },
      (ack: { success: boolean; message?: ChatMessage }) => {
        if (!ack?.success) {
          setMessages((prev) =>
            prev.map((m) => (m.id === clientId ? { ...m, pending: false, failed: true } : m))
          );
        }
      }
    );
  }, [roomId]);

  const sendMessage = useCallback(() => {
    const content = input.trim();
    if (!content || !user) return;

    const clientId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimistic: ChatMessage = {
      id: clientId,
      clientId,
      roomId,
      senderId: user.id,
      sender: { id: user.id, name: user.name, avatarUrl: user.avatarUrl ?? null, role: 'MEMBER' },
      content,
      type: 'TEXT',
      createdAt: new Date().toISOString(),
      statuses: [],
      pending: true,
    };

    // Render instantly + clear input — zero perceived latency
    setInput('');
    setShowEmojiPicker(false);
    setMessages((prev) => [...prev, optimistic]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socketRef.current?.emit('chat:stop_typing', { roomId });

    emitMessage(content, clientId);
  }, [input, roomId, user, emitMessage]);

  const pickAndSendImage = useCallback(async () => {
    if (!user || uploadingImage) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo access to share images in chat.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
    });

    if (result.canceled || !result.assets[0]?.uri) return;

    const localUri = result.assets[0].uri;
    const clientId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimistic: ChatMessage = {
      id: clientId,
      clientId,
      roomId,
      senderId: user.id,
      sender: { id: user.id, name: user.name, avatarUrl: user.avatarUrl ?? null, role: 'MEMBER' },
      content: localUri,
      type: 'IMAGE',
      createdAt: new Date().toISOString(),
      statuses: [],
      pending: true,
    };

    setMessages((prev) => [...prev, optimistic]);
    setUploadingImage(true);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);

    try {
      const { secure_url } = await uploadToCloudinary(localUri, 'gym-chat');
      setMessages((prev) =>
        prev.map((m) => (m.id === clientId ? { ...m, content: secure_url } : m))
      );
      emitMessage(secure_url, clientId, 'IMAGE');
    } catch (err) {
      console.error('[ChatRoom] Image upload failed', err);
      setMessages((prev) =>
        prev.map((m) => (m.id === clientId ? { ...m, pending: false, failed: true } : m))
      );
      Alert.alert('Upload failed', 'Could not send image. Tap the message to retry.');
    } finally {
      setUploadingImage(false);
    }
  }, [user, uploadingImage, roomId, emitMessage]);

  const retryMessage = useCallback(async (msg: ChatMessage) => {
    if (msg.type === 'IMAGE' && !/^https?:\/\//i.test(msg.content)) {
      setMessages((prev) => prev.filter((m) => m.id !== msg.id));
      await pickAndSendImage();
      return;
    }
    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, pending: true, failed: false } : m))
    );
    emitMessage(msg.content, msg.id, msg.type);
  }, [emitMessage, pickAndSendImage]);

  // ── Typing ────────────────────────────────────────────────────────────────

  const handleTyping = (val: string) => {
    setInput(val);
    if (showEmojiPicker) setShowEmojiPicker(false);
    socketRef.current?.emit('chat:typing', { roomId });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('chat:stop_typing', { roomId });
    }, 2500);
  };

  const insertEmoji = (emoji: string) => {
    setInput((prev) => {
      const next = `${prev}${emoji}`;
      return next.length > 4000 ? prev : next;
    });
    setShowEmojiPicker(false);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <AnimatedScreen>
        <ScreenHeader title={roomName} onBack={() => navigation.goBack()} />
        <LoadingSpinner fullScreen />
      </AnimatedScreen>
    );
  }

  if (error) {
    return (
      <AnimatedScreen>
        <ScreenHeader title={roomName} onBack={() => navigation.goBack()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <EmptyState
            icon="warning-outline"
            title="Couldn’t load this conversation"
            subtitle={error}
            actionLabel="Try Again"
            onAction={() => { setLoading(true); loadMessages(); }}
          />
        </View>
      </AnimatedScreen>
    );
  }

  return (
    <AnimatedScreen>
      <ScreenHeader title={roomName} onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={flatListRef}
          style={styles.messageList}
          data={messages}
          keyExtractor={(m) => m.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={[
            styles.messagesList,
            {
              paddingTop: 12,
              paddingBottom: 12,
              flexGrow: 1,
              justifyContent: messages.length ? 'flex-end' : 'flex-start',
            },
          ]}
          onStartReachedThreshold={0.3}
          onStartReached={() => {
            if (hasMore && !loadingMore) loadMessages(nextCursor ?? undefined);
          }}
          ListHeaderComponent={
            loadingMore ? (
              <View style={styles.loadMoreRow}>
                <ActivityIndicator size="small" color={colors.info} />
              </View>
            ) : hasMore ? (
              <TouchableOpacity onPress={() => loadMessages(nextCursor ?? undefined)} style={styles.loadMoreBtn}>
                <Text style={[styles.loadMoreText, { color: colors.info }]}>Load earlier messages</Text>
              </TouchableOpacity>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="chatbubble-ellipses-outline" size={40} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No messages yet. Say hello!</Text>
            </View>
          }
          ListFooterComponent={
            Object.keys(typingUsers).length
              ? <TypingIndicator names={Object.values(typingUsers)} colors={colors} />
              : null
          }
          renderItem={({ item, index }) => {
            const prev = messages[index - 1];
            const showSender = !prev || prev.senderId !== item.senderId;
            return (
              <MessageBubble
                msg={item}
                isOwn={item.senderId === user?.id}
                showSender={showSender}
                isGroupChat={isGroupChat}
                memberCount={roomMembers.length}
                currentUserId={user?.id || ''}
                colors={colors}
                onRetry={retryMessage}
              />
            );
          }}
        />

        {/* `.chat-input` */}
        <View style={styles.inputBarWrap}>
          <EmojiPicker
            visible={showEmojiPicker}
            onClose={() => setShowEmojiPicker(false)}
            onSelect={insertEmoji}
            isDark={isDark}
          />
          {!isConnected && (
            <Text style={[styles.reconnectText, { color: colors.warning }]}>Reconnecting…</Text>
          )}
          <View
            style={[
              styles.chatInput,
              { paddingBottom: Math.max(insets.bottom, 14) },
            ]}
          >
            <TouchableOpacity
              onPress={() => setShowEmojiPicker((v) => !v)}
              style={[styles.chatIconBtn, { backgroundColor: colors.inset }]}
              activeOpacity={0.7}
            >
              <Ionicons
                name={showEmojiPicker ? 'happy' : 'happy-outline'}
                size={20}
                color={showEmojiPicker ? colors.primary : colors.textMuted}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={pickAndSendImage}
              disabled={uploadingImage}
              style={[styles.chatIconBtn, { backgroundColor: colors.inset }]}
              activeOpacity={0.7}
            >
              {uploadingImage ? (
                <ActivityIndicator size="small" color={colors.info} />
              ) : (
                <Ionicons name="image-outline" size={20} color={colors.textMuted} />
              )}
            </TouchableOpacity>
            <TextInput
              value={input}
              onChangeText={handleTyping}
              placeholder={`Message ${roomName}…`}
              placeholderTextColor={colors.textMuted}
              style={[
                styles.textInput,
                { color: colors.text, backgroundColor: colors.surface, borderColor: colors.overlayBorder },
              ]}
              multiline
              maxLength={4000}
              returnKeyType="send"
              onSubmitEditing={sendMessage}
              blurOnSubmit={false}
            />
            <TouchableOpacity
              onPress={sendMessage}
              disabled={!input.trim()}
              style={[
                styles.sendBtn,
                { backgroundColor: input.trim() ? colors.primarySolid : colors.inset },
              ]}
              activeOpacity={0.7}
            >
              <Ionicons name="send" size={15} color={input.trim() ? '#FFFFFF' : colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </AnimatedScreen>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  messageList: {
    flex: 1,
  },
  // .chat-msgs { gap:10px; padding:12px 16px }
  messagesList: {
    paddingHorizontal: 16,
    gap: 10,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 13,
  },
  bubbleRow: {
    flexDirection: 'row',
    gap: 6,
  },
  bubbleRowOwn: {
    justifyContent: 'flex-end',
  },
  bubbleRowOther: {
    justifyContent: 'flex-start',
  },
  avatarSmall: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    flexShrink: 0,
  },
  senderName: {
    fontSize: 11,
    fontFamily: FONTS.bodySemi,
    marginBottom: 2,
    paddingLeft: 4,
  },
  // .bubble { max-width:78%; padding:11px 14px; font-size:12.5px; line-height:1.5 }
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  // .bubble.me { radius: 16 5 16 16 }
  bubbleCornerOwn: {
    borderTopRightRadius: 5,
  },
  // .bubble.them { radius: 5 16 16 16 }
  bubbleCornerOther: {
    borderTopLeftRadius: 5,
  },
  bubbleOwn: {
    borderWidth: 0,
  },
  bubbleOther: {
    borderWidth: 1,
  },
  bubbleDeleted: {
    borderStyle: 'dashed',
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  deletedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  deletedText: {
    fontSize: 12.5,
    fontStyle: 'italic',
  },
  // .bubble-img { width:58%; radius: (see corner styles); overflow:hidden }
  bubbleImageWrap: {
    width: '58%',
    overflow: 'hidden',
  },
  chatImage: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: 'rgba(128,128,128,0.15)',
  },
  msgText: {
    fontSize: 12.5,
    lineHeight: 18.5,
  },
  // .msg-receipt { row; justify-end; gap:3; margin-top:2 }
  msgFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 3,
    paddingHorizontal: 2,
  },
  msgFooterOwn: { justifyContent: 'flex-end' },
  msgFooterOther: { justifyContent: 'flex-start' },
  msgTime: {
    fontSize: 9.5,
  },
  failedText: {
    fontSize: 10,
    marginRight: 2,
  },
  // .typing-row { row; gap:4; padding:12px 16px; radius:5 16 16 16 }
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderTopLeftRadius: 5,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  // .chat-input { gap:9px; padding:11px 16px 14px }
  inputBarWrap: {
    position: 'relative',
  },
  reconnectText: {
    textAlign: 'center',
    fontSize: 11,
    marginBottom: 4,
  },
  chatInput: {
    flexDirection: 'row',
    // Buttons stay on the baseline row as the composer grows.
    alignItems: 'flex-end',
    gap: 9,
    paddingHorizontal: 16,
    paddingTop: 11,
  },
  // .chat-icon-btn { 39x39; radius:50% }
  chatIconBtn: {
    width: COMPOSER.buttonSize,
    height: COMPOSER.buttonSize,
    borderRadius: COMPOSER.buttonSize / 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  // .chat-input input { radius:100; padding:12px 16px; font-size:12.5px; border:hairline-strong }
  textInput: {
    flex: 1,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    paddingHorizontal: COMPOSER.paddingHorizontal,
    paddingTop: COMPOSER.paddingVertical,
    paddingBottom: COMPOSER.paddingVertical,
    minHeight: COMPOSER.minHeight,
    fontFamily: FONTS.body,
    fontSize: COMPOSER.fontSize,
    lineHeight: COMPOSER.lineHeight,
    includeFontPadding: false,
    textAlignVertical: 'center',
    maxHeight: 100,
  },
  // .send-btn { 39x39; radius:50% }
  sendBtn: {
    width: COMPOSER.buttonSize,
    height: COMPOSER.buttonSize,
    borderRadius: COMPOSER.buttonSize / 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  loadMoreRow: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  loadMoreBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  loadMoreText: {
    fontSize: 11,
    fontFamily: FONTS.bodySemi,
  },
});
