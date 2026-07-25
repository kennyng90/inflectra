import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { isRejection, type Analysis } from '@/lib/analysis-contract';
import { useAuth } from '@/lib/auth';
import { analyzeChart, analyzeErrorMessage, type PickedChart } from '@/lib/chart-analysis';

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
  pickChart: (chart: PickedChart) => void;
  /* Resolves true once a new Analysis is ready to open. */
  submit: () => Promise<boolean>;
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
      setPhase('analyzing');
      clearVerdict();
      try {
        const result = await analyzeChart(chart, userId);
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
        return fail(analyzeErrorMessage(error));
      }
    };

    return { phase, chart, rejection, error, completed, pickChart, submit };
  }, [phase, chart, rejection, error, completed, userId]);

  return <AnalyzeFlowContext.Provider value={value}>{children}</AnalyzeFlowContext.Provider>;
}

export function useAnalyzeFlow(): AnalyzeFlow {
  const flow = useContext(AnalyzeFlowContext);
  if (!flow) throw new Error('useAnalyzeFlow must be used inside AnalyzeFlowProvider');
  return flow;
}
