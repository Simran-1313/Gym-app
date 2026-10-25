import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { FONTS, RADIUS, SPACING, metricTint } from '../../config/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { finiteNum } from '../../utils/activity';

export interface DataPoint {
  label: string;
  value: number;
  displayValue: string;
}

interface Props {
  metricType: 'CALORIES' | 'DURATION' | 'WATER';
  viewMode: 'DAILY' | 'MONTHLY';
  customData?: DataPoint[];
}

const mockData: Record<Props['metricType'], Record<Props['viewMode'], DataPoint[]>> = {
  CALORIES: {
    DAILY: [
      { label: 'M', value: 320, displayValue: '320 kcal' },
      { label: 'T', value: 640, displayValue: '640 kcal' },
      { label: 'W', value: 450, displayValue: '450 kcal' },
      { label: 'T', value: 800, displayValue: '800 kcal' },
      { label: 'F', value: 540, displayValue: '540 kcal' },
      { label: 'S', value: 480, displayValue: '480 kcal' },
      { label: 'S', value: 300, displayValue: '300 kcal' },
    ],
    MONTHLY: [
      { label: 'Jan', value: 12500, displayValue: '12.5k kcal' },
      { label: 'Feb', value: 14000, displayValue: '14.0k kcal' },
      { label: 'Mar', value: 18200, displayValue: '18.2k kcal' },
      { label: 'Apr', value: 11000, displayValue: '11.0k kcal' },
      { label: 'May', value: 21000, displayValue: '21.0k kcal' },
      { label: 'Jun', value: 9800, displayValue: '9.8k kcal' },
    ],
  },
  DURATION: {
    DAILY: [
      { label: 'M', value: 30, displayValue: '30m' },
      { label: 'T', value: 45, displayValue: '45m' },
      { label: 'W', value: 60, displayValue: '60m' },
      { label: 'T', value: 0, displayValue: '0m' },
      { label: 'F', value: 45, displayValue: '45m' },
      { label: 'S', value: 90, displayValue: '90m' },
      { label: 'S', value: 15, displayValue: '15m' },
    ],
    MONTHLY: [
      { label: 'Jan', value: 12.5, displayValue: '12.5 hrs' },
      { label: 'Feb', value: 16.0, displayValue: '16.0 hrs' },
      { label: 'Mar', value: 22.4, displayValue: '22.4 hrs' },
      { label: 'Apr', value: 14.2, displayValue: '14.2 hrs' },
      { label: 'May', value: 25.0, displayValue: '25.0 hrs' },
      { label: 'Jun', value: 11.8, displayValue: '11.8 hrs' },
    ],
  },
  WATER: {
    DAILY: [
      { label: 'M', value: 2000, displayValue: '2.0L' },
      { label: 'T', value: 2500, displayValue: '2.5L' },
      { label: 'W', value: 3000, displayValue: '3.0L' },
      { label: 'T', value: 1500, displayValue: '1.5L' },
      { label: 'F', value: 2250, displayValue: '2.25L' },
      { label: 'S', value: 3000, displayValue: '3.0L' },
      { label: 'S', value: 1800, displayValue: '1.8L' },
    ],
    MONTHLY: [
      { label: 'Jan', value: 62000, displayValue: '62L' },
      { label: 'Feb', value: 74000, displayValue: '74L' },
      { label: 'Mar', value: 89000, displayValue: '89L' },
      { label: 'Apr', value: 58000, displayValue: '58L' },
      { label: 'May', value: 92000, displayValue: '92L' },
      { label: 'Jun', value: 45000, displayValue: '45L' },
    ],
  },
};

/** The same hues the activity rings use, so a metric reads as one colour everywhere. */

/** Axis labels must fit on one line under a narrow bar: "06AM" → "6a". */
const compactLabel = (label: string) => {
  const m = /^0?(\d{1,2})\s*(AM|PM)$/i.exec(label.trim());
  return m ? `${m[1]}${m[2][0].toLowerCase()}` : label;
};

/** Readable long form for the callout: "06AM" → "6 AM". */
const longLabel = (label: string) => {
  const m = /^0?(\d{1,2})\s*(AM|PM)$/i.exec(label.trim());
  return m ? `${m[1]} ${m[2].toUpperCase()}` : label;
};

const TIME_LABEL = /^0?(\d{1,2})\s*(AM|PM)$/i;

const EMPTY_COPY: Record<Props['metricType'], string> = {
  CALORIES: 'No calories burned',
  DURATION: 'No active minutes',
  WATER: 'No water logged',
};

/** Beyond this many bars, only every Nth label is drawn so none collide. */
const MAX_LABELS = 7;

const formatY = (val: number) => {
  if (val === 0) return '0';
  if (val >= 1000) return `${(val / 1000).toFixed(val >= 10000 ? 0 : 1)}k`;
  return `${Math.round(val)}`;
};

export const AppleBarChart: React.FC<Props> = ({ metricType, viewMode, customData }) => {
  const colors = useThemeColors();
  const raw = customData && customData.length > 0 ? customData : (mockData[metricType]?.[viewMode] ?? []);
  // The API has sent numeric strings before; a string value made every bar
  // fall through to the empty marker.
  const data = raw.map((p) => ({ ...p, value: Math.max(0, finiteNum(p.value)) }));
  const tint = metricTint(colors, metricType);
  const allZero = data.every((p) => p.value === 0);
  // An hour-by-hour day is mostly empty hours. It gets a list of the hours
  // that had something under the chart, so a single workout isn't one thin
  // bar lost among 23 empty slots.
  const hourly = data.length > 0 && data.filter((p) => TIME_LABEL.test(p.label.trim())).length >= data.length / 2;
  const activeHours = hourly ? data.map((p, i) => ({ ...p, i })).filter((p) => p.value > 0) : [];

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // A new series means the old selection points at nothing meaningful.
  useEffect(() => {
    setSelectedIndex(null);
  }, [metricType, viewMode, customData]);

  const peakIndex = data.reduce((best, p, i) => (p.value > (data[best]?.value ?? -1) ? i : best), 0);
  const calloutIndex = selectedIndex ?? peakIndex;
  const callout = allZero && selectedIndex === null ? null : data[calloutIndex];
  const labelEvery = Math.ceil(data.length / MAX_LABELS);

  return (
    <View style={styles.container}>
      {/* Callout: the tapped bar, or the peak when nothing is tapped. Fixed
          height so the chart below never shifts when it changes. */}
      <View style={styles.callout}>
        {allZero ? (
          <>
            <Text style={[styles.calloutLabel, { color: colors.textMuted }]}>
              {hourly ? 'Today' : 'This period'}
            </Text>
            <Text style={[styles.calloutValue, { color: colors.textSecondary }]}>
              {EMPTY_COPY[metricType]} yet
            </Text>
          </>
        ) : callout ? (
          <>
            <Text style={[styles.calloutLabel, { color: colors.textMuted }]} numberOfLines={1}>
              {selectedIndex === null ? 'Peak · ' : ''}
              {longLabel(callout.label)}
            </Text>
            <Text style={[styles.calloutValue, { color: colors.text }]} numberOfLines={1}>
              {callout.displayValue}
            </Text>
          </>
        ) : null}
      </View>

      <View style={styles.chartArea}>
        {/* Grid: three rules with their values, behind the bars. */}
        <View style={styles.grid} pointerEvents="none">
          {[1, 0.5, 0].map((m) => (
            <View key={m} style={styles.gridRow}>
              <View style={[styles.gridLine, { backgroundColor: colors.cardBorder }]} />
              <Text style={[styles.yLabel, { color: colors.textFaint }]}>{formatY(maxValue * m)}</Text>
            </View>
          ))}
        </View>

        {/* One continuous baseline instead of a dot per empty slot. */}
        <View
          pointerEvents="none"
          style={[styles.baseline, { backgroundColor: colors.textFaint }]}
        />

        <View style={styles.barsRow}>
          {data.map((point, index) => {
            const pct = (point.value / maxValue) * 100;
            const active = index === calloutIndex;
            const showLabel = index % labelEvery === 0 || index === data.length - 1;
            return (
              <Pressable
                key={`${point.label}-${index}`}
                onPress={() => setSelectedIndex(selectedIndex === index ? null : index)}
                accessibilityLabel={`${longLabel(point.label)}, ${point.displayValue}`}
                style={styles.barCol}
              >
                <View style={[styles.barSlot, hourly && styles.barSlotDense]}>
                  {point.value > 0 ? (
                    <Animated.View
                      layout={LinearTransition.duration(220)}
                      style={[
                        styles.bar,
                        {
                          height: `${pct}%`,
                          backgroundColor: tint,
                          opacity: active || allZero ? 1 : 0.62,
                        },
                      ]}
                    />
                  ) : null}
                </View>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.xLabel,
                    { color: active ? colors.text : colors.textMuted },
                    active && { fontFamily: FONTS.bodySemi },
                  ]}
                >
                  {showLabel || active ? compactLabel(point.label) : ' '}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {activeHours.length > 0 ? (
        <View style={styles.hours}>
          {activeHours.map((h) => {
            const active = h.i === calloutIndex;
            return (
              <Pressable
                key={`${h.label}-${h.i}`}
                onPress={() => setSelectedIndex(selectedIndex === h.i ? null : h.i)}
                style={[
                  styles.hourChip,
                  {
                    backgroundColor: active ? `${tint}22` : colors.inset,
                    borderColor: active ? `${tint}66` : 'transparent',
                  },
                ]}
              >
                <View style={[styles.hourDot, { backgroundColor: tint }]} />
                <Text style={[styles.hourTime, { color: colors.textSecondary }]}>{longLabel(h.label)}</Text>
                <Text style={[styles.hourValue, { color: colors.text }]}>{h.displayValue}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
};

const X_LABEL_H = 18;

const styles = StyleSheet.create({
  container: { paddingVertical: SPACING.xs },

  callout: { height: 46, justifyContent: 'center', marginBottom: SPACING.sm },
  calloutLabel: { fontFamily: FONTS.bodyMedium, fontSize: 12 },
  calloutValue: { fontFamily: FONTS.displaySemi, fontSize: 20, letterSpacing: -0.3, fontVariant: ['tabular-nums'], marginTop: 2 },

  chartArea: { height: 180 },
  grid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: X_LABEL_H,
    justifyContent: 'space-between',
  },
  gridRow: { flexDirection: 'row', alignItems: 'center' },
  gridLine: { flex: 1, height: StyleSheet.hairlineWidth },
  // Values sit on the right edge, like Apple Health, so bars get the full width.
  yLabel: { width: 34, textAlign: 'right', fontFamily: FONTS.bodyMedium, fontSize: 10, fontVariant: ['tabular-nums'] },

  barsRow: { flex: 1, flexDirection: 'row', paddingRight: 38 },
  barCol: { flex: 1, alignItems: 'center' },
  barSlot: { flex: 1, width: '58%', maxWidth: 18, justifyContent: 'flex-end' },
  // 24 hourly bars are only ~10px wide each; fill more of the column.
  barSlotDense: { width: '78%' },
  // A real value never shrinks to nothing, however small next to the peak.
  bar: { width: '100%', minHeight: 6, borderRadius: RADIUS.sm },
  baseline: {
    position: 'absolute',
    left: 0,
    right: 38,
    bottom: X_LABEL_H,
    height: StyleSheet.hairlineWidth * 2,
    opacity: 0.6,
  },
  hours: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: SPACING.md },
  hourChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    height: 30,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  hourDot: { width: 6, height: 6, borderRadius: 3 },
  hourTime: { fontFamily: FONTS.bodyMedium, fontSize: 12, fontVariant: ['tabular-nums'] },
  hourValue: { fontFamily: FONTS.bodySemi, fontSize: 12, fontVariant: ['tabular-nums'] },
  xLabel: {
    height: X_LABEL_H,
    lineHeight: X_LABEL_H,
    fontFamily: FONTS.bodyMedium,
    fontSize: 10.5,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
});
