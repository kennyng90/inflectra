import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { MarketRow } from '@/components/market-row';
import { ScreenHeader } from '@/components/screen-header';
import { TabScreen } from '@/components/tab-screen';
import {
  MARKET_PRICE_NOTE,
  MARKET_TITLE,
  PRICES_FAILED_TITLE,
  PRICES_LOADING,
  PRICES_RETRY,
} from '@/lib/market-copy';
import { useMarket } from '@/lib/use-market';
import { useTheme } from '@/theme';

/* The app's home screen: every Instrument, what it costs right now in kroner,
   how it has moved this week, and the week's shape. Tapping one is the ask for
   an Analysis; supplying a picture of your own is the other way in, and it sits
   in the tab bar beside this screen rather than on it. */
export default function MarketScreen() {
  const theme = useTheme();
  const router = useRouter();
  /* The list clears the floating tab bar on its own (iOS adjusts the first
     scroll view's insets); the retry block below is a plain view and doesn't. */
  const insets = useSafeAreaInsets();
  const { quotes, error, refreshing, refresh, retry } = useMarket();

  /* The tap on a card is the tap that draws, so the Instrument travels with the
     route and the Analyze screen has nothing left to ask. Navigate, not push:
     Analyze is the tab next door, not a screen stacked on this one. */
  const analyzeDrawn = (instrument: string) =>
    router.navigate({ pathname: '/analyze', params: { instrument } });

  const renderBody = () => {
    /* Nothing to show and a reason why: the whole screen is the failure. A
       failure with prices already on it is a line in the list header instead. */
    if (quotes === null && error !== null) {
      return (
        <>
          <EmptyState heading={PRICES_FAILED_TITLE} body={error} />
          <View
            style={{
              padding: theme.spacing.space20,
              paddingBottom: insets.bottom + theme.spacing.space32,
            }}>
            <Button label={PRICES_RETRY} icon="arrow.clockwise" iconFallback="↻" onPress={retry} />
          </View>
        </>
      );
    }

    if (quotes === null) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator
            accessibilityLabel={PRICES_LOADING}
            size="large"
            color={theme.colors.interactiveAction}
          />
        </View>
      );
    }

    return (
      <FlatList
        data={quotes}
        keyExtractor={(quote) => quote.instrument.symbol}
        renderItem={({ item }) => (
          <MarketRow quote={item} onPick={() => analyzeDrawn(item.instrument.symbol)} />
        )}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.space20,
          paddingBottom: theme.spacing.space24,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={theme.colors.textWeak}
          />
        }
        ListHeaderComponent={
          <View style={{ gap: theme.spacing.space8, paddingBottom: theme.spacing.space8 }}>
            {/* A refresh that failed on top of prices already shown. */}
            {error && (
              <Text
                accessibilityRole="alert"
                style={{
                  ...theme.text.tiny,
                  color: theme.colors.textError,
                  textAlign: 'center',
                }}>
                {error}
              </Text>
            )}
            {/* Directly above the first price, because it is about all of them. */}
            <Text style={{ ...theme.text.tiny, color: theme.colors.textWeak }}>
              {MARKET_PRICE_NOTE}
            </Text>
          </View>
        }
      />
    );
  };

  return (
    <TabScreen>
      <ScreenHeader title={MARKET_TITLE} />
      {renderBody()}
    </TabScreen>
  );
}
