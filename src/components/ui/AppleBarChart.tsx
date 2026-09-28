import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { FONT_SIZE, FONTS, RADIUS, SPACING } from '../../config/theme';
import { useAuth } from '../../context/AuthContext';
import { useThemeColors } from '../../hooks/useThemeColors';

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

const themeColors: Record<Props['metricType'], string[]> = {
  CALORIES: ['#F0B36B', '#E08A3C'],
  DURATION: ['#5EEAD4', '#2DD4BF'],
  WATER: ['#6BB8F0', '#3B82C4'],
};

export const AppleBarChart: React.FC<Props> = ({ metricType, viewMode, customData }) => {
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const themeColorsDynamic = useThemeColors();

  const data = (customData && customData.length > 0) ? customData : (mockData[metricType]?.[viewMode] ?? []);
  const colors = themeColors[metricType] ?? ['#2DD4BF', '#14B8A6'];

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const formatY = (val: number) => {
    if (val === 0) return '0';
    if (val >= 1000) return (val / 1000).toFixed(1) + 'k';
    return val.toString();
  };

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
          {[1, 0.5, 0].map((multiplier, i) => (
            <View key={i} style={styles.gridLineRow}>
              <Text style={[styles.yAxisLabel, { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }]}>
                {formatY(Math.round(maxValue * multiplier))}
              </Text>
              <View style={[styles.gridLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }]} />
            </View>
          ))}
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
                      layout={Layout.springify().damping(15)}
                      style={[
                        styles.barFill,
                        { height: `${Math.max(8, heightPercent)}%` },
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
                  isSelected && { color: themeColorsDynamic.text, fontFamily: FONTS.bodyBold }
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
    fontFamily: FONTS.bodySemi,
  },
  tooltipValue: {
    fontFamily: FONTS.bodyExtra,
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
    paddingBottom: 22, // Space for X-axis labels
    zIndex: -1,
  },
  gridLineRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    width: '100%',
  },
  yAxisLabel: {
    fontSize: 10,
    fontFamily: FONTS.bodyMedium,
    width: 30, // Fixed width for alignment
    textAlign: 'right',
    marginRight: 6,
    marginBottom: -4, // Adjust baseline slightly
  },
  gridLine: {
    height: 1,
    flex: 1, // Take remaining width
    marginBottom: 4, // Align with text baseline
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: '100%',
    width: '100%',
    paddingHorizontal: SPACING.xs,
    paddingLeft: 36, // Push past Y-axis labels (30 width + 6 margin)
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
    fontFamily: FONTS.bodyMedium,
    marginTop: 2,
    textAlign: 'center',
  },
});

