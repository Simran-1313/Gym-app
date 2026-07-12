import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

import { chatService, ChatMessage, ChatRoom } from '../../services/chat.service';
import { uploadToCloudinary } from '../../services/cloudinary';
import { connectSocket } from '../../services/socket';
import { DARK_COLORS, LIGHT_COLORS, SPACING, RADIUS, FONT_SIZE } from '../../config/theme';
import { useAuth } from '../../context/AuthContext';
import type { ChatStackParams } from '../../navigation/AppNavigator';
import { EmojiPicker } from '../../components/chat/EmojiPicker';
import { EmptyState } from '../../components/ui/EmptyState';

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
}

const MessageTick: React.FC<TickProps> = ({ statuses, senderId, currentUserId, memberCount, pending, failed }) => {
  if (senderId !== currentUserId) return null;

  if (failed) return <Ionicons name="alert-circle" size={13} color="#FCA5A5" />;
  if (pending) return <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.55)" />;

  const others = statuses.filter((s) => s.userId !== currentUserId);
  const expectedOthers = memberCount - 1; // exclude sender

  if (expectedOthers === 0) return <Ionicons name="checkmark" size={12} color="rgba(255,255,255,0.5)" />;

  const allRead = others.length > 0 && others.every((s) => s.status === 'READ');
  const allDelivered = others.length > 0 && others.every((s) => s.status !== 'SENT');

  if (allRead) return <Ionicons name="checkmark-done" size={12} color="#60A5FA" />;
  if (allDelivered) return <Ionicons name="checkmark-done" size={12} color="rgba(255,255,255,0.55)" />;
  return <Ionicons name="checkmark" size={12} color="rgba(255,255,255,0.5)" />;
};

// ── Message Bubble ────────────────────────────────────────────────────────────

interface BubbleProps {
  msg: ChatMessage;
  isOwn: boolean;
  showSender: boolean;
  isGroupChat: boolean;
  memberCount: number;
  currentUserId: string;
  colors: typeof DARK_COLORS;
  onRetry: (msg: ChatMessage) => void;
}

const MessageBubble: React.FC<BubbleProps> = ({
  msg, isOwn, showSender, isGroupChat, memberCount, currentUserId, colors, onRetry,
}) => {
  const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const bubbleInner = (
    <View
      style={[
        styles.bubble,
        msg.type === 'IMAGE' ? styles.bubbleImage : null,
        isOwn && msg.type !== 'IMAGE'
          ? [styles.bubbleOwn, { backgroundColor: '#007AFF', opacity: msg.pending ? 0.7 : 1 }]
          : msg.type !== 'IMAGE'
            ? [styles.bubbleOther, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]
            : { opacity: msg.pending ? 0.7 : 1 },
      ]}
    >
      {msg.type === 'IMAGE' ? (
        <Image
          source={{ uri: msg.content }}
          style={styles.chatImage}
          resizeMode="cover"
        />
      ) : (
        <Text style={[styles.msgText, { color: isOwn ? '#fff' : colors.text }]}>
          {msg.content}
        </Text>
      )}
      <View style={styles.msgFooter}>
        {msg.failed && (
          <Text style={styles.failedText}>Failed · tap to retry</Text>
        )}
        <Text style={[styles.msgTime, { color: isOwn ? 'rgba(255,255,255,0.55)' : colors.textMuted }]}>
          {time}
        </Text>
        {isOwn && (
          <MessageTick
            statuses={msg.statuses}
            senderId={msg.senderId}
            currentUserId={currentUserId}
            memberCount={memberCount}
            pending={msg.pending}
            failed={msg.failed}
          />
        )}
      </View>
    </View>
  );

  return (
    <View style={[styles.bubbleRow, isOwn ? styles.bubbleRowOwn : styles.bubbleRowOther]}>
      {!isOwn && isGroupChat && showSender && (
        <View style={[styles.avatarSmall, { backgroundColor: `${colors.info}25` }]}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.info }}>
            {msg.sender.name.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      {!isOwn && isGroupChat && !showSender && <View style={{ width: 26 }} />}

      <View style={{ maxWidth: '75%' }}>
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
      </View>
    </View>
  );
};

// ── Typing indicator ──────────────────────────────────────────────────────────

const TypingIndicator: React.FC<{ names: string[]; colors: typeof DARK_COLORS }> = ({ names, colors }) => {
  if (!names.length) return null;
  const label = names.length === 1 ? `${names[0]} is typing...` : `${names.join(', ')} are typing...`;
  return (
    <View style={styles.typingRow}>
      <Text style={[styles.typingText, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
};

// ── Main Screen ───────────────────────────────────────────────────────────────

export const ChatRoomScreen: React.FC = () => {
  const { user, theme } = useAuth();
  const isDark = theme === 'dark';
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;
  const insets = useSafeAreaInsets();
  const route = useRoute<ChatRoomRoute>();
  const { roomId } = route.params;

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
      (m) => m.senderId !== user.id && !m.statuses.some((s) => s.userId === user.id && s.status === 'READ')
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
      <LinearGradient
        colors={[...colors.backgroundGradient]}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </LinearGradient>
    );
  }

  if (error) {
    return (
      <LinearGradient
        colors={[...colors.backgroundGradient]}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.lg }}
      >
        <EmptyState
          icon="warning-outline"
          title="Oops, something went wrong!"
          subtitle={error}
          actionLabel="Try Again"
          onAction={() => { setLoading(true); loadMessages(); }}
        />
      </LinearGradient>
    );
  }

  const headerOffset = insets.top + 56;

  return (
    <LinearGradient colors={[...colors.backgroundGradient]} style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? headerOffset : 0}
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
              paddingTop: headerOffset + SPACING.sm,
              paddingBottom: SPACING.md,
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

        <TypingIndicator names={Object.values(typingUsers)} colors={colors} />

        <View
          style={[
            styles.inputBar,
            {
              paddingBottom: Math.max(insets.bottom, 12),
              backgroundColor: colors.surface,
              borderTopColor: colors.surfaceBorder,
            },
          ]}
        >
          <EmojiPicker
            visible={showEmojiPicker}
            onClose={() => setShowEmojiPicker(false)}
            onSelect={insertEmoji}
            isDark={isDark}
          />
          {!isConnected && (
            <Text style={[styles.reconnectText, { color: colors.warning }]}>Reconnecting…</Text>
          )}
          <View style={[styles.inputRow, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <TouchableOpacity
              onPress={() => setShowEmojiPicker((v) => !v)}
              style={styles.attachBtn}
              activeOpacity={0.7}
            >
              <Ionicons
                name={showEmojiPicker ? 'happy' : 'happy-outline'}
                size={22}
                color={showEmojiPicker ? colors.primary : colors.textSecondary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={pickAndSendImage}
              disabled={uploadingImage}
              style={styles.attachBtn}
              activeOpacity={0.7}
            >
              {uploadingImage ? (
                <ActivityIndicator size="small" color={colors.info} />
              ) : (
                <Ionicons name="image-outline" size={22} color={colors.info} />
              )}
            </TouchableOpacity>
            <TextInput
              value={input}
              onChangeText={handleTyping}
              placeholder="Type a message…"
              placeholderTextColor={colors.textMuted}
              style={[styles.textInput, { color: colors.text }]}
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
                { backgroundColor: input.trim() ? '#007AFF' : colors.card },
              ]}
              activeOpacity={0.7}
            >
              <Ionicons name="send" size={16} color={input.trim() ? '#fff' : colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  messageList: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: FONT_SIZE.sm,
  },
  bubbleRow: {
    flexDirection: 'row',
    marginBottom: 4,
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
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    marginBottom: 2,
    paddingLeft: 4,
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  bubbleOwn: {
    borderRadius: 16,
    borderTopRightRadius: 4,
    borderWidth: 0,
  },
  bubbleOther: {
    borderTopLeftRadius: 4,
  },
  bubbleImage: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  chatImage: {
    width: 220,
    height: 220,
    borderRadius: 12,
    backgroundColor: 'rgba(128,128,128,0.15)',
  },
  attachBtn: {
    width: 32,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  msgText: {
    fontSize: FONT_SIZE.sm,
    lineHeight: 20,
  },
  msgFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 3,
    marginTop: 2,
  },
  msgTime: {
    fontSize: 10,
  },
  failedText: {
    fontSize: 10,
    color: '#FCA5A5',
    marginRight: 2,
  },
  typingRow: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
  },
  typingText: {
    fontSize: FONT_SIZE.xs,
    fontStyle: 'italic',
  },
  inputBar: {
    borderTopWidth: 1,
    paddingTop: 8,
    paddingHorizontal: SPACING.md,
    position: 'relative',
    zIndex: 10,
  },
  reconnectText: {
    textAlign: 'center',
    fontSize: FONT_SIZE.xs,
    marginBottom: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    paddingLeft: 14,
    paddingRight: 4,
    paddingVertical: 6,
  },
  textInput: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    lineHeight: 20,
    maxHeight: 100,
    paddingTop: 2,
    paddingBottom: 2,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreRow: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  loadMoreBtn: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  loadMoreText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
  },
});
