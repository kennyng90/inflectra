import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { useFocusedLoad, type FocusedLoadState } from '../use-focused-load';

let mockFocusEffect: (() => void) | undefined;

jest.mock('expo-router', () => ({
  useFocusEffect: (effect: () => void) => {
    mockFocusEffect = effect;
  },
}));

describe('useFocusedLoad', () => {
  it('keeps the latest result when a slower load resolves last', async () => {
    let resolveFirst!: (value: string) => void;
    const first = new Promise<string>((resolve) => {
      resolveFirst = resolve;
    });
    const fetchValue = jest
      .fn<Promise<string>, []>()
      .mockReturnValueOnce(first)
      .mockResolvedValueOnce('fresh');
    const mapError = (error: unknown) => String(error);
    let state: FocusedLoadState<string, string> | undefined;
    let renderer: ReactTestRenderer;

    function Probe() {
      state = useFocusedLoad(fetchValue, mapError);
      return null;
    }

    await act(async () => {
      renderer = create(<Probe />);
    });

    await act(async () => {
      mockFocusEffect?.();
      mockFocusEffect?.();
      await Promise.resolve();
    });
    expect(state?.value).toBe('fresh');

    await act(async () => {
      resolveFirst('stale');
      await first;
    });
    expect(state?.value).toBe('fresh');

    act(() => renderer.unmount());
  });
});
