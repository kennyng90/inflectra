import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty-state';
import { ScreenHeader } from '@/components/screen-header';
import { useTheme } from '@/theme';

export default function AnalyzeScreen() {
  const theme = useTheme();

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.colors.backgroundBase }}>
      <ScreenHeader title="Analyze" />
      <EmptyState
        heading="Check your first chart"
        body="Add a photo or screenshot of a trading chart. The AI reads it and explains what it sees."
      />
    </SafeAreaView>
  );
}
