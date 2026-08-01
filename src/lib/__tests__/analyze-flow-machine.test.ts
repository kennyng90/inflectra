import type { Analysis } from '../analysis-contract';
import { ANALYZE_SIGN_IN_ERROR } from '../analysis-copy';
import {
  analyzeFlowReducer,
  initialAnalyzeFlowState,
  type PickedChart,
} from '../analyze-flow-machine';
import { DRAWN_CHART_UNREADABLE } from '../drawn-chart-copy';

const chart: PickedChart = {
  uri: 'file:///picked.jpg',
  width: 1200,
  height: 800,
};

const drawnChart: PickedChart = {
  ...chart,
  origin: { instrument: 'BTC', time_resolution: 'two_days' },
};

const analysis: Analysis = {
  is_chart: true,
  asset_guess: 'BTC/USD 4h',
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

describe('analyzeFlowReducer', () => {
  it('picks, submits, and completes an Analysis', () => {
    const ready = analyzeFlowReducer(initialAnalyzeFlowState, { type: 'pick', chart });
    const analyzing = analyzeFlowReducer(ready, {
      type: 'submit',
      signedIn: true,
      startedAt: 100,
    });
    const completed = analyzeFlowReducer(analyzing, {
      type: 'complete',
      analysis,
      chartUri: chart.uri,
    });

    expect(ready).toMatchObject({ phase: 'ready', chart, rejection: null, error: null });
    expect(analyzing).toMatchObject({
      phase: 'analyzing',
      chart,
      progress: { step: 'preparing', startedAt: 100 },
    });
    expect(completed).toEqual({
      ...analyzing,
      phase: 'idle',
      chart: null,
      completed: { analysis, chartUri: chart.uri },
    });
  });

  it("carries a drawn Chart's origin through pick", () => {
    const ready = analyzeFlowReducer(initialAnalyzeFlowState, { type: 'pick', chart: drawnChart });

    expect(ready.chart).toEqual(drawnChart);
    /* A supplied Chart says nothing about where it came from. */
    expect(analyzeFlowReducer(ready, { type: 'pick', chart }).chart?.origin).toBeUndefined();
  });

  it('ignores submit while already analyzing', () => {
    const current = { ...initialAnalyzeFlowState, phase: 'analyzing' as const, chart };
    const analyzing = analyzeFlowReducer(
      current,
      { type: 'submit', signedIn: true, startedAt: 200 },
    );

    expect(analyzing).toBe(current);
  });

  it('lands a Rejection on a supplied Chart while keeping the Chart', () => {
    const current = { ...initialAnalyzeFlowState, phase: 'analyzing' as const, chart };

    expect(
      analyzeFlowReducer(current, {
        type: 'reject',
        reason: 'The price labels are too blurry to read.',
      }),
    ).toEqual({
      ...current,
      phase: 'rejected',
      rejection: 'The price labels are too blurry to read.',
    });
  });

  /* Nobody handed us this image, so the Rejection screen would blame the user
     for our own drawing. It is a failure we own, and the Chart stays put with
     its origin, so retrying costs one tap. */
  it('turns a Rejection on a drawn Chart into a failure we own', () => {
    const current = { ...initialAnalyzeFlowState, phase: 'analyzing' as const, chart: drawnChart };

    /* Nothing lands in `rejection`, so the Rejection screen has nothing to show
       and never appears. */
    expect(
      analyzeFlowReducer(current, {
        type: 'reject',
        reason: 'The price labels are too blurry to read.',
      }),
    ).toEqual({
      ...current,
      phase: 'failed',
      error: DRAWN_CHART_UNREADABLE,
    });
  });

  it('returns a canceled run to ready with the Chart intact', () => {
    const current = { ...initialAnalyzeFlowState, phase: 'analyzing' as const, chart };

    expect(analyzeFlowReducer(current, { type: 'cancel' })).toEqual({
      ...current,
      phase: 'ready',
    });
  });

  it("lands a failure with the server's message", () => {
    const current = { ...initialAnalyzeFlowState, phase: 'analyzing' as const, chart };
    const message = 'The chart could not be read. Pick another chart and try again.';

    expect(analyzeFlowReducer(current, { type: 'fail', message })).toEqual({
      ...current,
      phase: 'failed',
      error: message,
    });
  });

  it('fails submit with no session using the sign-in message', () => {
    const ready = { ...initialAnalyzeFlowState, phase: 'ready' as const, chart };

    expect(
      analyzeFlowReducer(ready, {
        type: 'submit',
        signedIn: false,
        startedAt: 100,
      }),
    ).toEqual({
      ...ready,
      phase: 'failed',
      error: ANALYZE_SIGN_IN_ERROR,
    });
  });

  it('ignores submit with no picked Chart', () => {
    expect(
      analyzeFlowReducer(initialAnalyzeFlowState, {
        type: 'submit',
        signedIn: false,
        startedAt: 100,
      }),
    ).toBe(initialAnalyzeFlowState);
  });

  it('records progress from an event timestamp', () => {
    const current = { ...initialAnalyzeFlowState, phase: 'analyzing' as const, chart };

    expect(
      analyzeFlowReducer(current, {
        type: 'progress',
        progress: { step: 'reading', startedAt: 300 },
      }),
    ).toEqual({
      ...current,
      progress: { step: 'reading', startedAt: 300 },
    });
  });
});
