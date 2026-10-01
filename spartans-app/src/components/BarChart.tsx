import React, { useState } from 'react';
import { LayoutChangeEvent, Text, View } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';
import { color, font } from '@/theme';

// Plain column chart: one bar per game, oldest on the left, season average as
// a dashed line. Kept deliberately simple, like a stat sheet graphic.
export function BarChart({
  values,
  labels,
  average,
  highlightLast,
  height = 150,
  caption,
}: {
  values: number[];
  labels: string[];
  average?: number;
  highlightLast?: boolean;
  height?: number;
  caption?: string;
}) {
  const [w, setW] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);
  const max = Math.max(4, ...values) * 1.15;
  const top = 16;
  const bottom = 20;
  const plotH = height - top - bottom;
  const gap = values.length > 14 ? 3 : 6;
  const barW = values.length ? Math.max(4, (w - gap * (values.length - 1)) / values.length) : 0;
  const y = (v: number) => top + plotH - (v / max) * plotH;

  return (
    <View onLayout={onLayout} accessible accessibilityLabel={caption ?? 'Chart'}>
      {w > 0 && (
        <Svg width={w} height={height}>
          <Line x1={0} x2={w} y1={top + plotH} y2={top + plotH} stroke={color.ink} strokeWidth={1.5} />
          {values.map((v, i) => {
            const x = i * (barW + gap);
            const last = highlightLast && i === values.length - 1;
            return (
              <React.Fragment key={i}>
                <Rect x={x} y={y(v)} width={barW} height={top + plotH - y(v)} fill={last ? color.orange : color.ink} />
                {barW >= 14 && (
                  <SvgText x={x + barW / 2} y={y(v) - 4} fontSize={11} fontFamily={font.num} fill={color.ink} textAnchor="middle">
                    {v}
                  </SvgText>
                )}
                {barW >= 14 && labels[i] ? (
                  <SvgText x={x + barW / 2} y={height - 5} fontSize={10} fontFamily={font.labelLight} fill={color.muted} textAnchor="middle">
                    {labels[i]}
                  </SvgText>
                ) : null}
              </React.Fragment>
            );
          })}
          {average != null && values.length > 1 && (
            <Line x1={0} x2={w} y1={y(average)} y2={y(average)} stroke={color.orange} strokeWidth={1.5} strokeDasharray="5,4" />
          )}
        </Svg>
      )}
      {caption ? <Text style={{ fontFamily: font.body, fontSize: 13, color: color.muted, marginTop: 6 }}>{caption}</Text> : null}
    </View>
  );
}
