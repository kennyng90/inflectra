import Svg, { G, Line, Rect, Text as SvgText } from 'react-native-svg';

import type { DrawnChart } from '@/lib/drawn-chart';
import { useTheme } from '@/theme';

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

      <SvgText x={plot.x} y={56} fontFamily={font} fontSize={36} fontWeight="600" fill={theme.colors.textStrong}>
        {chart.title}
      </SvgText>
      <SvgText x={plot.x} y={94} fontFamily={font} fontSize={24} fill={theme.colors.textWeak}>
        {chart.subtitle}
      </SvgText>

      {/* Price levels first, so the candles sit on top of their own grid. */}
      <G>
        {chart.priceTicks.map((tick) => (
          <G key={`price-${tick.price}`}>
            <Line
              x1={plot.x}
              y1={tick.y}
              x2={plot.x + plot.width}
              y2={tick.y}
              stroke={theme.colors.strokeWeak}
              strokeWidth={1}
            />
            <SvgText
              x={plot.x + plot.width + 12}
              y={tick.y + 8}
              fontFamily={font}
              fontSize={22}
              fill={theme.colors.textWeak}>
              {tick.label}
            </SvgText>
          </G>
        ))}
      </G>

      {chart.candles.map((candle, index) => {
        const color = candle.rising ? theme.colors.textSuccess : theme.colors.textError;
        return (
          <G key={index}>
            <Line
              x1={candle.x}
              y1={candle.wickTop}
              x2={candle.x}
              y2={candle.wickBottom}
              stroke={color}
              strokeWidth={Math.max(candle.width * 0.16, 1)}
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

      {chart.timeTicks.map((tick) => (
        <SvgText
          key={`time-${tick.x}`}
          x={tick.x}
          y={plot.y + plot.height + 40}
          textAnchor="middle"
          fontFamily={font}
          fontSize={22}
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
        strokeWidth={1}
      />
    </Svg>
  );
}
