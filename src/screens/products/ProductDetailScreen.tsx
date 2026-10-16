import React, { useCallback, useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CommonActions, RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { getProduct } from '../../services/pos.service';
import { Product } from '../../types';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { FONTS, RADIUS } from '../../config/theme';
import { ProductsStackParams } from '../../navigation/AppNavigator';
import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassOverlay } from '../../components/ui/GlassOverlay';
import { AnimatedButton } from '../../components/ui/AnimatedButton';
import { useThemeColors } from '../../hooks/useThemeColors';

/** `.scroll { padding: 0 18px 18px }` */
const GUTTER = 18;
/** Below this, the prototype swaps the category tag for a scarcity tag (mirrors ProductsScreen). */
const LOW_STOCK = 3;

const formatPrice = (price: number) =>
  `₹${price.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

type ThemeColorSet = ReturnType<typeof useThemeColors>;

/**
 * `.product-tag` on `.pd-hero` — same rule ProductsScreen uses for its grid
 * tile, so a product reads consistently whether you're browsing the shop or
 * looking at one item. The prototype's mock only ever shows "Recommended";
 * our data has no recommendation flag, so stock state takes that slot.
 */
const productTag = (
  product: Product,
  colors: ThemeColorSet,
): { label: string; color: string; background: string } | null => {
  if (!product.inStock) {
    return { label: 'Out of stock', color: colors.danger, background: `${colors.danger}24` };
  }
  if (product.stock > 0 && product.stock <= LOW_STOCK) {
    return { label: `${product.stock} left`, color: colors.warning, background: `${colors.warning}24` };
  }
  if (product.category) {
    return { label: product.category, color: colors.primary, background: colors.primarySoft };
  }
  return null;
};

export const ProductDetailScreen: React.FC = () => {
  const route = useRoute<RouteProp<ProductsStackParams, 'ProductDetail'>>();
  const nav = useNavigation<NativeStackNavigationProp<ProductsStackParams>>();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [askTrainer, setAskTrainer] = useState(false);

  // `.nav-title` reads "Product" in the prototype until the product itself
  // loads, then the header shows the product's own name.
  const headerTitle = product?.name ?? 'Product';

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await getProduct(route.params.productId);
      setProduct(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load product');
    }
  }, [route.params.productId]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  // There is no "notify a trainer" endpoint, so the prototype's Ask Trainer
  // action (which just fires a toast) hands the member to the real Messages
  // thread instead — the same substitution ProductsScreen makes for its own
  // "Ask Trainer" button.
  const openMessages = useCallback(() => {
    setAskTrainer(false);
    nav.dispatch(CommonActions.navigate({ name: 'MainTabs', params: { screen: 'Chat' } }));
  }, [nav]);

  if (loading) {
    return (
      <AnimatedScreen>
        <ScreenHeader title={headerTitle} onBack={nav.canGoBack() ? () => nav.goBack() : undefined} />
        <LoadingSpinner fullScreen />
      </AnimatedScreen>
    );
  }

  if (error || !product) {
    return (
      <AnimatedScreen>
        <ScreenHeader
          title={headerTitle}
          onBack={nav.canGoBack() ? () => nav.goBack() : undefined}
        />
        <View style={styles.centered}>
          <EmptyState
            icon="warning-outline"
            title="Couldn’t load this product"
            subtitle={error ?? 'Product not found'}
            actionLabel="Try Again"
            onAction={() => { setLoading(true); load().finally(() => setLoading(false)); }}
          />
        </View>
      </AnimatedScreen>
    );
  }

  const tag = productTag(product, colors);

  return (
    <AnimatedScreen>
      <ScreenHeader
        title={headerTitle}
        onBack={nav.canGoBack() ? () => nav.goBack() : undefined}
      />
      <ScrollView
        style={styles.root}
        contentContainerStyle={[
          styles.content,
          { paddingTop: 8, paddingBottom: insets.bottom + GUTTER + 10 },
        ]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
      >
        {/* `.pd-hero { height:220; border-radius:22; margin-bottom:16 }` */}
        <View style={[styles.hero, { backgroundColor: colors.inset }]}>
          {product.imageUrl ? (
            <Image source={{ uri: product.imageUrl }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <LinearGradient
              colors={[colors.inset, colors.surface]}
              start={{ x: 0.2, y: 0 }}
              end={{ x: 0.8, y: 1 }}
              style={styles.heroPlaceholder}
            >
              <Ionicons name="cube-outline" size={56} color={colors.textFaint} />
            </LinearGradient>
          )}

          {/* `.product-tag` override for the hero: `top:14px;left:14px` */}
          {tag ? (
            <View style={[styles.tag, { backgroundColor: tag.background }]}>
              <Text style={[styles.tagText, { color: tag.color }]} numberOfLines={1}>
                {tag.label}
              </Text>
            </View>
          ) : null}
        </View>

        {/* `.pd-title { font-size:19px; font-weight:800 }` */}
        <Text style={[styles.title, { color: colors.text }]}>{product.name}</Text>
        {/* `.pd-price { font-size:22px; font-weight:800; color:var(--teal); margin-top:6 }` */}
        <Text style={[styles.price, { color: colors.primary }]}>{formatPrice(product.price)}</Text>
        {/* `.pd-desc { font-size:12.5px; line-height:1.7; color:var(--text-muted); margin-top:14 }` */}
        {product.description ? (
          <Text style={[styles.desc, { color: colors.textSecondary }]}>{product.description}</Text>
        ) : null}

        {/* `.card.counter-note { gap:10; padding:13; margin-top:14 }` */}
        <GlassCard style={styles.counterNote} innerStyle={styles.counterNoteInner}>
          <Ionicons name="information-circle-outline" size={18} color={colors.warning} />
          <Text style={[styles.counterNoteText, { color: colors.textSecondary }]}>
            Available at the gym counter — show this screen to reception to collect or pay.
          </Text>
        </GlassCard>

        {/* `.btn-primary { margin-top:18 }` — see openMessages() above for why
            this opens Messages instead of the prototype's trainer-notified toast. */}
        <AnimatedButton
          label="Ask Trainer About This"
          onPress={() => setAskTrainer(true)}
          style={styles.askButton}
        />
      </ScrollView>

      <GlassOverlay
        visible={askTrainer}
        title="Ask your trainer"
        message={`Open Messages to ask your trainer about ${product.name} before you collect it at the counter.`}
        confirmLabel="Open Messages"
        cancelLabel="Not now"
        onConfirm={openMessages}
        onCancel={() => setAskTrainer(false)}
      />
    </AnimatedScreen>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: GUTTER },
  centered: { flex: 1, paddingHorizontal: GUTTER, justifyContent: 'center' },

  hero: { height: 220, borderRadius: RADIUS.lg, marginBottom: 16, overflow: 'hidden', position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  heroPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  /* `.product-tag { padding:4px 8px; radius:100px; font-size:9px; font-weight:700 }` */
  tag: { position: 'absolute', top: 14, left: 14, maxWidth: '70%', paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.full },
  tagText: { fontSize: 9, fontFamily: FONTS.bodyBold },

  title: { fontSize: 19, fontFamily: FONTS.bodyExtra },
  price: { fontSize: 22, fontFamily: FONTS.bodyExtra, marginTop: 6 },
  desc: { fontSize: 12.5, lineHeight: 21, marginTop: 14 },

  counterNote: { marginTop: 14 },
  /* GlassCard always pads its children in an inner View, so the card's own
     13px padding and row layout belong on innerStyle, never style. */
  counterNoteInner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13 },
  counterNoteText: { flex: 1, fontSize: 12, lineHeight: 17 },

  askButton: { marginTop: 18 },
});
