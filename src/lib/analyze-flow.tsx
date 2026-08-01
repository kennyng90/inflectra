import { createContext, useContext, useReducer, useRef, type ReactNode } from 'react';

import { isRejection } from '@/lib/analysis-contract';
import {
  analyzeFlowReducer,
  initialAnalyzeFlowState,
  type AnalyzeFlowEvent,
  type AnalyzeFlowState,
  type CompletedAnalysis,
  type PickedChart,
} from '@/lib/analyze-flow-machine';
import { useAuth } from '@/lib/auth';
import {
  analyzeChart,
  GENERIC_ANALYZE_ERROR,
  isAnalysisCanceled,
} from '@/lib/chart-analysis';
import { userFacingMessage } from '@/lib/user-facing-error';

export type {
  AnalyzePhase,
  CompletedAnalysis,
  PickedChart,
} from '@/lib/analyze-flow-machine';

type AnalyzeFlow = {
  phase: AnalyzeFlowState['phase'];
  chart: AnalyzeFlowState['chart'];
  rejection: AnalyzeFlowState['rejection'];
  error: AnalyzeFlowState['error'];
  completed: CompletedAnalysis | null;
  progress: AnalyzeFlowState['progress'];
  pickChart: (chart: PickedChart) => void;
  /* Resolves true once a new Analysis is ready to open. */
  submit: () => Promise<boolean>;
  /* Abandons the in-flight run and hands the Chart back, ready to retry. */
  cancel: () => void;
};

const AnalyzeFlowContext = createContext<AnalyzeFlow | null>(null);

export function AnalyzeFlowProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [state, dispatch] = useReducer(analyzeFlowReducer, initialAnalyzeFlowState);
  const runRef = useRef<AbortController | null>(null);

  const pickChart = (chart: PickedChart) => dispatch({ type: 'pick', chart });

  const submit = async (): Promise<boolean> => {
    if (!state.chart || state.phase === 'analyzing' || runRef.current) return false;

    const submitEvent: AnalyzeFlowEvent = {
      type: 'submit',
      signedIn: userId !== null,
      startedAt: Date.now(),
    };
    dispatch(submitEvent);
    if (!userId) return false;

    const chart = state.chart;
    const run = new AbortController();
    runRef.current = run;
    try {
      const result = await analyzeChart(chart, userId, {
        signal: run.signal,
        onStep: (step) =>
          dispatch({ type: 'progress', progress: { step, startedAt: Date.now() } }),
      });
      if (isRejection(result)) {
        dispatch({ type: 'reject', reason: result.reason });
        return false;
      }
      dispatch({ type: 'complete', analysis: result, chart });
      return true;
    } catch (error) {
      if (isAnalysisCanceled(error)) {
        dispatch({ type: 'cancel' });
        return false;
      }
      dispatch({
        type: 'fail',
        message: userFacingMessage(error, GENERIC_ANALYZE_ERROR),
      });
      return false;
    } finally {
      if (runRef.current === run) runRef.current = null;
    }
  };

  const cancel = () => runRef.current?.abort();

  const value: AnalyzeFlow = {
    ...state,
    pickChart,
    submit,
    cancel,
  };

  return <AnalyzeFlowContext.Provider value={value}>{children}</AnalyzeFlowContext.Provider>;
}

export function useAnalyzeFlow(): AnalyzeFlow {
  const flow = useContext(AnalyzeFlowContext);
  if (!flow) throw new Error('useAnalyzeFlow must be used inside AnalyzeFlowProvider');
  return flow;
}
