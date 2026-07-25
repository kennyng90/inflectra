import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

import { isRejection, type Analysis } from '@/lib/analysis-contract';
import { type AnalyzeProgress } from '@/lib/analyzing-copy';
import { useAuth } from '@/lib/auth';
import {
  analyzeChart,
  analyzeErrorMessage,
  isCanceled,
  type PickedChart,
} from '@/lib/chart-analysis';

export type AnalyzePhase = 'idle' | 'ready' | 'analyzing' | 'rejected' | 'failed';

export type CompletedAnalysis = { analysis: Analysis; chartUri: string };

type AnalyzeFlow = {
  phase: AnalyzePhase;
  chart: PickedChart | null;
  /* The AI's reason for turning the Chart down. */
  rejection: string | null;
  /* Why the analysis never finished. */
  error: string | null;
  completed: CompletedAnalysis | null;
  progress: AnalyzeProgress;
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
  const [phase, setPhase] = useState<AnalyzePhase>('idle');
  const [chart, setChart] = useState<PickedChart | null>(null);
  const [rejection, setRejection] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState<CompletedAnalysis | null>(null);
  const [progress, setProgress] = useState<AnalyzeProgress>({ step: 'preparing', startedAt: 0 });
  const runRef = useRef<AbortController | null>(null);

  const value = useMemo<AnalyzeFlow>(() => {
    const clearVerdict = () => {
      setRejection(null);
      setError(null);
    };

    const pickChart = (next: PickedChart) => {
      setChart(next);
      clearVerdict();
      setPhase('ready');
    };

    const fail = (reason: string) => {
      setPhase('failed');
      setError(reason);
      return false;
    };

    const submit = async (): Promise<boolean> => {
      if (!chart || phase === 'analyzing') return false;
      if (!userId) return fail('Sign in again to analyze this chart.');
      const run = new AbortController();
      runRef.current = run;
      setPhase('analyzing');
      clearVerdict();
      setProgress({ step: 'preparing', startedAt: Date.now() });
      try {
        const result = await analyzeChart(chart, userId, {
          signal: run.signal,
          onStep: (step) => setProgress({ step, startedAt: Date.now() }),
        });
        if (isRejection(result)) {
          setPhase('rejected');
          setRejection(result.reason);
          return false;
        }
        setCompleted({ analysis: result, chartUri: chart.uri });
        /* Back on the Analyze tab the user starts a fresh Chart, not this one. */
        setChart(null);
        setPhase('idle');
        return true;
      } catch (error) {
        /* Canceling was deliberate, so the Chart just comes back unexplained. */
        if (isCanceled(error)) {
          setPhase('ready');
          return false;
        }
        return fail(analyzeErrorMessage(error));
      } finally {
        runRef.current = null;
      }
    };

    const cancel = () => runRef.current?.abort();

    return {
      phase,
      chart,
      rejection,
      error,
      completed,
      progress,
      pickChart,
      submit,
      cancel,
    };
  }, [phase, chart, rejection, error, completed, progress, userId]);

  return <AnalyzeFlowContext.Provider value={value}>{children}</AnalyzeFlowContext.Provider>;
}

export function useAnalyzeFlow(): AnalyzeFlow {
  const flow = useContext(AnalyzeFlowContext);
  if (!flow) throw new Error('useAnalyzeFlow must be used inside AnalyzeFlowProvider');
  return flow;
}
