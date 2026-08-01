/* Tests here target logic, not components - this is one of the few exceptions,
   because what has to hold is that both Time resolutions are offered in plain
   words, that the one showing is the one drawn at, and that a mistaken tap costs
   a single tap to undo. Only the opened dialog can say any of that. It asserts
   strings and the pick that comes out, never pixels. */
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { DrawnChartPicker } from '../drawn-chart-picker';
import type { DrawnChartPick } from '@/lib/drawn-chart';
import {
  DRAW_CHART_ACTION,
  PICK_TIME_RESOLUTION_TITLE,
  TIME_RESOLUTION_COPY,
} from '@/lib/drawn-chart-copy';
import { renderedTexts } from '@/test-support/rendered-text';

/* The Instruments on offer are Firi's answer, and this is not the test of that. */
jest.mock('@/lib/instruments', () => ({
  fetchInstruments: async () => [
    { symbol: 'BTC', name: 'Bitcoin', coinGeckoId: 'bitcoin', stable: false },
    { symbol: 'ETH', name: 'Ethereum', coinGeckoId: 'ethereum', stable: false },
  ],
}));

const CLOSE_UP = TIME_RESOLUTION_COPY.two_days;
const WIDE_VIEW = TIME_RESOLUTION_COPY.thirty_days;

/* Mounts the picker and drives it the way a thumb does: by the label. */
function mount() {
  const picks: DrawnChartPick[] = [];
  let renderer!: ReactTestRenderer;

  act(() => {
    renderer = create(
      <DrawnChartPicker busy={false} disabled={false} onPick={(pick) => picks.push(pick)} />,
    );
  });

  const press = async (label: string) => {
    const pressable = renderer.root
      .findAll((node) => node.props.accessibilityLabel === label && !!node.props.onPress)
      .at(0);
    if (!pressable) throw new Error(`Nothing to press labelled "${label}"`);
    await act(async () => {
      pressable.props.onPress();
    });
  };

  return { picks, press, shown: () => renderedTexts(renderer) };
}

async function opened() {
  const picker = mount();
  await picker.press(DRAW_CHART_ACTION);
  return picker;
}

describe('DrawnChartPicker', () => {
  it('offers both Time resolutions, each with what it gets you in plain words', async () => {
    const picker = await opened();

    const shown = picker.shown();
    expect(shown).toContain(PICK_TIME_RESOLUTION_TITLE);
    expect(shown).toContain(CLOSE_UP.label);
    expect(shown).toContain(CLOSE_UP.detail);
    expect(shown).toContain(WIDE_VIEW.label);
    expect(shown).toContain(WIDE_VIEW.detail);
  });

  /* How far back is asked first because the Instrument is the tap that draws:
     the last thing read is the thing that commits. */
  it('asks how far back above what to draw', async () => {
    const shown = (await opened()).shown();

    expect(shown.indexOf(PICK_TIME_RESOLUTION_TITLE)).toBeLessThan(shown.indexOf('Bitcoin'));
  });

  it('draws the wider view when the user only picks an Instrument', async () => {
    const picker = await opened();

    await picker.press('Bitcoin');

    expect(picker.picks).toEqual([{ instrument: 'BTC', timeResolution: 'thirty_days' }]);
  });

  it('draws at the Time resolution showing when the Instrument is picked', async () => {
    const picker = await opened();

    await picker.press(CLOSE_UP.label);
    await picker.press('Ethereum');

    expect(picker.picks).toEqual([{ instrument: 'ETH', timeResolution: 'two_days' }]);
  });

  /* Nothing is drawn until the Instrument is tapped, so a wrong Time resolution
     costs exactly the one tap that replaces it. */
  it('undoes a mistaken Time resolution in one tap, having drawn nothing yet', async () => {
    const picker = await opened();

    await picker.press(CLOSE_UP.label);
    expect(picker.picks).toEqual([]);

    await picker.press(WIDE_VIEW.label);
    await picker.press('Bitcoin');

    expect(picker.picks).toEqual([{ instrument: 'BTC', timeResolution: 'thirty_days' }]);
  });

  /* Looking at the same thing the other way round should not mean saying so
     twice: the last pick is what the next opening starts from. */
  it('opens on the Time resolution last drawn at', async () => {
    const picker = await opened();

    await picker.press(CLOSE_UP.label);
    await picker.press('Bitcoin');

    await picker.press(DRAW_CHART_ACTION);
    await picker.press('Ethereum');

    expect(picker.picks.at(-1)).toEqual({ instrument: 'ETH', timeResolution: 'two_days' });
  });
});
