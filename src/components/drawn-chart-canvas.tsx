import Svg, { G, Line, Rect, Text as SvgText } from 'react-native-svg';

import type { DrawnChart } from '@/lib/drawn-chart';
import { useTheme } from '@/theme';

/* A line, which no scale has an opinion about. */
const HAIRLINE = 1;
/* A wick is a fraction of its candle's width, and never thinner than a line. */
const WICK_WIDTH_RATIO = 0.16;

/* The dates at the ends are anchored inwards, so the first and last never hang
   off the drawing. */
function timeAnchor(index: number, count: number): 'start' | 'middle' | 'end' {
  if (index === 0) return 'start';
  if (index === count - 1) return 'end';
  return 'middle';
}

/* Draws what `drawn-chart` worked out. Every number here is either geometry
   from that module or a value from the theme, so the Chart reads as part of the
   app and this stays a pure picture of the data: no fetching, no maths, nothing
   worth a test that a look at the screen would not answer better.

   The type sits in the drawing's coordinate space, which the Svg halves on the
   way to the device - a heading here is half a heading beside the Chart, which
   is the size an axis label wants. The offsets have to stay inside the padding
   `drawn-chart` reserves around the plot. */
export function DrawnChartCanvas({ chart, width }: { chart: DrawnChart; width: number }) {
  const theme = useTheme();
  const { plot, size } = chart;
  const height = (width * size.height) / size.width;
  const font = theme.fontFamily.sans;
  const axisLabelSize = theme.fontSize.tiny;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${size.width} ${size.height}`}>
      <Rect width={size.width} height={size.height} fill={theme.colors.backgroundBase} />

      <SvgText
        x={plot.x}
        y={theme.spacing.space32}
        fontFamily={font}
        fontSize={theme.fontSize.heading3}
        fontWeight={theme.fontWeight.strong}
        fill={theme.colors.textStrong}>
        {chart.title}
      </SvgText>
      <SvgText
        x={plot.x}
        y={theme.spacing.space56}
        fontFamily={font}
        fontSize={theme.fontSize.small}
        fill={theme.colors.textWeak}>
        {chart.subtitle}
      </SvgText>

      {/* Price levels first, so the candles sit on top of their own grid. A flat
          market repeats the same price on every tick, so index is the key. */}
      {chart.priceTicks.map((tick, index) => (
        <G key={`price-${index}`}>
          <Line
            x1={plot.x}
            y1={tick.y}
            x2={plot.x + plot.width}
            y2={tick.y}
            stroke={theme.colors.strokeWeak}
            strokeWidth={HAIRLINE}
          />
          {/* Just right of the plot, dropped to sit on its own line. */}
          <SvgText
            x={plot.x + plot.width + theme.spacing.space8}
            y={tick.y + theme.spacing.space4}
            fontFamily={font}
            fontSize={axisLabelSize}
            fill={theme.colors.textWeak}>
            {tick.label}
          </SvgText>
        </G>
      ))}

      {chart.candles.map((candle, index) => {
        const color = candle.rising ? theme.colors.textSuccess : theme.colors.textError;
        return (
          <G key={`candle-${index}`}>
            <Line
              x1={candle.x}
              y1={candle.wickTop}
              x2={candle.x}
              y2={candle.wickBottom}
              stroke={color}
              strokeWidth={Math.max(candle.width * WICK_WIDTH_RATIO, HAIRLINE)}
            />
            <Rect
              x={candle.x - candle.width / 2}
              y={candle.bodyTop}
              width={candle.width}
              height={candle.bodyHeight}
              fill={color}
            />
          </G>
        );
      })}

      {/* Dates hang below the plot floor. */}
      {chart.timeTicks.map((tick, index) => (
        <SvgText
          key={`time-${index}`}
          x={tick.x}
          y={plot.y + plot.height + theme.spacing.space24}
          textAnchor={timeAnchor(index, chart.timeTicks.length)}
          fontFamily={font}
          fontSize={axisLabelSize}
          fill={theme.colors.textWeak}>
          {tick.label}
        </SvgText>
      ))}

      <Rect
        x={plot.x}
        y={plot.y}
        width={plot.width}
        height={plot.height}
        fill="none"
        stroke={theme.colors.strokeWeak}
        strokeWidth={HAIRLINE}
      />
    </Svg>
  );
}
