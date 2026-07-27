import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { AnalysisView } from '@/components/analysis-view';
import { Button } from '@/components/button';
import { DeleteDialog } from '@/components/delete-dialog';
import { EmptyState } from '@/components/empty-state';
import { ModalScreen } from '@/components/modal-screen';
import { HISTORY_DELETE_ERROR, deleteHistoryEntry, formatHistoryDate } from '@/lib/history';
import { userFacingMessage } from '@/lib/user-facing-error';
import { useSavedAnalysis } from '@/lib/use-saved-analysis';
import { useTheme } from '@/theme';

/* One saved Analysis, opened from History: the whole ticket the AI wrote, next
   to the Chart it read - and the one place it can be deleted. */
export default function SavedAnalysisScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { saved, error, retry } = useSavedAnalysis(id);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  /* Opened straight from a link there is nothing to go back to, so Done lands
     on the list the Analysis belongs to. */
  const close = () => (router.canGoBack() ? router.back() : router.replace('/history'));

  /* History re-reads itself on focus, so leaving is all it takes for the
     deleted entry to be gone from the list. */
  const remove = async () => {
    if (!saved || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteHistoryEntry(saved.id);
      close();
    } catch (caught) {
      setDeleting(false);
      setDeleteError(userFacingMessage(caught, HISTORY_DELETE_ERROR));
    }
  };

  const closeConfirm = () => {
    setConfirming(false);
    setDeleteError(null);
  };

  const renderBody = () => {
    if (error) {
      return (
        <>
          <EmptyState heading="This analysis didn't open" body={error.message} />
          {error.retryable && (
            <View style={{ padding: theme.spacing.space20, paddingBottom: theme.spacing.space24 }}>
              <Button label="Try again" onPress={retry} />
            </View>
          )}
        </>
      );
    }

    if (!saved) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={theme.colors.interactiveAction} />
        </View>
      );
    }

    return (
      <AnalysisView
        analysis={saved.analysis}
        chartUri={saved.chartUrl}
        chartCacheKey={saved.storagePath}
        footer={
          <View
            style={{
              padding: theme.spacing.space20,
              paddingTop: theme.spacing.space24,
              gap: theme.spacing.space12,
            }}>
            <Text
              style={{ ...theme.text.tiny, color: theme.colors.textWeak, textAlign: 'center' }}>
              {`Analyzed ${formatHistoryDate(saved.createdAt)}`}
            </Text>
            <Button
              label="Delete this analysis"
              variant="danger"
              onPress={() => setConfirming(true)}
            />
          </View>
        }
      />
    );
  };

  return (
    <ModalScreen title="Analysis" onDone={close}>
      {renderBody()}

      <DeleteDialog
        visible={confirming}
        title="Delete this analysis?"
        body="The analysis and the chart it read both go for good. You can't undo this."
        busy={deleting}
        error={deleteError}
        onConfirm={() => void remove()}
        onCancel={closeConfirm}
      />
    </ModalScreen>
  );
}
