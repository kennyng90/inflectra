import type { Analysis } from '@/lib/analysis-contract';
import { ANALYZE_SIGN_IN_ERROR } from '@/lib/analysis-copy';
import type { AnalyzeProgress } from '@/lib/analyzing-copy';
import type { ChartOrigin } from '@/lib/chart-origin';

export type AnalyzePhase = 'idle' | 'ready' | 'analyzing' | 'rejected' | 'failed';

export type PickedChart = {
  uri: string;
  width: number;
  height: number;
  /* Where Inflectra drew it from. Absent means the user supplied the image. */
  origin?: ChartOrigin;
};

/* The Chart is gone from the flow by the time this is read, so the Analysis
   keeps what the screen still needs: the image, and where it was drawn from. */
export type CompletedAnalysis = {
  analysis: Analysis;
  chartUri: string;
  origin?: ChartOrigin;
};

export type AnalyzeFlowState = {
  phase: AnalyzePhase;
  chart: PickedChart | null;
  rejection: string | null;
  error: string | null;
  completed: CompletedAnalysis | null;
  progress: AnalyzeProgress;
};

export type AnalyzeFlowEvent =
  | { type: 'pick'; chart: PickedChart }
  | { type: 'submit'; signedIn: boolean; startedAt: number }
  | { type: 'reject'; reason: string }
  | { type: 'cancel' }
  | { type: 'fail'; message: string }
  | { type: 'progress'; progress: AnalyzeProgress }
  | { type: 'complete'; analysis: Analysis; chart: PickedChart };

export const initialAnalyzeFlowState: AnalyzeFlowState = {
  phase: 'idle',
  chart: null,
  rejection: null,
  error: null,
  completed: null,
  progress: { step: 'preparing', startedAt: 0 },
};

export function analyzeFlowReducer(
  state: AnalyzeFlowState,
  event: AnalyzeFlowEvent,
): AnalyzeFlowState {
  switch (event.type) {
    case 'pick':
      return {
        ...state,
        phase: 'ready',
        chart: event.chart,
        rejection: null,
        error: null,
      };
    case 'submit':
      if (!state.chart || state.phase === 'analyzing') return state;
      if (!event.signedIn) {
        return {
          ...state,
          phase: 'failed',
          error: ANALYZE_SIGN_IN_ERROR,
        };
      }
      return {
        ...state,
        phase: 'analyzing',
        rejection: null,
        error: null,
        progress: { step: 'preparing', startedAt: event.startedAt },
      };
    case 'reject':
      return {
        ...state,
        phase: 'rejected',
        rejection: event.reason,
      };
    case 'cancel':
      return {
        ...state,
        phase: 'ready',
      };
    case 'fail':
      return {
        ...state,
        phase: 'failed',
        error: event.message,
      };
    case 'progress':
      return {
        ...state,
        progress: event.progress,
      };
    case 'complete':
      return {
        ...state,
        phase: 'idle',
        chart: null,
        completed: {
          analysis: event.analysis,
          chartUri: event.chart.uri,
          origin: event.chart.origin,
        },
      };
  }
}
