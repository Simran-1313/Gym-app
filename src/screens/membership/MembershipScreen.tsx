import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { GlassCard } from '../../components/ui/GlassCard';
import { AnimatedButton } from '../../components/ui/AnimatedButton';
import { AnimatedChip } from '../../components/ui/AnimatedChip';
import { GlassInput } from '../../components/ui/GlassInput';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { GlassOverlay } from '../../components/ui/GlassOverlay';
import { StaggerItem } from '../../components/ui/StaggerItem';
import { EmptyState } from '../../components/ui/EmptyState';
import { useThemeColors } from '../../hooks/useThemeColors';
import type { ThemeColors } from '../../config/theme';
import { FONT_SIZE, FONTS, RADIUS, SPACING } from '../../config/theme';
import {
  cancelFreezeRequest,
  getInvoices,
  getMembership,
  getPlans,
  requestFreeze,
} from '../../services/subscription.service';
import { Installment, Invoice, Membership, MembershipPlanSummary, MemberSubscription } from '../../types';

/**
 * The member's membership, as the gym has recorded it: plan and dates, what's
 * still owed, freezes, invoices and the plans on offer.
 *
 * Read-only by design. There are no payments in the app; dues are paid at the
 * front desk and recorded there, so this screen says what's owed and how to
 * reach the gym rather than offering a checkout. The one thing a member can
 * do from here is ask for a freeze, which the gym approves.
 */

const DAY_MS = 86400000;
const rupees = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const dayMonth = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const daysLeft = (endDate: string) => Math.max(0, Math.ceil((new Date(endDate).getTime() - Date.now()) / DAY_MS));

/** "3 months", "1 year", "45 days" — never "/month" for a plan that isn't monthly. */
const termLabel = (sub: MemberSubscription) => {
  const months = sub.durationMonths ?? (sub.durationDays % 30 === 0 ? sub.durationDays / 30 : null);
  if (months === 12) return '1 year';
  if (months) return `${months} ${months === 1 ? 'month' : 'months'}`;
  return `${sub.durationDays} days`;
};

const planTerm = (p: MembershipPlanSummary) =>
  p.durationDays % 365 === 0
    ? `${p.durationDays / 365} ${p.durationDays === 365 ? 'year' : 'years'}`
    : p.durationDays % 30 === 0
      ? `${p.durationDays / 30} ${p.durationDays === 30 ? 'month' : 'months'}`
      : `${p.durationDays} days`;

/** YYYY-MM-DD for a day `offset` days from today, on the phone's calendar. */
const localDateKey = (offset: number) => {
  const d = new Date(Date.now() + offset * DAY_MS);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const STATUS_LABEL: Record<MemberSubscription['status'], string> = {
  ACTIVE: 'Active',
  FROZEN: 'Frozen',
  EXPIRED: 'Expired',
  CANCELLED: 'Cancelled',
};

const installmentChip = (i: Installment, colors: ThemeColors) => {
  if (i.status === 'PAID') return { label: 'Paid', color: colors.success };
  if (i.isOverdue) return { label: 'Overdue', color: colors.danger };
  if (i.paidAmount > 0) return { label: 'Part paid', color: colors.warning };
  return { label: 'Due', color: colors.textMuted };
};

const START_OPTIONS = [
  { label: 'Today', offset: 0 },
  { label: 'Tomorrow', offset: 1 },
  { label: 'In a week', offset: 7 },
];
const DAY_OPTIONS = [7, 14, 21, 30];

export const MembershipScreen: React.FC = () => {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const nav = useNavigation();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [plans, setPlans] = useState<MembershipPlanSummary[]>([]);

  const [freezeOpen, setFreezeOpen] = useState(false);
  const [freezeStart, setFreezeStart] = useState(1);
  const [freezeDays, setFreezeDays] = useState(14);
  const [freezeReason, setFreezeReason] = useState('');
  const [sending, setSending] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      // Membership is the screen; invoices and plans are extras that mustn't sink it.
      const [m, inv, pl] = await Promise.all([
        getMembership(),
        getInvoices().catch(() => null),
        getPlans().catch(() => null),
      ]);
      setMembership(m);
      setInvoices(inv?.invoices ?? []);
      setPlans(pl ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load your membership');
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const callGym = (phone: string) => {
    Linking.openURL(`tel:${phone}`).catch(() => Alert.alert('Can’t start a call', phone));
  };

  const openInvoice = (inv: Invoice) => {
    Linking.openURL(inv.url).catch(() => Alert.alert('Couldn’t open the invoice', 'Try again in a moment.'));
  };

  const sendFreeze = async () => {
    setSending(true);
    try {
      await requestFreeze({ startDate: localDateKey(freezeStart), days: freezeDays, reason: freezeReason.trim() || undefined });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setFreezeOpen(false);
      setFreezeReason('');
      await load();
    } catch (err) {
      Alert.alert('Request not sent', err instanceof Error ? err.message : 'Try again in a moment.');
    } finally {
      setSending(false);
    }
  };

  const withdraw = async (id: string) => {
    setWithdrawing(true);
    try {
      await cancelFreezeRequest(id);
      await load();
    } catch (err) {
      Alert.alert('Couldn’t withdraw', err instanceof Error ? err.message : 'Try again in a moment.');
    } finally {
      setWithdrawing(false);
    }
  };

  const header = <ScreenHeader title="Membership" onBack={nav.canGoBack() ? () => nav.goBack() : undefined} />;

  if (loading) {
    return (
      <AnimatedScreen>
        {header}
        <LoadingSpinner fullScreen />
      </AnimatedScreen>
    );
  }

  if (error || !membership) {
    return (
      <AnimatedScreen>
        {header}
        <EmptyState
          icon="warning-outline"
          title="Couldn’t load your membership"
          subtitle={error ?? undefined}
          actionLabel="Try Again"
          onAction={() => {
            setLoading(true);
            load().finally(() => setLoading(false));
          }}
        />
      </AnimatedScreen>
    );
  }

  const { subscription: sub, lastSubscription: last, freezeRequest: freeze, gym } = membership;
  const gymName = gym.name ?? 'your gym';
  const remaining = sub ? daysLeft(sub.endDate) : 0;
  const urgency = remaining <= 3 ? colors.danger : remaining <= 7 ? colors.warning : colors.success;
  const periodMs = sub ? new Date(sub.endDate).getTime() - new Date(sub.startDate).getTime() : 1;
  const elapsed = sub ? Math.min(1, Math.max(0, (Date.now() - new Date(sub.startDate).getTime()) / periodMs)) : 0;
  const pendingFreeze = freeze?.status === 'PENDING' ? freeze : null;
  const freezeScheduled = sub?.freezeStartDate && sub.freezeEndDate && new Date(sub.freezeEndDate).getTime() > Date.now();
  let index = 0;

  return (
    <AnimatedScreen>
      {header}
      <ScrollView
        style={s.root}
        contentContainerStyle={{ paddingTop: SPACING.md, paddingBottom: insets.bottom + 110, paddingHorizontal: 16, gap: 14 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* ── Plan ── */}
        {sub ? (
          <StaggerItem index={index++}>
            <GlassCard elevated innerStyle={s.planCard}>
              <View style={s.planTop}>
                <View style={{ flex: 1 }}>
                  <View style={[s.tierBadge, { backgroundColor: `${colors.primary}1F` }]}>
                    <Text style={[s.tierBadgeText, { color: colors.primary }]} numberOfLines={1}>
                      {sub.planName.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[s.priceText, { color: colors.text }]}>
                    {rupees(sub.agreedAmount)}
                    <Text style={[s.priceUnit, { color: colors.textMuted }]}> · {termLabel(sub)}</Text>
                  </Text>
                </View>
                <View
                  style={[
                    s.statusPill,
                    { backgroundColor: `${sub.status === 'ACTIVE' ? colors.success : colors.warning}1F` },
                  ]}
                >
                  <Text style={[s.statusPillText, { color: sub.status === 'ACTIVE' ? colors.success : colors.warning }]}>
                    {STATUS_LABEL[sub.status]}
                  </Text>
                </View>
              </View>

              <View style={[s.track, { backgroundColor: colors.cardPressed }]}>
                <View style={[s.trackFill, { backgroundColor: urgency, width: `${elapsed * 100}%` }]} />
              </View>
              <View style={s.trackLabels}>
                <Text style={[s.trackLabel, { color: colors.textMuted }]}>
                  {dayMonth(sub.startDate)} – {dayMonth(sub.endDate)}
                </Text>
                <Text style={[s.trackLabel, { color: urgency, fontFamily: FONTS.bodyBold }]}>
                  {remaining} {remaining === 1 ? 'day' : 'days'} left
                </Text>
              </View>
              {freezeScheduled ? (
                <Text style={[s.note, { color: colors.textSecondary }]}>
                  {sub.status === 'FROZEN' ? 'Paused' : 'Pause approved'} {dayMonth(sub.freezeStartDate!)} – {dayMonth(sub.freezeEndDate!)}.
                  Your end date already includes the frozen days.
                </Text>
              ) : null}
            </GlassCard>
          </StaggerItem>
        ) : (
          <EmptyState
            icon="card-outline"
            title={last ? 'Your membership has ended' : 'No membership yet'}
            subtitle={
              last
                ? `Your ${last.planName} ended on ${dayMonth(last.endDate)}. Renew at the front desk at ${gymName}.`
                : `Once ${gymName} sets up your membership, your plan and dates will show here.`
            }
          />
        )}

        {/* ── Dues ── */}
        {sub && (sub.balanceDue > 0 || sub.installments.length > 1) ? (
          <StaggerItem index={index++}>
            <Text style={[s.sectionTitle, { color: colors.text }]}>Payments</Text>
            <GlassCard innerStyle={{ gap: 12 }}>
              <View style={s.dueTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.dueAmount, { color: sub.balanceDue > 0 ? colors.text : colors.success }]}>
                    {sub.balanceDue > 0 ? `${rupees(sub.balanceDue)} due` : 'All paid'}
                  </Text>
                  <Text style={[s.rowSub, { color: colors.textMuted }]}>
                    {rupees(sub.amountPaid)} of {rupees(sub.agreedAmount)} paid
                  </Text>
                </View>
              </View>
              {sub.installments.map((inst) => {
                const chip = installmentChip(inst, colors);
                return (
                  <View key={inst.id} style={[s.instRow, { borderTopColor: colors.cardBorder }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.rowTitle, { color: colors.text }]}>{inst.label}</Text>
                      <Text style={[s.rowSub, { color: colors.textMuted }]}>
                        {inst.dueDate ? `Due ${dayMonth(inst.dueDate)}` : 'No fixed date'}
                        {inst.paidAmount > 0 && inst.balance > 0 ? ` · ${rupees(inst.balance)} left` : ''}
                      </Text>
                    </View>
                    <Text style={[s.instAmount, { color: colors.text }]}>{rupees(inst.amount)}</Text>
                    <View style={[s.chip, { backgroundColor: `${chip.color}1F` }]}>
                      <Text style={[s.chipText, { color: chip.color }]}>{chip.label}</Text>
                    </View>
                  </View>
                );
              })}
              {sub.balanceDue > 0 ? (
                <Text style={[s.note, { color: colors.textSecondary }]}>
                  Pay at the front desk at {gymName}. Payments made there show up here once recorded.
                </Text>
              ) : null}
              {sub.balanceDue > 0 && gym.phone ? (
                <AnimatedButton label={`Call ${gymName}`} variant="secondary" onPress={() => callGym(gym.phone!)} />
              ) : null}
            </GlassCard>
          </StaggerItem>
        ) : null}

        {/* ── Freeze ── */}
        {sub ? (
          <StaggerItem index={index++}>
            <Text style={[s.sectionTitle, { color: colors.text }]}>Pause your membership</Text>
            <GlassCard innerStyle={{ gap: 10 }}>
              {pendingFreeze ? (
                <>
                  <View style={s.row}>
                    <View style={[s.rowIcon, { backgroundColor: `${colors.warning}1F` }]}>
                      <Ionicons name="hourglass-outline" size={17} color={colors.warning} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.rowTitle, { color: colors.text }]}>Freeze requested</Text>
                      <Text style={[s.rowSub, { color: colors.textMuted }]}>
                        {dayMonth(pendingFreeze.startDate)} – {dayMonth(pendingFreeze.endDate)} · {pendingFreeze.days} days ·
                        waiting for {gymName}
                      </Text>
                    </View>
                  </View>
                  <AnimatedButton
                    label="Withdraw request"
                    variant="ghost"
                    loading={withdrawing}
                    onPress={() => withdraw(pendingFreeze.id)}
                  />
                </>
              ) : (
                <>
                  {freeze && freeze.status !== 'CANCELLED' ? (
                    <View style={s.row}>
                      <View
                        style={[
                          s.rowIcon,
                          { backgroundColor: `${freeze.status === 'APPROVED' ? colors.success : colors.danger}1F` },
                        ]}
                      >
                        <Ionicons
                          name={freeze.status === 'APPROVED' ? 'checkmark-circle-outline' : 'close-circle-outline'}
                          size={17}
                          color={freeze.status === 'APPROVED' ? colors.success : colors.danger}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.rowTitle, { color: colors.text }]}>
                          {freeze.status === 'APPROVED' ? 'Freeze approved' : 'Freeze request declined'}
                        </Text>
                        <Text style={[s.rowSub, { color: colors.textMuted }]}>
                          {freeze.status === 'APPROVED'
                            ? `${dayMonth(freeze.startDate)} – ${dayMonth(freeze.endDate)}`
                            : freeze.responseNote
                              ? `“${freeze.responseNote}”`
                              : `Ask at the front desk at ${gymName}.`}
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <Text style={[s.note, { color: colors.textSecondary }]}>
                      Travelling or injured? Ask {gymName} to pause your membership. The days you’re away are added
                      to your end date.
                    </Text>
                  )}
                  {membership.canRequestFreeze ? (
                    <AnimatedButton label="Request a freeze" variant="secondary" onPress={() => setFreezeOpen(true)} />
                  ) : null}
                </>
              )}
            </GlassCard>
          </StaggerItem>
        ) : null}

        {/* ── Invoices ── */}
        {invoices.length > 0 ? (
          <StaggerItem index={index++}>
            <Text style={[s.sectionTitle, { color: colors.text }]}>Invoices</Text>
            <View style={{ gap: 10 }}>
              {invoices.map((inv) => (
                <Pressable key={inv.id} onPress={() => openInvoice(inv)} accessibilityRole="link" accessibilityLabel={`Open invoice ${inv.invoiceNumber}`}>
                  <GlassCard innerStyle={s.row}>
                    <View style={[s.rowIcon, { backgroundColor: colors.inset }]}>
                      <Ionicons name="document-text-outline" size={17} color={colors.textMuted} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.rowTitle, { color: colors.text }]} numberOfLines={1}>
                        {inv.description ?? inv.invoiceNumber}
                      </Text>
                      <Text style={[s.rowSub, { color: colors.textMuted }]} numberOfLines={1}>
                        {inv.invoiceNumber} · {dayMonth(inv.issuedAt)}
                        {inv.paymentMethod ? ` · ${inv.paymentMethod}` : ''}
                      </Text>
                    </View>
                    <View style={[s.chip, { backgroundColor: colors.inset }]}>
                      <Text style={[s.chipText, { color: colors.textSecondary }]}>{rupees(inv.total)}</Text>
                    </View>
                  </GlassCard>
                </Pressable>
              ))}
            </View>
          </StaggerItem>
        ) : null}

        {/* ── Plans ── */}
        {plans.length > 0 ? (
          <StaggerItem index={index++}>
            <Text style={[s.sectionTitle, { color: colors.text }]}>Plans at {gymName}</Text>
            <GlassCard innerStyle={{ gap: 0 }}>
              {plans.map((p, i) => (
                <View key={p.id} style={[s.planRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.cardBorder }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.rowTitle, { color: colors.text }]}>{p.name}</Text>
                    <Text style={[s.rowSub, { color: colors.textMuted }]}>{planTerm(p)}</Text>
                  </View>
                  <Text style={[s.instAmount, { color: colors.text }]}>{rupees(p.price)}</Text>
                </View>
              ))}
            </GlassCard>
            <Text style={[s.note, { color: colors.textMuted, marginTop: 8 }]}>To switch or renew, ask at the front desk.</Text>
          </StaggerItem>
        ) : null}

        {/* ── Gym contact ── */}
        {gym.phone || gym.address || gym.email ? (
          <StaggerItem index={index++}>
            <Text style={[s.sectionTitle, { color: colors.text }]}>{gymName}</Text>
            <GlassCard innerStyle={{ gap: 12 }}>
              {gym.address ? <ContactRow icon="location-outline" text={gym.address} colors={colors} /> : null}
              {gym.phone ? (
                <ContactRow icon="call-outline" text={gym.phone} colors={colors} onPress={() => callGym(gym.phone!)} />
              ) : null}
              {gym.email ? (
                <ContactRow
                  icon="mail-outline"
                  text={gym.email}
                  colors={colors}
                  onPress={() => Linking.openURL(`mailto:${gym.email}`).catch(() => {})}
                />
              ) : null}
            </GlassCard>
          </StaggerItem>
        ) : null}
      </ScrollView>

      <GlassOverlay
        visible={freezeOpen}
        title="Request a freeze"
        message={`${gymName} will confirm. Nothing changes until they approve.`}
        confirmLabel="Send request"
        loading={sending}
        onConfirm={sendFreeze}
        onCancel={() => setFreezeOpen(false)}
      >
        <View style={{ gap: 14, marginBottom: 6 }}>
          <View style={{ gap: 8 }}>
            <Text style={[s.formLabel, { color: colors.textSecondary }]}>Starting</Text>
            <View style={s.chipRow}>
              {START_OPTIONS.map((o, i) => (
                <AnimatedChip key={o.label} index={i} label={o.label} selected={freezeStart === o.offset} onPress={() => setFreezeStart(o.offset)} />
              ))}
            </View>
          </View>
          <View style={{ gap: 8 }}>
            <Text style={[s.formLabel, { color: colors.textSecondary }]}>For</Text>
            <View style={s.chipRow}>
              {DAY_OPTIONS.map((d, i) => (
                <AnimatedChip key={d} index={i} label={`${d} days`} selected={freezeDays === d} onPress={() => setFreezeDays(d)} />
              ))}
            </View>
          </View>
          <GlassInput
            label="Reason (optional)"
            placeholder="e.g. Travelling for work"
            value={freezeReason}
            onChangeText={setFreezeReason}
            maxLength={300}
          />
        </View>
      </GlassOverlay>
    </AnimatedScreen>
  );
};

const ContactRow: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  colors: ThemeColors;
  onPress?: () => void;
}> = ({ icon, text, colors, onPress }) => (
  <Pressable onPress={onPress} disabled={!onPress} style={s.contactRow} accessibilityRole={onPress ? 'button' : undefined}>
    <Ionicons name={icon} size={16} color={colors.textMuted} />
    <Text style={[s.contactText, { color: onPress ? colors.primary : colors.textSecondary }]}>{text}</Text>
  </Pressable>
);

const s = StyleSheet.create({
  root: { flex: 1 },

  planCard: { gap: 0, padding: SPACING.lg },
  planTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  tierBadge: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 4, borderRadius: RADIUS.full, marginBottom: 8, maxWidth: '100%' },
  tierBadgeText: { fontSize: 10, fontFamily: FONTS.bodyExtra, letterSpacing: 0.4 },
  priceText: { fontSize: 22, fontFamily: FONTS.bodyExtra },
  priceUnit: { fontSize: 12, fontFamily: FONTS.bodyMedium },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full },
  statusPillText: { fontSize: 10.5, fontFamily: FONTS.bodyBold, letterSpacing: 0.3 },

  track: { height: 6, borderRadius: 6, overflow: 'hidden', marginTop: 18 },
  trackFill: { height: '100%', borderRadius: 6 },
  trackLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  trackLabel: { fontSize: 11 },

  // `.section-row .st { font-size:14px; font-weight:700 }`
  sectionTitle: { fontSize: 14, fontFamily: FONTS.bodyBold, marginBottom: SPACING.sm, marginTop: 10 },
  note: { fontSize: FONT_SIZE.xs, lineHeight: 17, marginTop: 10 },

  dueTop: { flexDirection: 'row', alignItems: 'center' },
  dueAmount: { fontSize: 20, fontFamily: FONTS.bodyExtra },
  instRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  instAmount: { fontSize: 13, fontFamily: FONTS.bodyBold },

  // `.checkin-icon { 40x40; radius 12 }` / `.checkin-name` / `.checkin-meta`
  row: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  rowIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 13.5, fontFamily: FONTS.bodySemi },
  rowSub: { fontSize: 11.5, marginTop: 2 },
  // `.checkin-badge { 9.5/700; padding 4px 9px; radius 100; uppercase; .02em }`
  chip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: RADIUS.full },
  chipText: { fontSize: 9.5, fontFamily: FONTS.bodyBold, textTransform: 'uppercase', letterSpacing: 0.19 },

  planRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  contactRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  contactText: { flex: 1, fontSize: 13, lineHeight: 18 },

  formLabel: { fontSize: 12, fontFamily: FONTS.bodySemi },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
