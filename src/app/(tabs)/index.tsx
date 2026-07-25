import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ChartOverlay } from '@/components/chart-overlay';
import { EmptyState } from '@/components/empty-state';
import { RejectionNotice } from '@/components/rejection-notice';
import { ScreenHeader } from '@/components/screen-header';
import { useAnalyzeFlow } from '@/lib/analyze-flow';
import { useTheme } from '@/theme';

const PICK_ERROR = "We couldn't open your photos. Try again.";

export default function AnalyzeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { phase, chart, rejection, error, pickChart, submit } = useAnalyzeFlow();
  const [pickError, setPickError] = useState<string | null>(null);

  const analyzing = phase === 'analyzing';
  const rejected = phase === 'rejected';
  const note = pickError ?? error;

  const pick = async () => {
    setPickError(null);
    try {
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
      });
      const asset = picked.canceled ? null : picked.assets[0];
      if (!asset) return;
      pickChart({ uri: asset.uri, width: asset.width, height: asset.height });
    } catch {
      setPickError(PICK_ERROR);
    }
  };

  const analyze = async () => {
    if (await submit()) router.push('/analysis');
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.colors.backgroundBase }}>
      <ScreenHeader title="Analyze" />

      {chart === null ? (
        <EmptyState
          heading="Check your first chart"
          body="Add a photo or screenshot of a trading chart. The AI reads it and explains what it sees."
        />
      ) : (
        <View
          style={{
            flex: 1,
            paddingHorizontal: theme.spacing.space20,
            paddingTop: theme.spacing.space8,
          }}>
          <Image
            accessibilityLabel="The chart you picked"
            source={{ uri: chart.uri }}
            contentFit="contain"
            style={{
              flex: 1,
              borderRadius: theme.radius.r12,
              backgroundColor: theme.colors.backgroundAlternate,
              opacity: analyzing || rejected ? 0.3 : 1,
            }}
          />
          {analyzing && (
            <ChartOverlay>
              <View style={{ alignItems: 'center', gap: theme.spacing.space12 }}>
                <ActivityIndicator size="large" color={theme.colors.interactiveAction} />
                <Text
                  accessibilityRole="alert"
                  style={{
                    ...theme.text.body,
                    fontWeight: theme.fontWeight.strong,
                    color: theme.colors.textStrong,
                    textAlign: 'center',
                  }}>
                  Reading your chart…
                </Text>
                <Text
                  style={{
                    ...theme.text.small,
                    color: theme.colors.textWeak,
                    textAlign: 'center',
                  }}>
                  This usually takes under a minute.
                </Text>
              </View>
            </ChartOverlay>
          )}
          {rejected && (
            <ChartOverlay>
              <RejectionNotice reason={rejection} />
            </ChartOverlay>
          )}
        </View>
      )}

      <View
        style={{
          padding: theme.spacing.space20,
          paddingBottom: theme.spacing.space24,
          gap: theme.spacing.space12,
        }}>
        {note && !analyzing && (
          <Text
            accessibilityRole="alert"
            style={{
              ...theme.text.small,
              color: theme.colors.textError,
              textAlign: 'center',
            }}>
            {note}
          </Text>
        )}

        {chart === null && <Button label="Choose a chart" onPress={pick} />}

        {chart !== null && rejected && <Button label="Pick a different chart" onPress={pick} />}

        {/* Kept mounted while analyzing so the preview doesn't jump; the
            overlay carries the progress, so no second spinner here. */}
        {chart !== null && !rejected && (
          <>
            <Button
              label={phase === 'failed' ? 'Try again' : 'Analyze this chart'}
              disabled={analyzing}
              onPress={analyze}
            />
            <Button
              label="Pick a different chart"
              variant="secondary"
              disabled={analyzing}
              onPress={pick}
            />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
