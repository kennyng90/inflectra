import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnalysisView } from '@/components/analysis-view';
import { Button } from '@/components/button';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { EmptyState } from '@/components/empty-state';
import { OpacityPressable } from '@/components/opacity-pressable';
import { ScreenHeader } from '@/components/screen-header';
import {
  HISTORY_DELETE_ERROR,
  HISTORY_ENTRY_LOAD_ERROR,
  HISTORY_ENTRY_MISSING,
  deleteHistoryEntry,
  fetchSavedAnalysis,
  formatHistoryDate,
  type SavedAnalysis,
} from '@/lib/history';
import { userFacingMessage } from '@/lib/user-facing-error';
import { useTheme } from '@/theme';

/* One saved Analysis, opened from History: the trade ticket the AI wrote, next
   to the Chart it read - and the one place it can be deleted. */
export default function SavedAnalysisScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [saved, setSaved] = useState<SavedAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setSaved(await fetchSavedAnalysis(id));
    } catch (caught) {
      setError(userFacingMessage(caught, HISTORY_ENTRY_LOAD_ERROR));
    }
  }, [id]);

  /* Re-read on focus, like the History tab: a Chart URL signed an hour ago has
     gone stale by the time the user comes back to it. */
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  /* History re-reads itself on focus, so going back is all it takes for the
     deleted entry to be gone from the list. */
  const remove = async () => {
    if (!saved || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteHistoryEntry(saved);
      close();
    } catch (caught) {
      setDeleting(false);
      setDeleteError(userFacingMessage(caught, HISTORY_DELETE_ERROR));
    }
  };

  /* Opened straight from a link there is nothing to go back to, so Done lands
     on the list the Analysis belongs to. */
  const close = () => (router.canGoBack() ? router.back() : router.replace('/history'));

  const closeConfirm = () => {
    setConfirming(false);
    setDeleteError(null);
  };

  const renderBody = () => {
    if (error) {
      /* A deleted Analysis has nothing to retry; Done in the header is the way
         out. Anything else is worth another go. */
      const gone = error === HISTORY_ENTRY_MISSING;

      return (
        <>
          <EmptyState heading={gone ? 'This analysis is gone' : "This analysis didn't open"} body={error} />
          {!gone && (
            <View style={{ padding: theme.spacing.space20, paddingBottom: theme.spacing.space24 }}>
              <Button label="Try again" onPress={() => void load()} />
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
              style={{
                ...theme.text.tiny,
                color: theme.colors.textWeak,
                textAlign: 'center',
              }}>
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
            onPress={close}>
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
      {renderBody()}

      <ConfirmDialog
        visible={confirming}
        title="Delete this analysis?"
        body="The analysis and the chart it read both go for good. You can't undo this."
        confirmLabel="Delete"
        busy={deleting}
        error={deleteError}
        onConfirm={() => void remove()}
        onCancel={closeConfirm}
      />
    </SafeAreaView>
  );
}
