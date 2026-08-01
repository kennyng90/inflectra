import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { HistoryRow, THUMBNAIL_WIDTH } from '@/components/history-row';
import { ScreenHeader } from '@/components/screen-header';
import { TabScreen } from '@/components/tab-screen';
import { useHistory } from '@/lib/use-history';
import { useTheme } from '@/theme';

function Separator() {
  const theme = useTheme();

  return (
    <View
      style={{
        height: StyleSheet.hairlineWidth,
        backgroundColor: theme.colors.strokeWeak,
        /* Starts where the row's text starts, iOS-list style. */
        marginLeft: theme.spacing.space20 + THUMBNAIL_WIDTH + theme.spacing.space12,
      }}
    />
  );
}

export default function HistoryScreen() {
  const theme = useTheme();
  /* The list clears the floating tab bar on its own (iOS adjusts the first
     scroll view's insets); the retry block below is a plain view and doesn't. */
  const insets = useSafeAreaInsets();
  const { entries, error, refreshing, refresh, retry } = useHistory();

  const renderBody = () => {
    if (entries === null && error === null) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={theme.colors.interactiveAction} />
        </View>
      );
    }

    if (entries === null) {
      return (
        <>
          <EmptyState heading="History didn't load" body={error ?? ''} />
          <View
            style={{
              padding: theme.spacing.space20,
              paddingBottom: insets.bottom + theme.spacing.space32,
            }}>
            <Button label="Try again" icon="arrow.clockwise" iconFallback="↻" onPress={retry} />
          </View>
        </>
      );
    }

    if (entries.length === 0) {
      return (
        <EmptyState
          heading="Nothing saved yet"
          body="Every chart you analyze is saved here, so you can come back to it later."
        />
      );
    }

    return (
      <FlatList
        data={entries}
        keyExtractor={(entry) => entry.id}
        renderItem={({ item }) => <HistoryRow entry={item} />}
        ItemSeparatorComponent={Separator}
        contentContainerStyle={{ paddingBottom: theme.spacing.space24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={theme.colors.textWeak}
          />
        }
        ListHeaderComponent={
          /* A refresh that failed on top of a list already shown. */
          error ? (
            <Text
              accessibilityRole="alert"
              style={{
                ...theme.text.tiny,
                color: theme.colors.textError,
                textAlign: 'center',
                paddingHorizontal: theme.spacing.space20,
                paddingBottom: theme.spacing.space8,
              }}>
              {error}
            </Text>
          ) : null
        }
      />
    );
  };

  return (
    <TabScreen>
      <ScreenHeader title="History" />
      {renderBody()}
    </TabScreen>
  );
}
