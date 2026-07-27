import { Redirect, useRouter } from 'expo-router';

import { AnalysisView } from '@/components/analysis-view';
import { ModalScreen } from '@/components/modal-screen';
import { useAnalyzeFlow } from '@/lib/analyze-flow';

export default function AnalysisScreen() {
  const router = useRouter();
  const { completed } = useAnalyzeFlow();

  /* Nothing to show after a reload; History is where past Analyses live. */
  if (!completed) return <Redirect href="/" />;

  return (
    <ModalScreen title="Analysis" onDone={() => router.back()}>
      <AnalysisView analysis={completed.analysis} chartUri={completed.chartUri} />
    </ModalScreen>
  );
}
