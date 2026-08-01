/* Tests here target logic, not components - this is one of the few exceptions,
   because two of the Market's rules are only true on the screen: the preview is
   a shape and never a number, and an Instrument whose price is meant to stay
   put says why in place of its way in. Both are facts about what a card
   renders, so only a rendered card can answer them. It asserts strings and the
   pick that comes out, never pixels. */
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { MarketRow } from '../market-row';
import type { Instrument } from '@/lib/instruments';
import { STABLE_INSTRUMENT_NOTE } from '@/lib/instrument-copy';
import type { MarketQuote } from '@/lib/market';
import { PAST_WEEK, priceInKroner, priceMove } from '@/lib/market-copy';
import { renderedTexts } from '@/test-support/rendered-text';

const instrument = (symbol: string, name: string, stable = false): Instrument => ({
  symbol,
  name,
  coinGeckoId: name.toLowerCase(),
  stable,
});

/* A week of prices that actually moves, so nothing here passes because the
   preview happened to draw nothing. */
const A_WEEK = [1_200_000, 1_180_000, 1_260_000, 1_240_000];

const quote = (one: Instrument, changePercent = 2.4): MarketQuote => ({
  instrument: one,
  price: 1_240_000,
  changePercent,
  preview: A_WEEK,
});

function mount(one: MarketQuote) {
  const picks: string[] = [];
  let renderer!: ReactTestRenderer;

  act(() => {
    renderer = create(<MarketRow quote={one} onPick={() => picks.push(one.instrument.symbol)} />);
  });

  const pressableFor = (label: string) =>
    renderer.root
      .findAll((node) => node.props.accessibilityLabel === label && !!node.props.onPress)
      .at(0);

  return { picks, pressableFor, shown: () => renderedTexts(renderer) };
}

describe('MarketRow', () => {
  it('says what it costs now and how it has moved', () => {
    const shown = mount(quote(instrument('BTC', 'Bitcoin'))).shown();

    expect(shown).toContain('Bitcoin');
    expect(shown).toContain(priceInKroner(1_240_000));
    expect(shown).toContain(PAST_WEEK);
    expect(shown).toContain(priceMove(2.4).label);
  });

  /* The preview is priced in dollars whatever we ask for (ADR 0005), so it
     carries no axis, no label, and nothing a reader could take for the kroner
     price above it. The whole card renders these strings and no others. */
  it('draws the week as a shape carrying no number of its own', () => {
    const shown = mount(quote(instrument('BTC', 'Bitcoin'))).shown();

    expect(shown).toEqual(['Bitcoin', priceInKroner(1_240_000), PAST_WEEK, priceMove(2.4).label]);
  });

  it('leads to its Chart when tapped', () => {
    const card = mount(quote(instrument('BTC', 'Bitcoin')));

    act(() => {
      card.pressableFor('Bitcoin')?.props.onPress();
    });

    expect(card.picks).toEqual(['BTC']);
  });

  /* Listed, because Firi sells it; unanalyzable, because a flat line has no
     shape to read. Hiding it would misrepresent what Firi sells. */
  it('says why a price meant to stay put cannot be analyzed, in place of its way in', () => {
    const steady = mount(quote(instrument('USDC', 'USD Coin', true), 0.01));

    expect(steady.shown()).toContain(STABLE_INSTRUMENT_NOTE);
    expect(steady.pressableFor('USD Coin')).toBeUndefined();
  });

  it('still prices a steady Instrument, since it is on the Market like the rest', () => {
    const shown = mount(quote(instrument('USDC', 'USD Coin', true), 0.01)).shown();

    expect(shown).toContain('USD Coin');
    expect(shown).toContain(priceInKroner(1_240_000));
  });
});
