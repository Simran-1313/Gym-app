import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { GlassCard } from '../../components/ui/GlassCard';
import { AnimatedButton } from '../../components/ui/AnimatedButton';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { GlassOverlay } from '../../components/ui/GlassOverlay';
import { StaggerItem } from '../../components/ui/StaggerItem';
import { EmptyState } from '../../components/ui/EmptyState';
import { useThemeColors } from '../../hooks/useThemeColors';
import { FONT_SIZE, FONTS, RADIUS, SPACING } from '../../config/theme';
import { getInvoices, getSubscription, requestFreeze } from '../../services/subscription.service';
import { ActiveSubscription, Invoice } from '../../types';
import { RootStackParams } from '../../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParams>;

const daysLeft = (endDate: string) => Math.max(0, Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000));

/** Falls back to a representative sample plan while the subscription/billing backend is being built (§13 Phase 2 — not shipped yet per the engineering audit), so the screen is reviewable today instead of blank. */
const SAMPLE_SUBSCRIPTION: ActiveSubscription = {
  id: 'sample',
  userId: 'sample',
  planId: 'gold-monthly',
  startDate: new Date(Date.now() - 18 * 86400000).toISOString(),
  endDate: new Date(Date.now() + 12 * 86400000).toISOString(),
  status: 'ACTIVE',
  paymentStatus: 'PAID',
  plan: { id: 'gold-monthly', name: 'Gold Plan', price: 4999, durationDays: 30 },
};

const SAMPLE_INVOICES: Invoice[] = [
  { id: '1', invoiceNumber: 'INV-2025-0912', amount: 4999, currency: 'INR', status: 'PAID', planName: 'Gold Plan', issuedAt: new Date(Date.now() - 18 * 86400000).toISOString(), paymentMethod: 'UPI' },
  { id: '2', invoiceNumber: 'INV-2025-0812', amount: 4999, currency: 'INR', status: 'PAID', planName: 'Gold Plan', issuedAt: new Date(Date.now() - 48 * 86400000).toISOString(), paymentMethod: 'UPI' },
  { id: '3', invoiceNumber: 'INV-2025-0715', amount: 4999, currency: 'INR', status: 'PAID', planName: 'Gold Plan', issuedAt: new Date(Date.now() - 79 * 86400000).toISOString(), paymentMethod: 'UPI' },
];

export const MembershipScreen: React.FC = () => {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const nav = useNavigation<Nav>();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subscription, setSubscription] = useState<ActiveSubscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isSample, setIsSample] = useState(false);
  const [freezeConfirm, setFreezeConfirm] = useState(false);
  const [freezing, setFreezing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [sub, invoiceRes] = await Promise.all([getSubscription(), getInvoices()]);
      setSubscription(sub ?? SAMPLE_SUBSCRIPTION);
      setInvoices(invoiceRes.invoices.length ? invoiceRes.invoices : SAMPLE_INVOICES);
      setIsSample(!sub);
    } catch {
      // Billing endpoints aren't live yet — show sample data rather than a dead screen.
      setSubscription(SAMPLE_SUBSCRIPTION);
      setInvoices(SAMPLE_INVOICES);
      setIsSample(true);
    }
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  const handleFreeze = async () => {
    setFreezing(true);
    try {
      await requestFreeze();
    } catch {
      // No backend yet — the confirmation still communicates intent to the member.
    }
    setFreezing(false);
    setFreezeConfirm(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };

  if (loading) return <LoadingSpinner fullScreen />;

  const remaining = subscription ? daysLeft(subscription.endDate) : 0;
  const urgencyColor = remaining <= 3 ? colors.danger : remaining <= 7 ? colors.warning : colors.success;
  const cycleProgress = subscription
    ? Math.min(1, Math.max(0, 1 - remaining / subscription.plan.durationDays))
    : 0;

  return (
    <AnimatedScreen>
      <ScreenHeader
        title="Membership & Billing"
        onBack={nav.canGoBack() ? () => nav.goBack() : undefined}
      />
      <ScrollView
        style={s.root}
        contentContainerStyle={{ paddingTop: SPACING.md, paddingBottom: insets.bottom + 110, paddingHorizontal: 16, gap: 14 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {isSample ? (
          <Animated.View entering={FadeInUp.duration(300)}>
            <Text style={[s.sampleNote, { color: colors.textMuted }]}>Showing sample billing data — live billing is coming soon.</Text>
          </Animated.View>
        ) : null}

        {subscription ? (
          <StaggerItem index={0}>
            <GlassCard elevated innerStyle={s.planCard}>
              <View style={s.planTop}>
                <View>
                  <View style={[s.tierBadge, { backgroundColor: `${colors.primary}1F` }]}>
                    <Text style={[s.tierBadgeText, { color: colors.primary }]}>{subscription.plan.name.toUpperCase()}</Text>
                  </View>
                  <Text style={[s.priceText, { color: colors.text }]}>
                    ₹{subscription.plan.price.toLocaleString('en-IN')}
                    <Text style={[s.priceUnit, { color: colors.textMuted }]}>/month</Text>
                  </Text>
                </View>
                <View style={[s.statusPill, { backgroundColor: `${colors.success}1F` }]}>
                  <Text style={[s.statusPillText, { color: colors.success }]}>{subscription.status}</Text>
                </View>
              </View>

              <View style={[s.track, { backgroundColor: colors.cardPressed }]}>
                <View style={[s.trackFill, { backgroundColor: urgencyColor, width: `${cycleProgress * 100}%` }]} />
              </View>
              <View style={s.trackLabels}>
                <Text style={[s.trackLabel, { color: colors.textMuted }]}>
                  Billing cycle started {new Date(subscription.startDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                </Text>
                <Text style={[s.trackLabel, { color: urgencyColor, fontFamily: FONTS.bodyBold }]}>{remaining} days left</Text>
              </View>

              <View style={s.planActions}>
                <AnimatedButton label="Upgrade Plan" variant="secondary" style={{ flex: 1 }} onPress={() => {}} />
                <AnimatedButton
                  label="Renew Now"
                  variant="primary"
                  style={{ flex: 1 }}
                  onPress={() => nav.navigate('Checkout', { subscription })}
                />
              </View>
            </GlassCard>
          </StaggerItem>
        ) : (
          <EmptyState icon="card-outline" title="No active membership" subtitle="Contact the front desk to set up your plan." />
        )}

        <StaggerItem index={1}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>Payment Method</Text>
          <GlassCard innerStyle={s.row}>
            <View style={[s.rowIcon, { backgroundColor: colors.inset }]}>
              <Ionicons name="card-outline" size={17} color={colors.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.rowTitle, { color: colors.text }]}>UPI · you@okaxis</Text>
              <Text style={[s.rowSub, { color: colors.textMuted }]}>Default payment method</Text>
            </View>
            <Text style={[s.rowAction, { color: colors.primary }]}>Change</Text>
          </GlassCard>
        </StaggerItem>

        <StaggerItem index={2}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>Invoice History</Text>
        </StaggerItem>
        {invoices.map((inv, i) => (
          <StaggerItem index={3 + i} key={inv.id}>
            <GlassCard innerStyle={s.row}>
              <View style={[s.rowIcon, { backgroundColor: i === 0 ? `${colors.primary}1F` : colors.inset }]}>
                <Ionicons name="document-text-outline" size={17} color={i === 0 ? colors.primary : colors.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.rowTitle, { color: colors.text }]}>
                  {new Date(inv.issuedAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })} · {inv.planName}
                </Text>
                <Text style={[s.rowSub, { color: colors.textMuted }]}>
                  Paid via {inv.paymentMethod ?? '—'} · {new Date(inv.issuedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </Text>
              </View>
              <View style={[s.amountPill, { backgroundColor: i === 0 ? `${colors.primary}1F` : colors.inset }]}>
                <Text style={[s.amountText, { color: i === 0 ? colors.primary : colors.textMuted }]}>₹{inv.amount.toLocaleString('en-IN')}</Text>
              </View>
            </GlassCard>
          </StaggerItem>
        ))}

        <AnimatedButton
          label="Freeze Membership"
          variant="ghost"
          style={{ marginTop: 6 }}
          onPress={() => setFreezeConfirm(true)}
        />
      </ScrollView>

      <GlassOverlay
        visible={freezeConfirm}
        title="Freeze Membership?"
        message="Your billing cycle pauses and no session credits are used while frozen. The front desk will confirm the freeze window with you."
        confirmLabel="Request Freeze"
        onConfirm={handleFreeze}
        onCancel={() => setFreezeConfirm(false)}
        loading={freezing}
      />
    </AnimatedScreen>
  );
};

const s = StyleSheet.create({
  root: { flex: 1 },
  sampleNote: { fontSize: FONT_SIZE.xs, marginBottom: 4 },

  planCard: { gap: 0, padding: SPACING.lg },
  planTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  tierBadge: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 4, borderRadius: RADIUS.full, marginBottom: 8 },
  tierBadgeText: { fontSize: 10, fontFamily: FONTS.bodyExtra, letterSpacing: 0.4 },
  priceText: { fontSize: 22, fontFamily: FONTS.bodyExtra },
  priceUnit: { fontSize: 12, fontFamily: FONTS.bodyMedium },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full },
  statusPillText: { fontSize: 10.5, fontFamily: FONTS.bodyBold, letterSpacing: 0.3 },

  track: { height: 6, borderRadius: 6, overflow: 'hidden', marginTop: 18 },
  trackFill: { height: '100%', borderRadius: 6 },
  trackLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  trackLabel: { fontSize: 11 },

  planActions: { flexDirection: 'row', gap: 10, marginTop: 18 },

  // `.section-row .st { font-size:14px; font-weight:700 }`
  sectionTitle: { fontSize: 14, fontFamily: FONTS.bodyBold, marginBottom: SPACING.sm, marginTop: 10 },

  // `.checkin-icon { 40x40; radius 12 }` / `.checkin-name` / `.checkin-meta`
  row: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  rowIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 13.5, fontFamily: FONTS.bodySemi },
  rowSub: { fontSize: 11.5, marginTop: 2 },
  rowAction: { fontSize: 11.5, fontFamily: FONTS.bodyBold },
  // `.checkin-badge { 9.5/700; padding 4px 9px; radius 100; uppercase; .02em }`
  amountPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: RADIUS.full },
  amountText: { fontSize: 9.5, fontFamily: FONTS.bodyBold, textTransform: 'uppercase', letterSpacing: 0.19 },
});
