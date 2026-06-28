import React, { useCallback, useEffect, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getProduct } from '../../services/pos.service';
import { Product } from '../../types';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { DARK_COLORS, LIGHT_COLORS, FONT_SIZE, RADIUS, SPACING } from '../../config/theme';
import { ProductsStackParams } from '../../navigation/AppNavigator';
import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { GlassCard } from '../../components/ui/GlassCard';
import { useAuth } from '../../context/AuthContext';

const formatPrice = (price: number) =>
  `₹${price.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export const ProductDetailScreen: React.FC = () => {
  const route = useRoute<RouteProp<ProductsStackParams, 'ProductDetail'>>();
  const insets = useSafeAreaInsets();
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) return <LoadingSpinner fullScreen />;

  if (error || !product) {
    return (
      <AnimatedScreen>
        <View style={[styles.centered, { backgroundColor: colors.background, paddingTop: insets.top }]}>
          <GlassCard glowColor={colors.danger}>
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={32} color={colors.danger} />
              <Text style={[styles.errorText, { color: colors.danger }]}>{error ?? 'Product not found'}</Text>
            </View>
          </GlassCard>
        </View>
      </AnimatedScreen>
    );
  }

  return (
    <AnimatedScreen>
      <ScrollView
        style={[styles.root, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom + 100 }]}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
      >
        <GlassCard glowColor={colors.primary} noPadding>
          <View style={[styles.imageSection, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
            {product.imageUrl ? (
              <Image source={{ uri: product.imageUrl }} style={styles.heroImage} resizeMode="cover" />
            ) : (
              <View style={styles.placeholderImage}>
                <Ionicons name="cube-outline" size={64} color={colors.textMuted} />
              </View>
            )}
          </View>

          <View style={styles.details}>
            {product.category ? (
              <Text style={[styles.category, { color: colors.primary }]}>{product.category}</Text>
            ) : null}
            <Text style={[styles.name, { color: colors.text }]}>{product.name}</Text>
            <Text style={[styles.price, { color: colors.text }]}>{formatPrice(product.price)}</Text>

            <View style={styles.stockRow}>
              <Ionicons
                name={product.inStock ? 'checkmark-circle' : 'close-circle'}
                size={20}
                color={product.inStock ? colors.success : colors.danger}
              />
              <Text style={[styles.stockLabel, { color: product.inStock ? colors.success : colors.danger }]}>
                {product.inStock ? `In Stock (${product.stock} available)` : 'Out of Stock'}
              </Text>
            </View>
          </View>
        </GlassCard>

        {product.description ? (
          <GlassCard>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Description</Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>{product.description}</Text>
          </GlassCard>
        ) : null}

        <GlassCard glowColor={colors.accent}>
          <View style={styles.purchaseInfo}>
            <Ionicons name="storefront-outline" size={24} color={colors.accent} />
            <View style={styles.purchaseText}>
              <Text style={[styles.purchaseTitle, { color: colors.text }]}>Available at Gym Counter</Text>
              <Text style={[styles.purchaseSubtitle, { color: colors.textSecondary }]}>
                Visit the front desk to purchase this product.
              </Text>
            </View>
          </View>
        </GlassCard>
      </ScrollView>
    </AnimatedScreen>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: SPACING.md, gap: SPACING.md },
  centered: { flex: 1, padding: SPACING.md, justifyContent: 'center' },

  imageSection: { alignItems: 'center', paddingVertical: SPACING.lg },
  heroImage: { width: 200, height: 200, borderRadius: RADIUS.lg },
  placeholderImage: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center' },

  details: { padding: SPACING.md, gap: 6 },
  category: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  name: { fontSize: 24, fontWeight: '800' },
  price: { fontSize: 22, fontWeight: '900', marginTop: 4 },
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: SPACING.sm },
  stockLabel: { fontSize: FONT_SIZE.sm, fontWeight: '600' },

  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: SPACING.sm },
  description: { fontSize: FONT_SIZE.md, lineHeight: 22 },

  purchaseInfo: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  purchaseText: { flex: 1, gap: 4 },
  purchaseTitle: { fontSize: FONT_SIZE.md, fontWeight: '700' },
  purchaseSubtitle: { fontSize: FONT_SIZE.sm, lineHeight: 20 },

  errorBox: { alignItems: 'center', gap: SPACING.sm, padding: SPACING.lg },
  errorText: { fontSize: FONT_SIZE.md, textAlign: 'center' },
});
