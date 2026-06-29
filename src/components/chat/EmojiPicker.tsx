import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import {
  CHAT_EMOJI_GROUPS,
  EmojiGroup,
  getRecentEmojis,
  saveRecentEmoji,
} from '../../constants/chatEmojis';
import { DARK_COLORS, LIGHT_COLORS, FONT_SIZE, RADIUS, SPACING } from '../../config/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
  isDark: boolean;
}

const EMOJI_SIZE = 38;
const NUM_COLS = 8;

export const EmojiPicker: React.FC<Props> = ({ visible, onClose, onSelect, isDark }) => {
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;
  const [activeTab, setActiveTab] = useState('smileys');
  const [search, setSearch] = useState('');
  const [recentEmojis, setRecentEmojis] = useState<string[]>(() => getRecentEmojis());
  const slideAnim = useRef(new Animated.Value(0)).current;
  const prevVisible = useRef(false);

  if (visible !== prevVisible.current) {
    prevVisible.current = visible;
    if (visible) {
      setSearch('');
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }).start();
    } else {
      slideAnim.setValue(0);
    }
  }

  const handleSelect = useCallback((emoji: string) => {
    const updated = saveRecentEmoji(emoji);
    setRecentEmojis(updated);
    onSelect(emoji);
  }, [onSelect]);

  const allGroups = useMemo((): EmojiGroup[] => {
    if (recentEmojis.length === 0) return [...CHAT_EMOJI_GROUPS];
    return [
      { id: 'recent', label: 'Recent', icon: '⏱️', emojis: recentEmojis as string[] as readonly string[] },
      ...CHAT_EMOJI_GROUPS,
    ];
  }, [recentEmojis]);

  const searchResults = useMemo(() => {
    if (!search.trim()) return null;
    return CHAT_EMOJI_GROUPS.flatMap((g) => [...g.emojis]).filter((e) =>
      e.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  const activeGroup = allGroups.find((g) => g.id === activeTab);
  const displayEmojis = searchResults ?? activeGroup?.emojis ?? [];

  if (!visible) return null;

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0],
  });
  const opacity = slideAnim;

  return (
    <Animated.View style={[styles.wrap, { opacity, transform: [{ translateY }] }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={styles.panel}>
        <BlurView
          intensity={isDark ? 80 : 60}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.panelInner, {
          backgroundColor: isDark ? 'rgba(18,18,22,0.92)' : 'rgba(248,248,252,0.94)',
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
        }]}>
          {/* Search */}
          <View style={[styles.searchRow, {
            backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
          }]}>
            <Ionicons name="search" size={14} color={colors.textMuted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search emoji…"
              placeholderTextColor={colors.textMuted}
              style={[styles.searchInput, { color: colors.text }]}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Ionicons name="close-circle" size={15} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Category tabs */}
          {!search && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tabsScroll}
              contentContainerStyle={styles.tabsContent}
              keyboardShouldPersistTaps="always"
            >
              {allGroups.map((group) => {
                const isActive = group.id === activeTab;
                return (
                  <TouchableOpacity
                    key={group.id}
                    onPress={() => setActiveTab(group.id)}
                    style={[
                      styles.tab,
                      isActive && { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.tabIcon}>{group.icon}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* Section header */}
          {!search && (
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
              {activeGroup?.label ?? ''}
            </Text>
          )}
          {search && searchResults !== null && (
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
              {searchResults.length > 0 ? `${searchResults.length} results` : 'No matches'}
            </Text>
          )}

          {/* Grid */}
          <FlatList
            key={`${activeTab}-${search}`}
            data={displayEmojis as string[]}
            keyExtractor={(item, i) => `${item}-${i}`}
            numColumns={NUM_COLS}
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator={false}
            style={styles.grid}
            contentContainerStyle={styles.gridContent}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => handleSelect(item)}
                style={styles.emojiBtn}
                activeOpacity={0.55}
              >
                <Text style={styles.emoji}>{item}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>No emoji found</Text>
              </View>
            }
          />
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: '100%',
    marginBottom: 6,
    zIndex: 50,
  },
  panel: {
    marginHorizontal: 8,
    borderRadius: 20,
    overflow: 'hidden',
    height: 320,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
    elevation: 16,
  },
  panelInner: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 10,
    marginTop: 10,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZE.xs,
    paddingVertical: 0,
  },
  tabsScroll: {
    flexGrow: 0,
    marginBottom: 4,
  },
  tabsContent: {
    paddingHorizontal: 8,
    gap: 2,
    alignItems: 'center',
  },
  tab: {
    width: 36,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    fontSize: 18,
    lineHeight: 22,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    paddingHorizontal: 14,
    paddingBottom: 4,
  },
  grid: {
    flex: 1,
  },
  gridContent: {
    paddingHorizontal: 8,
    paddingBottom: SPACING.md,
  },
  emojiBtn: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: EMOJI_SIZE,
    height: EMOJI_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    margin: 1,
  },
  emoji: {
    fontSize: 22,
    lineHeight: 26,
    textAlign: 'center',
  },
  emptyWrap: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FONT_SIZE.xs,
  },
});
