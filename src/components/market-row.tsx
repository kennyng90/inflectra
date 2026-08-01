import { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { OpacityPressable } from '@/components/opacity-pressable';
import { Sparkline } from '@/components/sparkline';
import { STABLE_INSTRUMENT_NOTE } from '@/lib/instrument-copy';
import type { MarketQuote } from '@/lib/market';
import { PAST_WEEK, priceInKroner, priceMove, type PriceDirection } from '@/lib/market-copy';
import { useTheme, type Theme } from '@/theme';

const moveColors: Record<PriceDirection, (theme: Theme) => string> = {
  rising: (theme) => theme.colors.textSuccess,
  falling: (theme) => theme.colors.textError,
  flat: (theme) => theme.colors.textWeak,
};

/* One Instrument on the Market: what it costs now, how it has moved this week,
   and the week's shape. The price sits on its own line above the shape and the
   shape spans the whole card, so nothing the shape does can be read as the
   number of kroner beside it - there is never a number beside it.

   Tapping the card is the way to an Analysis, which is why the whole card is
   the target rather than a button on it. */
export function MarketRow({ quote, onPick }: { quote: MarketQuote; onPick: () => void }) {
  const theme = useTheme();
  const move = priceMove(quote.changePercent);

  const card = (
    <>
      <Line
        left={
          <Text
            style={{
              ...theme.text.body,
              fontWeight: theme.fontWeight.strong,
              color: quote.instrument.stable ? theme.colors.textWeak : theme.colors.textStrong,
            }}>
            {quote.instrument.name}
          </Text>
        }
        right={
          <Text
            style={{
              ...theme.text.body,
              fontWeight: theme.fontWeight.strong,
              color: theme.colors.textStrong,
            }}>
            {priceInKroner(quote.price)}
          </Text>
        }
      />

      <Sparkline prices={quote.preview} />

      <Line
        left={<Text style={{ ...theme.text.tiny, color: theme.colors.textWeak }}>{PAST_WEEK}</Text>}
        right={
          <Text
            accessibilityLabel={move.spoken}
            style={{
              ...theme.text.tiny,
              fontWeight: theme.fontWeight.strong,
              color: moveColors[move.direction](theme),
            }}>
            {move.label}
          </Text>
        }
      />
    </>
  );

  const style = {
    paddingVertical: theme.spacing.space16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.strokeWeak,
    gap: theme.spacing.space8,
  };

  /* An Instrument whose price is meant to stay put is still on the Market -
     hiding it would misrepresent what Firi sells - but it says why in place of
     its way in, rather than offering an Analysis of a flat line. */
  if (quote.instrument.stable) {
    return (
      <View style={style}>
        {card}
        <Text style={{ ...theme.text.tiny, color: theme.colors.textWeak }}>
          {STABLE_INSTRUMENT_NOTE}
        </Text>
      </View>
    );
  }

  return (
    <OpacityPressable
      accessibilityRole="button"
      accessibilityLabel={quote.instrument.name}
      hitSlop={0}
      onPress={onPick}
      style={style}>
      {card}
    </OpacityPressable>
  );
}

/* One thing named on the left, its number on the right. */
function Line({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
      {left}
      {right}
    </View>
  );
}
