import Svg, { G, Line, Rect, Text as SvgText } from 'react-native-svg';

import type { DrawnChart } from '@/lib/drawn-chart';
import { useTheme } from '@/theme';

/* Type sizes and offsets are in the drawing's own coordinate space, which the
   Svg scales to the device - not the theme's device-pixel type scale. They fit
   the padding `drawn-chart` reserves around the plot. */
const TITLE_SIZE = 36;
const TITLE_BASELINE = 56;
const SUBTITLE_SIZE = 24;
const SUBTITLE_BASELINE = 94;
const AXIS_LABEL_SIZE = 22;
/* Price labels start just right of the plot, dropped to sit on their own line. */
const PRICE_LABEL_GAP = 12;
const PRICE_LABEL_DROP = 8;
/* Dates hang below the plot floor. */
const TIME_LABEL_DROP = 40;
const HAIRLINE = 1;
/* A wick is a fraction of its candle's width, and never thinner than a line. */
const WICK_WIDTH_RATIO = 0.16;

/* Draws what `drawn-chart` worked out. Every number here comes from the
   geometry, so this stays a pure picture of it: no fetching, no maths, nothing
   worth a test that a look at the screen would not answer better. */
export function DrawnChartCanvas({ chart, width }: { chart: DrawnChart; width: number }) {
  const theme = useTheme();
  const { plot, size } = chart;
  const height = (width * size.height) / size.width;
  const font = theme.fontFamily.sans;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${size.width} ${size.height}`}>
      <Rect width={size.width} height={size.height} fill={theme.colors.backgroundBase} />

      <SvgText
        x={plot.x}
        y={TITLE_BASELINE}
        fontFamily={font}
        fontSize={TITLE_SIZE}
        fontWeight={theme.fontWeight.strong}
        fill={theme.colors.textStrong}>
        {chart.title}
      </SvgText>
      <SvgText
        x={plot.x}
        y={SUBTITLE_BASELINE}
        fontFamily={font}
        fontSize={SUBTITLE_SIZE}
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
          <SvgText
            x={plot.x + plot.width + PRICE_LABEL_GAP}
            y={tick.y + PRICE_LABEL_DROP}
            fontFamily={font}
            fontSize={AXIS_LABEL_SIZE}
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

      {chart.timeTicks.map((tick, index) => (
        <SvgText
          key={`time-${index}`}
          x={tick.x}
          y={plot.y + plot.height + TIME_LABEL_DROP}
          textAnchor="middle"
          fontFamily={font}
          fontSize={AXIS_LABEL_SIZE}
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
