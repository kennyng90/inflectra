import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { INSTRUMENT_LIST_UNAVAILABLE } from '../instrument-copy';
import type { Instrument } from '../instruments';
import { UserFacingError } from '../user-facing-error';
import { useInstrumentList, type InstrumentListState } from '../use-instrument-list';

const BITCOIN: Instrument = {
  symbol: 'BTC',
  name: 'Bitcoin',
  coinGeckoId: 'bitcoin',
  stable: false,
};
const ETHEREUM: Instrument = {
  symbol: 'ETH',
  name: 'Ethereum',
  coinGeckoId: 'ethereum',
  stable: false,
};

/* Renders the hook and hands back the last state it returned. */
function mount(fetchList: () => Promise<Instrument[]>) {
  let state: InstrumentListState | undefined;
  let renderer: ReactTestRenderer | undefined;

  function Probe() {
    state = useInstrumentList(fetchList);
    return null;
  }

  act(() => {
    renderer = create(<Probe />);
  });

  return {
    load: async () => {
      await act(async () => {
        state?.load();
      });
    },
    current: () => state as InstrumentListState,
    unmount: () => act(() => renderer?.unmount()),
  };
}

describe('useInstrumentList', () => {
  it('asks again on every asking, since what Firi sells can change', async () => {
    const fetchList = jest.fn().mockResolvedValue([BITCOIN]);
    const hook = mount(fetchList);

    await hook.load();
    await hook.load();

    expect(fetchList).toHaveBeenCalledTimes(2);
    expect(hook.current().instruments).toEqual([BITCOIN]);
  });

  it('keeps the latest list when a slower load resolves last', async () => {
    let resolveFirst!: (listed: Instrument[]) => void;
    const first = new Promise<Instrument[]>((resolve) => {
      resolveFirst = resolve;
    });
    const fetchList = jest
      .fn<Promise<Instrument[]>, []>()
      .mockReturnValueOnce(first)
      .mockResolvedValueOnce([ETHEREUM]);
    const hook = mount(fetchList);

    await hook.load();
    await hook.load();
    expect(hook.current().instruments).toEqual([ETHEREUM]);

    await act(async () => {
      resolveFirst([BITCOIN]);
      await first;
    });
    expect(hook.current().instruments).toEqual([ETHEREUM]);

    hook.unmount();
  });

  it('shows what the list said went wrong, and a fallback for anything else', async () => {
    const failing = mount(() => Promise.reject(new UserFacingError('Firi is down')));
    await failing.load();
    expect(failing.current().error).toBe('Firi is down');

    const surprising = mount(() => Promise.reject(new TypeError('undefined is not a function')));
    await surprising.load();
    expect(surprising.current().error).toBe(INSTRUMENT_LIST_UNAVAILABLE);
  });

  it('clears a failure when asked again, so the wait is shown rather than the error', async () => {
    const fetchList = jest
      .fn<Promise<Instrument[]>, []>()
      .mockRejectedValueOnce(new UserFacingError('Firi is down'))
      .mockResolvedValueOnce([BITCOIN]);
    const hook = mount(fetchList);

    await hook.load();
    expect(hook.current().error).not.toBeNull();

    await hook.load();
    expect(hook.current().error).toBeNull();
    expect(hook.current().instruments).toEqual([BITCOIN]);
  });
});
