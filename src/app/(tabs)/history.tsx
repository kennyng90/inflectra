import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty-state';
import { ScreenHeader } from '@/components/screen-header';
import { useTheme } from '@/theme';

export default function HistoryScreen() {
  const theme = useTheme();

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.colors.backgroundBase }}>
      <ScreenHeader title="History" />
      <EmptyState
        heading="Nothing saved yet"
        body="Every chart you analyze is saved here, so you can come back to it later."
      />
    </SafeAreaView>
  );
}
