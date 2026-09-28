import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { useNavigation } from '@react-navigation/native';

import { streamAiCoachMessage, sendAiCoachMessage, ChatMessage } from '../../services/aiCoach.service';
import { FONTS, RADIUS } from '../../config/theme';
import type { ThemeColors } from '../../config/theme';
import { bestTextOn } from '../../utils/color';
import { useThemeColors } from '../../hooks/useThemeColors';
import { AnimatedScreen } from '../../components/ui/AnimatedScreen';

/**
 * Ported from `#screen-ai-coach` in docs/UI_PROTOTYPE.html.
 *
 * Shares its bubble geometry with `#screen-chat-thread` (`.bubble`, 78%
 * max-width, 11/14 padding, 12.5/1.5 type, 5/16/16/16 corner pairs) but adds
 * `.ai-msg-row` (a 26px `.ai-avatar-sm` beside every assistant bubble, 88%
 * row max-width) and `.ai-cursor` (a 2×12 blinking bar, not a text glyph).
 *
 * The header's "Powered by your training data" and the lavender accent are
 * the prototype's fixed AI-Coach identity — distinct from the tenant's
 * brandable teal — so, as in ChatList/ChatRoom, this uses `colors.lavender`
 * (`var(--lavender)` in the prototype), which stays fixed regardless of the
 * gym's brand color, same as this screen's identity in the prototype.
 *
 * The prototype's `.suggestion-row` sits above the composer on every turn,
 * reading as contextual follow-ups ("Give me a lighter option", etc.). This
 * app has no backend that generates per-turn suggestions — only a fixed
 * welcome-state prompt list — so that row is kept where the real feature
 * lives (the empty state) rather than inventing contextual chips with no
 * data behind them.
 */

interface LocalMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
  error?: boolean;
}

const SUGGESTIONS = [
  'What should I eat before a workout?',
  'Give me a 5-minute warm-up routine',
  'How much protein do I need daily?',
  'Best exercises for fat loss?',
];

let _msgId = 0;
const nextId = () => String(++_msgId);

// ── Header (`.navbar` avatar + "FitCoach AI" + tagline) ─────────────────────

const AiHeaderTitle: React.FC<{ colors: ThemeColors }> = ({ colors }) => (
  <View style={hs.row}>
    <View style={[hs.avatar, { backgroundColor: `${colors.lavender}2E` }]}>
      <Ionicons name="shield-checkmark-outline" size={15} color={colors.lavender} />
    </View>
    <View>
      <Text style={[hs.name, { color: colors.text }]}>FitCoach AI</Text>
      <Text style={[hs.sub, { color: colors.lavender }]}>Powered by your training data</Text>
    </View>
  </View>
);

const hs = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 13, fontFamily: FONTS.bodyBold },
  sub: { fontSize: 10.5, marginTop: 1 },
});

// ── Blinking cursor (`.ai-cursor`) ───────────────────────────────────────────

const BlinkCursor: React.FC<{ color: string }> = ({ color }) => {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0, duration: 450, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 450, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  // .ai-cursor { width:2px; height:12px; margin-left:2px }
  return <Animated.View style={[styles.aiCursor, { backgroundColor: color, opacity }]} />;
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export const AiCoachScreen: React.FC = () => {
  const headerHeight = useHeaderHeight();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({ headerTitle: () => <AiHeaderTitle colors={colors} /> });
  }, [navigation, colors]);

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

      const bubble = (
        <View
          style={[
            styles.bubble,
            isUser ? styles.bubbleCornerOwn : styles.bubbleCornerOther,
            isUser
              ? { backgroundColor: colors.primary }
              : { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceBorder },
            item.error && { borderColor: colors.danger, borderWidth: 1 },
          ]}
        >
          <Text style={{ flexShrink: 1 }}>
            {(() => {
              const baseStyle = [
                styles.bubbleText,
                { color: isUser ? bestTextOn(colors.primary) : colors.text },
                item.error && { color: colors.danger },
              ];
              const boldStyle = { fontFamily: FONTS.bodyBold };

              if (!item.content) return null;
              const parts = item.content.split(/(\*\*.*?\*\*)/g);
              return parts.map((part, index) => {
                if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
                  return (
                    <Text key={index} style={[baseStyle, boldStyle]}>
                      {part.slice(2, -2)}
                    </Text>
                  );
                }
                return (
                  <Text key={index} style={baseStyle}>
                    {part}
                  </Text>
                );
              });
            })()}
            {isStreaming && !isUser && (
              <BlinkCursor color={colors.lavender} />
            )}
          </Text>
        </View>
      );

      if (isUser) {
        return <View style={[styles.msgRow, styles.msgRowUser]}>{bubble}</View>;
      }

      // .ai-msg-row { gap:10; max-width:88%; align-self:flex-start } — the
      // bubble sits directly alongside the avatar (not in an extra flexShrink
      // wrapper) so its own 78% max-width resolves against this row, not an
      // unconstrained intermediate view.
      return (
        <View style={[styles.msgRow, styles.msgRowAi]}>
          <View style={[styles.aiAvatarSm, { backgroundColor: `${colors.lavender}2E` }]}>
            <Ionicons name="shield-checkmark-outline" size={13} color={colors.lavender} />
          </View>
          {bubble}
        </View>
      );
    },
    [colors, streamingId],
  );

  const isEmpty = messages.length === 0;

  return (
    <AnimatedScreen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderMessage}
          contentContainerStyle={[
            styles.listContent,
            isEmpty && styles.listContentEmpty,
            { paddingBottom: 12, paddingTop: headerHeight + 12 },
          ]}
          ListHeaderComponent={
            isEmpty ? (
              <View style={styles.emptyState}>
                <View style={[styles.emptyIcon, { backgroundColor: `${colors.lavender}2E` }]}>
                  <Ionicons name="shield-checkmark-outline" size={34} color={colors.lavender} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>FitCoach AI</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  Your personal AI fitness &amp; nutrition coach.{'\n'}Ask me anything about workouts, diet, or wellness.
                </Text>
                {/* `.suggestion-row` — the fixed welcome-state prompt list */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.suggestionRow}
                  style={styles.suggestionRowOuter}
                >
                  {SUGGESTIONS.map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.overlayBorder }]}
                      onPress={() => send(s)}
                    >
                      <Text style={[styles.chipText, { color: colors.text }]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ) : null
          }
          removeClippedSubviews={false}
        />

        {/* `.chat-input` */}
        <View
          style={[
            styles.inputBar,
            {
              borderTopColor: colors.surfaceBorder,
              paddingBottom: insets.bottom + 14,
            },
          ]}
        >
          <TextInput
            style={[
              styles.input,
              { color: colors.text, backgroundColor: colors.surface, borderColor: colors.overlayBorder },
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
              <Ionicons name="stop" size={15} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.sendBtn,
                { backgroundColor: input.trim() ? colors.primary : colors.inset },
              ]}
              onPress={() => send(input)}
              disabled={!input.trim()}
            >
              <Ionicons name="send" size={15} color={input.trim() ? bestTextOn(colors.primary) : colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </AnimatedScreen>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // .chat-msgs { gap:10px; padding:12px 16px }
  listContent: { paddingHorizontal: 16, gap: 10 },
  listContentEmpty: { flexGrow: 1, justifyContent: 'center' },

  emptyState: { alignItems: 'center', paddingHorizontal: 8, gap: 14 },
  emptyIcon: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontFamily: FONTS.bodyBold },
  emptySubtitle: { fontSize: 13, textAlign: 'center', lineHeight: 19 },

  // .suggestion-row { gap:8; padding:2px 2px 4px }
  suggestionRowOuter: { width: '100%', marginTop: 2 },
  suggestionRow: { gap: 8, paddingHorizontal: 2, paddingVertical: 4 },
  // .suggestion-chip { padding:9px 14px; radius:100; font-size:11.5; border:hairline-strong }
  chip: { borderWidth: 1, borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 9 },
  chipText: { fontSize: 11.5, fontFamily: FONTS.body },

  msgRow: { flexDirection: 'row', alignItems: 'flex-end' },
  msgRowUser: { justifyContent: 'flex-end' },
  // .ai-msg-row { gap:10 } — left unstretched at the row level (no
  // alignSelf/max-width of its own): the bubble's *own* 78% max-width is what
  // the prototype actually renders as the visible cap, and letting this row
  // keep the FlatList row's default full-width stretch is what lets that
  // percentage resolve against a definite width instead of a content-sized
  // (and therefore circular) parent.
  msgRowAi: { justifyContent: 'flex-start', alignItems: 'flex-start', gap: 10 },

  // .ai-avatar-sm { 26x26; radius:50%; margin-top:2 }
  aiAvatarSm: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },

  // .bubble { max-width:78%; padding:11px 14px; font-size:12.5; line-height:1.5 }
  bubble: { maxWidth: '78%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 11 },
  // .bubble.me { radius: 16 5 16 16 } / .bubble.them { radius: 5 16 16 16 }
  bubbleCornerOwn: { borderTopRightRadius: 5 },
  bubbleCornerOther: { borderTopLeftRadius: 5 },
  bubbleText: { fontSize: 12.5, lineHeight: 18.5 },

  // .ai-cursor { 2x12; margin-left:2 }
  aiCursor: { width: 2, height: 12, marginLeft: 2 },

  // .chat-input { gap:9px; padding:11px 16px 14px }
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 16,
    paddingTop: 11,
    borderTopWidth: 1,
  },
  // .chat-input input { radius:100; padding:12px 16px; font-size:12.5 }
  input: {
    flex: 1,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 12.5,
    maxHeight: 120,
  },
  // .send-btn { 39x39; radius:50% }
  sendBtn: {
    width: 39,
    height: 39,
    borderRadius: 19.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
