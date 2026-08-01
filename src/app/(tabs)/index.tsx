import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { MarketRow } from '@/components/market-row';
import { ScreenHeader } from '@/components/screen-header';
import {
  MARKET_PRICE_NOTE,
  MARKET_TITLE,
  OWN_CHART_ACTION,
  PRICES_FAILED_TITLE,
  PRICES_LOADING,
  PRICES_RETRY,
} from '@/lib/market-copy';
import { useMarket } from '@/lib/use-market';
import { useTheme } from '@/theme';

/* The app's home screen: every Instrument, what it costs right now in kroner,
   how it has moved this week, and the week's shape. Tapping one is the ask for
   an Analysis; supplying a picture of your own is the other way in, and it is
   on this screen rather than behind it. */
export default function MarketScreen() {
  const theme = useTheme();
  const router = useRouter();
  /* The list clears the floating tab bar on its own (iOS adjusts the first
     scroll view's insets); the retry block below is a plain view and doesn't. */
  const insets = useSafeAreaInsets();
  const { quotes, error, refreshing, refresh, retry } = useMarket();

  /* The tap on a card is the tap that draws, so the Instrument travels with the
     route and the Analyze screen has nothing left to ask. */
  const analyzeDrawn = (instrument: string) =>
    router.push({ pathname: '/analyze', params: { instrument } });

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
              gap: theme.spacing.space12,
            }}>
            <Button
              label={PRICES_RETRY}
              icon="arrow.clockwise"
              iconFallback="↻"
              onPress={retry}
            />
            <OwnPictureButton />
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
            <OwnPictureButton />
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
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.colors.backgroundBase }}>
      <ScreenHeader title={MARKET_TITLE} />
      {renderBody()}
    </SafeAreaView>
  );
}

/* The other way to a Chart, offered whether or not the prices loaded: a failed
   price load must not take the camera down with it. */
function OwnPictureButton() {
  const router = useRouter();

  return (
    <Button
      label={OWN_CHART_ACTION}
      variant="secondary"
      icon="camera"
      iconFallback="📷"
      onPress={() => router.push('/analyze')}
    />
  );
}
