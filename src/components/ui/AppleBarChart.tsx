import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { DARK_COLORS, LIGHT_COLORS, FONT_SIZE, RADIUS, SPACING } from '../../config/theme';
import { useAuth } from '../../context/AuthContext';

interface DataPoint {
  label: string;
  value: number;
  displayValue: string;
}

interface Props {
  metricType: 'CALORIES' | 'DURATION' | 'WATER';
  viewMode: 'HOURLY' | 'DAILY' | 'MONTHLY';
}

const mockData: Record<Props['metricType'], Record<Props['viewMode'], DataPoint[]>> = {
  CALORIES: {
    HOURLY: [
      { label: '06AM', value: 0, displayValue: '0 kcal' },
      { label: '09AM', value: 180, displayValue: '180 kcal' },
      { label: '12PM', value: 50, displayValue: '50 kcal' },
      { label: '03PM', value: 120, displayValue: '120 kcal' },
      { label: '06PM', value: 480, displayValue: '480 kcal' },
      { label: '09PM', value: 0, displayValue: '0 kcal' },
    ],
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
    HOURLY: [
      { label: '06AM', value: 0, displayValue: '0m' },
      { label: '09AM', value: 45, displayValue: '45m' },
      { label: '12PM', value: 0, displayValue: '0m' },
      { label: '03PM', value: 15, displayValue: '15m' },
      { label: '06PM', value: 60, displayValue: '60m' },
      { label: '09PM', value: 0, displayValue: '0m' },
    ],
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
    HOURLY: [
      { label: '08AM', value: 250, displayValue: '250ml' },
      { label: '12PM', value: 1000, displayValue: '1.0L' },
      { label: '03PM', value: 500, displayValue: '500ml' },
      { label: '06PM', value: 750, displayValue: '750ml' },
      { label: '10PM', value: 500, displayValue: '500ml' },
    ],
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

const themeColors: Record<Props['metricType'], string[]> = {
  CALORIES: ['#FF1243', '#FF5722'],
  DURATION: ['#00E676', '#B3FF00'],
  WATER: ['#00B0FF', '#00E5FF'],
};

export const AppleBarChart: React.FC<Props> = ({ metricType, viewMode }) => {
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const themeColorsDynamic = isDark ? DARK_COLORS : LIGHT_COLORS;

  const data = mockData[metricType]?.[viewMode] ?? [];
  const colors = themeColors[metricType] ?? ['#FF5722', '#FF8A65'];

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Reset selected bar when filters change
  useEffect(() => {
    setSelectedIndex(null);
  }, [metricType, viewMode]);

  return (
    <View style={styles.container}>
      {/* Tooltip Header */}
      <View style={styles.tooltipContainer}>
        {selectedIndex !== null ? (
          <Animated.View entering={FadeInDown.duration(200)}>
            <Text style={[styles.tooltipLabel, { color: themeColorsDynamic.textSecondary }]}>
              Selected: <Text style={[styles.tooltipValue, { color: colors[0] }]}>{data[selectedIndex]?.displayValue}</Text>
            </Text>
          </Animated.View>
        ) : (
          <Text style={[styles.chartTip, { color: themeColorsDynamic.textMuted }]}>Tap on any bar to inspect data</Text>
        )}
      </View>

      {/* Bars Grid */}
      <View style={styles.chartArea}>
        <View style={styles.gridLinesContainer}>
          <View style={[styles.gridLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }]} />
          <View style={[styles.gridLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }]} />
          <View style={[styles.gridLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }]} />
        </View>

        <View style={styles.barsRow}>
          {data.map((point, index) => {
            const heightPercent = maxValue > 0 ? (point.value / maxValue) * 100 : 0;
            const isSelected = selectedIndex === index;

            return (
              <Pressable
                key={`${point.label}-${index}`}
                onPress={() => setSelectedIndex(index)}
                style={styles.barCol}
              >
                <View style={styles.barContainer}>
                  {point.value > 0 ? (
                    <Animated.View
                      entering={FadeInDown.delay(index * 60).duration(300)}
                      layout={Layout.springify().damping(15)}
                      style={[
                        styles.barFill,
                        { height: `${Math.max(8, heightPercent)}%` },
                        isSelected && { shadowColor: colors[0], shadowOpacity: 0.8, shadowRadius: 8 },
                      ]}
                    >
                      <LinearGradient
                        colors={colors as [string, string]}
                        style={[StyleSheet.absoluteFill, { opacity: isSelected ? 1 : 0.55 }]}
                      />
                    </Animated.View>
                  ) : (
                    <View style={[styles.emptyBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />
                  )}
                </View>
                <Text style={[
                  styles.axisLabel, 
                  { color: themeColorsDynamic.textMuted },
                  isSelected && { color: themeColorsDynamic.text, fontWeight: '700' }
                ]}>
                  {point.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: SPACING.xs,
  },
  tooltipContainer: {
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  tooltipLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  tooltipValue: {
    fontWeight: '800',
  },
  chartTip: {
    fontSize: FONT_SIZE.xs,
    fontStyle: 'italic',
  },
  chartArea: {
    height: 180,
    justifyContent: 'flex-end',
    position: 'relative',
    marginVertical: SPACING.xs,
  },
  gridLinesContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'space-between',
    paddingBottom: 22,
    zIndex: -1,
  },
  gridLine: {
    height: 1,
    width: '100%',
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: '100%',
    width: '100%',
    paddingHorizontal: SPACING.xs,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barContainer: {
    flex: 1,
    width: '50%',
    maxWidth: 16,
    justifyContent: 'flex-end',
    marginBottom: SPACING.xs,
  },
  barFill: {
    width: '100%',
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  emptyBar: {
    width: '100%',
    height: 4,
    borderRadius: RADIUS.full,
  },
  axisLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
    textAlign: 'center',
  },
});

