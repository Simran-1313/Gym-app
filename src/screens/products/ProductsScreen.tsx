import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CommonActions, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { getProducts } from '../../services/pos.service';
import { Product } from '../../types';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { FONTS, RADIUS } from '../../config/theme';
import { ProductsStackParams } from '../../navigation/AppNavigator';
import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassOverlay } from '../../components/ui/GlassOverlay';
import { StaggerItem } from '../../components/ui/StaggerItem';
import { useThemeColors } from '../../hooks/useThemeColors';

/** `.scroll { padding: 0 18px 18px }` */
const GUTTER = 18;
/** `.shop-grid { gap: 12px }` */
const GRID_GAP = 12;
/** Below this, the prototype swaps the category tag for a scarcity tag. */
const LOW_STOCK = 3;

const formatPrice = (price: number) =>
  `₹${price.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

type ThemeColorSet = ReturnType<typeof useThemeColors>;

/**
 * `.product-tag` — one pill, top-left of the thumbnail. The prototype shows
 * three states (recommended / low stock / out of stock); the only stock signal
 * the API gives us is `inStock` + `stock`, so the neutral teal slot carries the
 * product's category rather than a recommendation we have no data for.
 */
const productTag = (
  product: Product,
  colors: ThemeColorSet,
): { label: string; color: string; background: string } | null => {
  if (!product.inStock) {
    return { label: 'Out of stock', color: colors.danger, background: `${colors.danger}24` };
  }
  if (product.stock > 0 && product.stock <= LOW_STOCK) {
    return { label: `${product.stock} left`, color: colors.warning, background: `${colors.warning}29` };
  }
  if (product.category) {
    return { label: product.category, color: colors.primary, background: colors.primarySoft };
  }
  return null;
};

interface ProductCardProps {
  product: Product;
  index: number;
  width: number;
  onPress: (id: string) => void;
  onAskTrainer: (product: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, index, width, onPress, onAskTrainer }) => {
  const colors = useThemeColors();
  const tag = productTag(product, colors);

  return (
    <StaggerItem index={index} style={{ width }}>
      <Pressable
        onPress={() => onPress(product.id)}
        style={({ pressed }) => (pressed ? styles.cardPressed : null)}
      >
        <GlassCard noPadding innerStyle={styles.cardInner}>
          {/* `.product-img` — 96px tall, 16px radius, tag pinned top-left */}
          <View style={styles.imageWrap}>
            {product.imageUrl ? (
              <Image source={{ uri: product.imageUrl }} style={styles.image} resizeMode="cover" />
            ) : (
              <LinearGradient
                colors={[colors.inset, colors.surface]}
                start={{ x: 0.25, y: 0 }}
                end={{ x: 0.75, y: 1 }}
                style={styles.imagePlaceholder}
              >
                <Ionicons name="cube-outline" size={26} color={colors.textFaint} />
              </LinearGradient>
            )}

            {tag ? (
              <View style={[styles.tag, { backgroundColor: tag.background }]}>
                <Text style={[styles.tagText, { color: tag.color }]} numberOfLines={1}>
                  {tag.label}
                </Text>
              </View>
            ) : null}
          </View>

          <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>
            {product.name}
          </Text>
          <Text style={[styles.price, { color: colors.text }]}>{formatPrice(product.price)}</Text>

          {/* `.btn-ghost` — 12px label, hairline pill. Built inline rather than
              with AnimatedButton: that component's ghost variant is a 44px-tall
              14px button, far too large for a 12px-padded grid card. */}
          <Pressable
            disabled={!product.inStock}
            onPress={() => onAskTrainer(product)}
            style={({ pressed }) => [
              styles.ghostBtn,
              { borderColor: colors.overlayBorder },
              !product.inStock && styles.ghostBtnDisabled,
              pressed && styles.ghostBtnPressed,
            ]}
          >
            <Text style={[styles.ghostLabel, { color: colors.text }]}>Ask Trainer</Text>
          </Pressable>
        </GlassCard>
      </Pressable>
    </StaggerItem>
  );
};

export const ProductsScreen: React.FC = () => {
  const nav = useNavigation<NativeStackNavigationProp<ProductsStackParams>>();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const colors = useThemeColors();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [askProduct, setAskProduct] = useState<Product | null>(null);

  const cardWidth = Math.floor((windowWidth - GUTTER * 2 - GRID_GAP) / 2);

  // The filter row has to stay put once a filter is applied, so the chip set is
  // accumulated across responses instead of derived from the filtered page
  // (deriving it made every other chip disappear on the first tap).
  const seenCategories = useRef<Set<string>>(new Set());
  const [categories, setCategories] = useState<string[]>([]);

  const rememberCategories = useCallback((list: Product[]) => {
    let added = false;
    list.forEach((p) => {
      if (p.category && !seenCategories.current.has(p.category)) {
        seenCategories.current.add(p.category);
        added = true;
      }
    });
    if (added) setCategories(Array.from(seenCategories.current).sort());
  }, []);

  const load = useCallback(
    async (pageNum = 1, append = false) => {
      try {
        setError(null);
        const result = await getProducts({
          page: pageNum,
          limit: 20,
          search: searchQuery.trim() || undefined,
          category: selectedCategory ?? undefined,
          sortBy: 'name_asc',
        });
        rememberCategories(result.products);
        setProducts((prev) => (append ? [...prev, ...result.products] : result.products));
        setPage(pageNum);
        setHasNext(result.meta.hasNext);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load products');
      }
    },
    [searchQuery, selectedCategory, rememberCategories],
  );

  useEffect(() => {
    setLoading(true);
    load(1).finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(1);
    setRefreshing(false);
  }, [load]);

  const onLoadMore = useCallback(async () => {
    if (!hasNext || loadingMore) return;
    setLoadingMore(true);
    await load(page + 1, true);
    setLoadingMore(false);
  }, [hasNext, loadingMore, load, page]);

  // There is no "notify a trainer" endpoint, so the prototype's Ask Trainer
  // action hands the member to the real Messages thread rather than firing a
  // confirmation for something that never happened.
  const openMessages = useCallback(() => {
    setAskProduct(null);
    nav.dispatch(CommonActions.navigate({ name: 'MainTabs', params: { screen: 'Chat' } }));
  }, [nav]);

  const chips = useMemo(() => [null, ...categories], [categories]);

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <AnimatedScreen>
      <ScreenHeader
        title="Products"
        onBack={nav.canGoBack() ? () => nav.goBack() : undefined}
      />
      <FlatList
        style={styles.root}
        contentContainerStyle={{
          paddingHorizontal: GUTTER,
          paddingTop: 8,
          paddingBottom: insets.bottom + GUTTER + 10,
        }}
        columnWrapperStyle={styles.row}
        numColumns={2}
        data={products}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.3}
        ListHeaderComponent={
          <View>
            {/* `.search-bar` */}
            <View
              style={[
                styles.searchBar,
                { backgroundColor: colors.surface, borderColor: colors.cardBorder },
              ]}
            >
              <Ionicons name="search-outline" size={15} color={colors.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search products…"
                placeholderTextColor={colors.textMuted}
                value={search}
                onChangeText={setSearch}
                onSubmitEditing={() => setSearchQuery(search)}
                returnKeyType="search"
              />
              {search.length > 0 ? (
                <Pressable
                  onPress={() => {
                    setSearch('');
                    setSearchQuery('');
                  }}
                  hitSlop={8}
                >
                  <Ionicons name="close-circle" size={15} color={colors.textMuted} />
                </Pressable>
              ) : null}
            </View>

            {/* `.filter-row` — horizontally scrolling pills */}
            {categories.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRow}
                style={styles.filterRowOuter}
              >
                {chips.map((cat) => {
                  const active = selectedCategory === cat;
                  return (
                    <Pressable
                      key={cat ?? '__all'}
                      onPress={() => setSelectedCategory(cat)}
                      style={[
                        styles.chip,
                        active
                          ? { backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder }
                          : { backgroundColor: colors.surface, borderColor: colors.cardBorder },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: active ? colors.primary : colors.textSecondary },
                        ]}
                      >
                        {cat ?? 'All'}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : (
              <View style={styles.headerSpacer} />
            )}

            {error ? (
              <EmptyState
                icon="warning-outline"
                title="Oops, something went wrong!"
                subtitle={error}
                actionLabel="Try Again"
                onAction={() => {
                  setLoading(true);
                  load(1).finally(() => setLoading(false));
                }}
              />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          !error ? (
            <EmptyState
              icon="bag-outline"
              title="No products available"
              subtitle="Check back later for gym supplements and merchandise."
            />
          ) : null
        }
        renderItem={({ item, index }) => (
          <ProductCard
            product={item}
            index={index}
            width={cardWidth}
            onPress={(id) => nav.navigate('ProductDetail', { productId: id })}
            onAskTrainer={setAskProduct}
          />
        )}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footer}>
              <LoadingSpinner />
            </View>
          ) : null
        }
      />

      <GlassOverlay
        visible={askProduct !== null}
        title="Ask your trainer"
        message={
          askProduct
            ? `Open Messages to ask your trainer about ${askProduct.name} before you collect it at the counter.`
            : ''
        }
        confirmLabel="Open Messages"
        cancelLabel="Not now"
        onConfirm={openMessages}
        onCancel={() => setAskProduct(null)}
      />
    </AnimatedScreen>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  /* `.shop-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px }` */
  row: { gap: GRID_GAP, marginBottom: GRID_GAP },
  headerSpacer: { height: 2 },

  /* `.search-bar { gap:8; radius:14; padding:11px 14px; margin-bottom:14px }` */
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
  /* `.search-bar input { font-size:13px }` */
  searchInput: { flex: 1, fontSize: 13, fontFamily: FONTS.body, padding: 0 },

  /* `.filter-row { gap:8; padding:2px 2px 16px }` */
  filterRowOuter: { marginHorizontal: -GUTTER },
  filterRow: { gap: 8, paddingHorizontal: GUTTER + 2, paddingTop: 2, paddingBottom: 16 },
  /* `.filter-chip { padding:8px 14px; radius:100px; font-size:11.5px; weight:600 }` */
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.full, borderWidth: 1 },
  chipText: { fontSize: 11.5, fontFamily: FONTS.bodySemi },

  /* `.card.tap:active { transform:scale(0.975) }` */
  cardPressed: { transform: [{ scale: 0.975 }] },
  /* `.product-card { padding:12px }` — GlassCard always pads its children in an
     inner View, so the card's own padding belongs on innerStyle, never style. */
  cardInner: { padding: 12 },

  /* `.product-img { height:96px; radius:16px; margin-bottom:10px }` */
  imageWrap: { height: 96, borderRadius: 16, marginBottom: 10, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  /* `.product-tag { top:8; left:8; font-size:9px; weight:700; padding:4px 8px; radius:100px }` */
  tag: {
    position: 'absolute',
    top: 8,
    left: 8,
    maxWidth: '86%',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  tagText: { fontSize: 9, fontFamily: FONTS.bodyBold },

  /* `.product-name { font-size:12.5px; weight:600; line-height:1.35; margin-bottom:6px }` */
  productName: { fontSize: 12.5, lineHeight: 17, fontFamily: FONTS.bodySemi, marginBottom: 6 },
  /* `.price-now { font-size:13.5px; weight:700; margin-bottom:10px }` */
  price: { fontSize: 13.5, fontFamily: FONTS.bodyBold, marginBottom: 10 },

  /* `.btn-ghost { border:1px solid hairline-strong; font-size:12px; weight:600; padding:10px 0; radius:100px }` */
  ghostBtn: {
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  ghostBtnDisabled: { opacity: 0.4 },
  ghostBtnPressed: { transform: [{ scale: 0.97 }] },
  ghostLabel: { fontSize: 12, fontFamily: FONTS.bodySemi },

  footer: { paddingVertical: 16 },
});
