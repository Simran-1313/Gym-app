import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { streamAiCoachMessage, sendAiCoachMessage, ChatMessage } from '../../services/aiCoach.service';
import { DARK_COLORS, LIGHT_COLORS, SPACING, RADIUS, FONT_SIZE } from '../../config/theme';
import { useAuth } from '../../context/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LocalMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
  error?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  'What should I eat before a workout?',
  'Give me a 5-minute warm-up routine',
  'How much protein do I need daily?',
  'Best exercises for fat loss?',
];

let _msgId = 0;
const nextId = () => String(++_msgId);

// ─── Blinking cursor component ────────────────────────────────────────────────

const BlinkCursor: React.FC<{ color: string }> = ({ color }) => {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.Text style={{ opacity, color, fontSize: FONT_SIZE.md, lineHeight: 22 }}>
      ▋
    </Animated.Text>
  );
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export const AiCoachScreen: React.FC = () => {
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  const listRef = useRef<FlatList<LocalMessage>>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy) return;

      setInput('');
      setBusy(true);

      const userMsg: LocalMessage = { id: nextId(), role: 'user', content: trimmed };

      // Build history before adding the new user message
      setMessages((prev) => {
        const history = prev;
        // kick off AI call after state update
        setTimeout(() => startAi(trimmed, history), 0);
        return [...prev, userMsg];
      });

      scrollToBottom();
    },
    [busy, scrollToBottom], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const startAi = useCallback(
    async (userText: string, priorMessages: LocalMessage[]) => {
      const assistantId = nextId();
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: 'assistant', content: '', streaming: true },
      ]);
      setStreamingId(assistantId);
      scrollToBottom();

      // Build OpenRouter-compatible history from prior messages
      const history: ChatMessage[] = priorMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const abort = new AbortController();
      abortRef.current = abort;

      try {
        // Try streaming first; fall back to non-streaming if body API unavailable
        if (typeof ReadableStream !== 'undefined') {
          await streamAiCoachMessage(
            userText,
            history,
            (token) => {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: m.content + token } : m,
                ),
              );
              scrollToBottom();
            },
            abort.signal,
          );
        } else {
          const reply = await sendAiCoachMessage(userText, history);
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: reply } : m)),
          );
        }

        // Mark streaming done
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m)),
        );
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: err.message ?? 'Could not get a response. Try again.', streaming: false, error: true }
              : m,
          ),
        );
      } finally {
        setStreamingId(null);
        setBusy(false);
        scrollToBottom();
      }
    },
    [scrollToBottom],
  );

  // Cleanup on unmount
  useEffect(() => () => { abortRef.current?.abort(); }, []);

  // ─── Render helpers ──────────────────────────────────────────────────────────

  const renderMessage = useCallback(
    ({ item }: { item: LocalMessage }) => {
      const isUser = item.role === 'user';
      const isStreaming = item.streaming && item.id === streamingId;

      return (
        <View style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowAi]}>
          {!isUser && (
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Ionicons name="fitness" size={14} color="#fff" />
            </View>
          )}
          <View
            style={[
              styles.bubble,
              isUser
                ? { backgroundColor: colors.primary }
                : {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
                    borderWidth: 1,
                    borderColor: colors.surfaceBorder,
                  },
              item.error && { borderColor: colors.danger, borderWidth: 1 },
            ]}
          >
            <View style={styles.bubbleInner}>
              <Text
                style={[
                  styles.bubbleText,
                  { color: isUser ? '#fff' : colors.text },
                  item.error && { color: colors.danger },
                ]}
              >
                {item.content}
              </Text>
              {isStreaming && !isUser && (
                <BlinkCursor color={colors.text} />
              )}
            </View>
          </View>
        </View>
      );
    },
    [colors, isDark, streamingId],
  );

  const isEmpty = messages.length === 0;

  return (
    <LinearGradient colors={colors.backgroundGradient} style={styles.flex}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderMessage}
          contentContainerStyle={[
            styles.listContent,
            isEmpty && styles.listContentEmpty,
            { paddingBottom: SPACING.md },
          ]}
          ListHeaderComponent={
            isEmpty ? (
              <View style={styles.emptyState}>
                <View style={[styles.emptyIcon, { backgroundColor: colors.primary + '22' }]}>
                  <Ionicons name="fitness" size={36} color={colors.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>FitCoach AI</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  Your personal AI fitness &amp; nutrition coach.{'\n'}Ask me anything about workouts, diet, or wellness.
                </Text>
                <View style={styles.suggestions}>
                  {SUGGESTIONS.map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[styles.chip, { borderColor: colors.primary, backgroundColor: colors.primary + '15' }]}
                      onPress={() => send(s)}
                    >
                      <Text style={[styles.chipText, { color: colors.primary }]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null
          }
          removeClippedSubviews={false}
        />

        {/* Input bar */}
        <View
          style={[
            styles.inputBar,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
              borderTopColor: colors.surfaceBorder,
              paddingBottom: insets.bottom + SPACING.sm,
            },
          ]}
        >
          <TextInput
            style={[
              styles.input,
              {
                color: colors.text,
                backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
                borderColor: colors.surfaceBorder,
              },
            ]}
            value={input}
            onChangeText={setInput}
            placeholder="Ask FitCoach anything…"
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={() => send(input)}
            blurOnSubmit={false}
            editable={!busy}
          />

          {/* Stop button while streaming, send button otherwise */}
          {busy ? (
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: colors.danger }]}
              onPress={() => {
                abortRef.current?.abort();
                setStreamingId(null);
                setBusy(false);
                // Mark last assistant message as not streaming
                setMessages((prev) =>
                  prev.map((m) => (m.streaming ? { ...m, streaming: false } : m)),
                );
              }}
            >
              <Ionicons name="stop" size={18} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.sendBtn,
                { backgroundColor: input.trim() ? colors.primary : colors.surfaceBorder },
              ]}
              onPress={() => send(input)}
              disabled={!input.trim()}
            >
              <Ionicons name="send" size={18} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1 },
  listContent: { padding: SPACING.md, gap: SPACING.sm },
  listContentEmpty: { flexGrow: 1, justifyContent: 'center' },

  emptyState: { alignItems: 'center', paddingHorizontal: SPACING.lg, gap: SPACING.md },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: FONT_SIZE.xl, fontWeight: '700' },
  emptySubtitle: { fontSize: FONT_SIZE.sm, textAlign: 'center', lineHeight: 20 },
  suggestions: { gap: SPACING.sm, width: '100%' },
  chip: { borderWidth: 1, borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs + 2 },
  chipText: { fontSize: FONT_SIZE.sm, fontWeight: '500' },

  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: SPACING.xs },
  msgRowUser: { justifyContent: 'flex-end' },
  msgRowAi: { justifyContent: 'flex-start' },

  avatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  bubble: { maxWidth: '78%', borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  bubbleInner: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end' },
  bubbleText: { fontSize: FONT_SIZE.md, lineHeight: 22 },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZE.md,
    maxHeight: 120,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
