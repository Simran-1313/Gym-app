import React, { useMemo } from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Path, Circle, G } from 'react-native-svg';

interface Props {
  data: number[];
  color: string;
  width: number;
  height: number;
  style?: StyleProp<ViewStyle>;
  /** Draws the filled area and the marker at the latest point. */
  showMarker?: boolean;
  showFill?: boolean;
  strokeWidth?: number;
}

/**
 * Converts points to a smooth path using Catmull-Rom → cubic Bézier.
 *
 * A polyline through step/heart-rate samples looks like a seismograph; the
 * mockup's curve is deliberately soft. Catmull-Rom passes through every point
 * (unlike a plain Bézier smoothing) so the marker still lands on real data.
 */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return '';
  let d = `M${pts[0].x},${pts[0].y}`;

  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;

    // Tension 6 is the standard Catmull-Rom→Bézier control-point divisor.
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
  }
  return d;
}

export const GlowLineChart: React.FC<Props> = ({
  data,
  color,
  width,
  height,
  style,
  showMarker = true,
  showFill = true,
  strokeWidth = 2.5,
}) => {
  const { line, area, last } = useMemo(() => {
    if (data.length < 2) return { line: '', area: '', last: null };

    const min = Math.min(...data);
    const max = Math.max(...data);
    // Guard a flat series: without this the range is 0 and every point maps to NaN.
    const range = max - min || 1;
    const padY = strokeWidth + 4;

    const pts = data.map((v, i) => ({
      x: (i / (data.length - 1)) * width,
      y: padY + (1 - (v - min) / range) * (height - padY * 2),
    }));

    const linePath = smoothPath(pts);
    return {
      line: linePath,
      area: `${linePath} L${width},${height} L0,${height} Z`,
      last: pts[pts.length - 1],
    };
  }, [data, width, height, strokeWidth]);

  if (!line) return null;

  return (
    <View style={[{ width, height }, style]} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <SvgGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.26" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </SvgGradient>
        </Defs>

        {showFill && <Path d={area} fill="url(#lineFill)" />}

        {/* Two under-strokes at low opacity fake a glow. react-native-svg has no
            blur filter on Android, so a stacked stroke is the portable way. */}
        <Path d={line} stroke={color} strokeWidth={strokeWidth + 7} strokeOpacity={0.1} fill="none" strokeLinecap="round" />
        <Path d={line} stroke={color} strokeWidth={strokeWidth + 3} strokeOpacity={0.18} fill="none" strokeLinecap="round" />
        <Path d={line} stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />

        {showMarker && last && (
          <G>
            <Circle cx={last.x} cy={last.y} r={9} fill={color} opacity={0.18} />
            <Circle cx={last.x} cy={last.y} r={5} fill={color} opacity={0.45} />
            <Circle cx={last.x} cy={last.y} r={3} fill="#FFFFFF" />
          </G>
        )}
      </Svg>
    </View>
  );
};
