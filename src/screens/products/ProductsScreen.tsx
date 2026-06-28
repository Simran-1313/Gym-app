import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getProducts } from '../../services/pos.service';
import { Product } from '../../types';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { DARK_COLORS, LIGHT_COLORS, FONT_SIZE, RADIUS, SPACING } from '../../config/theme';
import { ProductsStackParams } from '../../navigation/AppNavigator';
import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { GlassCard } from '../../components/ui/GlassCard';
import { StaggerItem } from '../../components/ui/StaggerItem';
import { useAuth } from '../../context/AuthContext';

const formatPrice = (price: number) =>
  `₹${price.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

interface ProductCardProps {
  product: Product;
  index: number;
  onPress: (id: string) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, index, onPress }) => {
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  return (
    <StaggerItem index={index}>
      <TouchableOpacity activeOpacity={0.85} onPress={() => onPress(product.id)}>
        <GlassCard glowColor={colors.primary} style={styles.card} noPadding>
          <View style={styles.cardInner}>
            <View style={[styles.imageWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}>
              {product.imageUrl ? (
                <Image source={{ uri: product.imageUrl }} style={styles.image} resizeMode="cover" />
              ) : (
                <Ionicons name="cube-outline" size={32} color={colors.textMuted} />
              )}
            </View>

            <View style={styles.infoBlock}>
              {product.category ? (
                <Text style={[styles.category, { color: colors.primary }]}>{product.category}</Text>
              ) : null}
              <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>
                {product.name}
              </Text>
              <Text style={[styles.price, { color: colors.text }]}>{formatPrice(product.price)}</Text>
            </View>

            <View style={styles.statusCol}>
              {product.inStock ? (
                <View style={[styles.stockBadge, { backgroundColor: `${colors.success}18` }]}>
                  <Text style={[styles.stockText, { color: colors.success }]}>In Stock</Text>
                </View>
              ) : (
                <View style={[styles.stockBadge, { backgroundColor: `${colors.danger}18` }]}>
                  <Text style={[styles.stockText, { color: colors.danger }]}>Out</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </View>
          </View>
        </GlassCard>
      </TouchableOpacity>
    </StaggerItem>
  );
};

export const ProductsScreen: React.FC = () => {
  const nav = useNavigation<NativeStackNavigationProp<ProductsStackParams>>();
  const insets = useSafeAreaInsets();
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

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

  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats).sort();
  }, [products]);

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
        setProducts((prev) => (append ? [...prev, ...result.products] : result.products));
        setPage(pageNum);
        setHasNext(result.meta.hasNext);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load products');
      }
    },
    [searchQuery, selectedCategory],
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

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <AnimatedScreen>
      <FlatList
        style={[styles.root, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom + 100 }]}
        data={products}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.3}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={[styles.searchBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: colors.surfaceBorder }]}>
              <Ionicons name="search-outline" size={18} color={colors.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search products..."
                placeholderTextColor={colors.textMuted}
                value={search}
                onChangeText={setSearch}
                onSubmitEditing={() => setSearchQuery(search)}
                returnKeyType="search"
              />
              {search.length > 0 ? (
                <TouchableOpacity onPress={() => { setSearch(''); setSearchQuery(''); }}>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>

            {categories.length > 0 ? (
              <View style={styles.categoryRow}>
                <TouchableOpacity
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: !selectedCategory ? `${colors.primary}22` : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                      borderColor: !selectedCategory ? colors.primary : colors.surfaceBorder,
                    },
                  ]}
                  onPress={() => setSelectedCategory(null)}
                >
                  <Text style={[styles.categoryChipText, { color: !selectedCategory ? colors.primary : colors.textSecondary }]}>All</Text>
                </TouchableOpacity>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: selectedCategory === cat ? `${colors.primary}22` : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                        borderColor: selectedCategory === cat ? colors.primary : colors.surfaceBorder,
                      },
                    ]}
                    onPress={() => setSelectedCategory(cat)}
                  >
                    <Text style={[styles.categoryChipText, { color: selectedCategory === cat ? colors.primary : colors.textSecondary }]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            {error ? (
              <GlassCard glowColor={colors.danger}>
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle-outline" size={24} color={colors.danger} />
                  <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
                </View>
              </GlassCard>
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
          <ProductCard product={item} index={index} onPress={(id) => nav.navigate('ProductDetail', { productId: id })} />
        )}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footer}>
              <LoadingSpinner />
            </View>
          ) : null
        }
      />
    </AnimatedScreen>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: SPACING.md, gap: SPACING.md },
  header: { gap: SPACING.md, marginBottom: SPACING.xs },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: FONT_SIZE.md, padding: 0 },

  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  categoryChipText: { fontSize: FONT_SIZE.sm, fontWeight: '600' },

  card: { marginBottom: SPACING.sm },
  cardInner: { flexDirection: 'row', padding: SPACING.md, gap: SPACING.md, alignItems: 'center' },
  imageWrap: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: { width: 64, height: 64 },
  infoBlock: { flex: 1, gap: 2 },
  category: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  productName: { fontSize: 16, fontWeight: '700' },
  price: { fontSize: 15, fontWeight: '800', marginTop: 2 },
  statusCol: { alignItems: 'flex-end', gap: SPACING.sm },
  stockBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full },
  stockText: { fontSize: 11, fontWeight: '700' },

  errorBox: { alignItems: 'center', gap: SPACING.sm, padding: SPACING.md },
  errorText: { fontSize: FONT_SIZE.md, textAlign: 'center' },
  footer: { paddingVertical: SPACING.md },
});
