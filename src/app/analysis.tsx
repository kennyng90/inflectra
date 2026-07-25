import { Redirect, useRouter } from 'expo-router';
import { Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnalysisView } from '@/components/analysis-view';
import { OpacityPressable } from '@/components/opacity-pressable';
import { ScreenHeader } from '@/components/screen-header';
import { useAnalyzeFlow } from '@/lib/analyze-flow';
import { useTheme } from '@/theme';

export default function AnalysisScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { completed } = useAnalyzeFlow();

  /* Nothing to show after a reload; History is where past Analyses live. */
  if (!completed) return <Redirect href="/" />;

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={{ flex: 1, backgroundColor: theme.colors.backgroundBase }}>
      <ScreenHeader
        title="Analysis"
        compact
        divider
        trailing={
          <OpacityPressable
            accessibilityRole="button"
            accessibilityLabel="Close analysis"
            onPress={() => router.back()}>
            <Text
              style={{
                ...theme.text.body,
                fontWeight: theme.fontWeight.strong,
                color: theme.colors.interactiveAction,
              }}>
              Done
            </Text>
          </OpacityPressable>
        }
      />
      <AnalysisView analysis={completed.analysis} chartUri={completed.chartUri} />
    </SafeAreaView>
  );
}
