/* Tests here target logic, not components - this is one of the few exceptions,
   because the thing to hold is that the market-price note is shown alongside the
   disclaimer and never in place of it, which only the rendered screen can say.
   It asserts strings, never structure or pixels. */
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { AnalysisView } from '../analysis-view';
import type { Analysis } from '@/lib/analysis-contract';
import { DISCLAIMER } from '@/lib/analysis-copy';
import { MARKET_PRICE_NOTE } from '@/lib/drawn-chart-copy';
import { renderedTexts } from '@/test-support/rendered-text';

const analysis: Analysis = {
  is_chart: true,
  asset_guess: 'BTC/NOK 4h',
  summary: 'Price is climbing.',
  trend: 'bullish',
  patterns: [],
  support_levels: [1],
  resistance_levels: [2],
  volatility: 'Calm',
  volume_read: 'Steady',
  sentiment: 'Hopeful',
  strategy: {
    direction: 'long',
    entry: 1,
    stop_loss: 0.5,
    take_profit: [2],
    confidence: 0.6,
    rationale: 'It keeps bouncing off the same price.',
  },
};

/* Every string the screen renders, whatever it is nested in. */
function texts(drawn: boolean): string[] {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(
      <AnalysisView analysis={analysis} chartUri="https://signed/1" drawn={drawn} />,
    );
  });
  return renderedTexts(renderer);
}

describe('AnalysisView', () => {
  it('tells a drawn Analysis where its prices came from, disclaimer and all', () => {
    const shown = texts(true);

    expect(shown).toContain(MARKET_PRICE_NOTE);
    expect(shown).toContain(DISCLAIMER);
  });

  it('adds nothing to an Analysis of a Chart the user supplied', () => {
    const shown = texts(false);

    expect(shown).not.toContain(MARKET_PRICE_NOTE);
    expect(shown).toContain(DISCLAIMER);
  });
});
