import Svg, { Polyline } from 'react-native-svg';

import { previewPoints } from '@/lib/market';
import { useTheme } from '@/theme';

/* The shape's own coordinate space. Its width is roughly the width a card gives
   it, so stretching one to the other barely distorts the line. */
const SHAPE_WIDTH = 320;
export const SPARKLINE_HEIGHT = 40;

/* A line, which no scale has an opinion about. */
const LINE_WIDTH = 2;

/* A week of prices as a shape and nothing else: no axis, no labels, no numbers.
   It is priced in dollars whatever currency was asked for (ADR 0005), so a
   number read off it would be a number about the wrong thing.

   One quiet colour, and never a rising green or a falling red: the move stated
   beside it is measured in kroner, and a dollar-priced shape that coloured
   itself would sooner or later contradict it. The direction is said once, by
   the row that can say it truthfully.

   Its height is the Market's one correctness rule made visible: every preview
   is scaled against a range floored at 4% of the price, so a coin that barely
   moved draws a flat line next to one that ran. `previewPoints` owns that; this
   only draws what it worked out. */
export function Sparkline({ prices }: { prices: number[] }) {
  const theme = useTheme();
  const points = previewPoints(prices, SHAPE_WIDTH, SPARKLINE_HEIGHT);

  /* A week too short to be a shape draws nothing rather than a stray dot. */
  if (points.length === 0) return null;

  return (
    <Svg
      width="100%"
      height={SPARKLINE_HEIGHT}
      viewBox={`0 0 ${SHAPE_WIDTH} ${SPARKLINE_HEIGHT}`}
      preserveAspectRatio="none">
      <Polyline
        points={points.map((point) => `${point.x},${point.y}`).join(' ')}
        fill="none"
        stroke={theme.colors.strokeStrong}
        strokeWidth={LINE_WIDTH}
        strokeLinejoin="round"
      />
    </Svg>
  );
}
