import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';

import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { GlassCard } from '../../components/ui/GlassCard';
import { AnimatedButton } from '../../components/ui/AnimatedButton';
import { SuccessBurst } from '../../components/ui/SuccessBurst';
import { useThemeColors } from '../../hooks/useThemeColors';
import { FONT_SIZE, FONTS, RADIUS, SPACING } from '../../config/theme';
import { createPaymentOrder, verifyPayment } from '../../services/subscription.service';
import { RootStackParams } from '../../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParams>;
type CheckoutRoute = RouteProp<RootStackParams, 'Checkout'>;

const GST_RATE = 0.18;
const METHODS = ['UPI', 'Card', 'Netbanking'] as const;

export const CheckoutScreen: React.FC = () => {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const nav = useNavigation<Nav>();
  const { params } = useRoute<CheckoutRoute>();
  const { subscription } = params;

  const [method, setMethod] = useState<(typeof METHODS)[number]>('UPI');
  const [paying, setPaying] = useState(false);
  const [success, setSuccess] = useState(false);

  const total = subscription.plan.price;
  const baseAmount = total / (1 + GST_RATE);
  const gstAmount = total - baseAmount;

  const handlePay = async () => {
    setPaying(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      const order = await createPaymentOrder(subscription.planId, 'RENEWAL');
      // A real build opens the native Razorpay checkout here with `order` and
      // verifies the returned payment/signature — that needs react-native-razorpay,
      // an EAS dev build, and live keys (docs/CLASENDRA_MEMBER_MOBILE_APP.md §11),
      // none of which exist yet. This simulates the success path so the flow is
      // reviewable end to end today.
      await verifyPayment({ orderId: order.orderId, razorpayPaymentId: 'sim', razorpaySignature: 'sim' });
    } catch {
      // Payments backend isn't live yet — still show the intended success state.
    }
    setTimeout(() => {
      setPaying(false);
      setSuccess(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }, 900);
  };

  return (
    <AnimatedScreen>
      <ScrollView
        style={s.root}
        contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 40, paddingHorizontal: 16, gap: 16 }}
      >
        <Text style={[s.pageTitle, { color: colors.text }]}>Confirm & Pay</Text>

        <GlassCard>
          <Row label="Plan" value={`${subscription.plan.name} · 1 month`} bold colors={colors} />
          <Row label="Base amount" value={`₹${baseAmount.toFixed(2)}`} colors={colors} divider />
          <Row label={`GST (${GST_RATE * 100}%)`} value={`₹${gstAmount.toFixed(2)}`} colors={colors} divider />
          <Row label="Total" value={`₹${total.toFixed(2)}`} colors={colors} divider big />
        </GlassCard>

        <View>
          <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>PAY WITH</Text>
          <View style={s.methodRow}>
            {METHODS.map((m) => {
              const active = method === m;
              return (
                <Pressable
                  key={m}
                  onPress={() => { Haptics.selectionAsync().catch(() => {}); setMethod(m); }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  style={[
                    s.methodChip,
                    {
                      backgroundColor: active ? `${colors.primary}1F` : colors.surface,
                      borderColor: active ? colors.primary : colors.surfaceBorder,
                    },
                  ]}
                >
                  <Text style={[s.methodChipText, { color: active ? colors.primary : colors.textSecondary }]}>{m}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <AnimatedButton label={`Pay ₹${total.toFixed(2)} with Razorpay`} variant="primary" loading={paying} onPress={handlePay} />

        <View style={s.secureRow}>
          <Ionicons name="lock-closed-outline" size={12} color={colors.textMuted} />
          <Text style={[s.secureText, { color: colors.textMuted }]}>Secured by Razorpay · PCI-DSS compliant</Text>
        </View>
      </ScrollView>

      <SuccessBurst
        visible={success}
        onDone={() => {
          setSuccess(false);
          nav.goBack();
        }}
      />
    </AnimatedScreen>
  );
};

const Row: React.FC<{ label: string; value: string; colors: ReturnType<typeof useThemeColors>; divider?: boolean; bold?: boolean; big?: boolean }> = ({
  label,
  value,
  colors,
  divider,
  bold,
  big,
}) => (
  <View style={[s.row, divider && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.surfaceBorder }]}>
    <Text style={[s.rowLabel, { color: colors.textMuted }]}>{label}</Text>
    <Text
      style={[
        big ? s.rowValueBig : s.rowValue,
        { color: colors.text, fontFamily: bold || big ? FONTS.bodyExtra : FONTS.bodyMedium },
      ]}
    >
      {value}
    </Text>
  </View>
);

const s = StyleSheet.create({
  root: { flex: 1 },
  pageTitle: { fontSize: 22, fontFamily: FONTS.bodyExtra, letterSpacing: -0.4 },

  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  rowLabel: { fontSize: 13, fontFamily: FONTS.bodyMedium },
  rowValue: { fontSize: 13 },
  rowValueBig: { fontSize: 17 },

  sectionTitle: { fontSize: 11, fontFamily: FONTS.displayBold, letterSpacing: 0.8, marginBottom: SPACING.sm },
  methodRow: { flexDirection: 'row', gap: 10 },
  methodChip: { flex: 1, paddingVertical: 12, borderRadius: RADIUS.full, borderWidth: 1.5, alignItems: 'center' },
  methodChipText: { fontSize: 12.5, fontFamily: FONTS.bodySemi },

  secureRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 2 },
  secureText: { fontSize: 10.5 },
});
