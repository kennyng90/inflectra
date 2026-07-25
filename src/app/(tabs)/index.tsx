import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnalyzingProgress } from '@/components/analyzing-progress';
import { Button } from '@/components/button';
import { ChartOverlay } from '@/components/chart-overlay';
import { EmptyState } from '@/components/empty-state';
import { ErrorNotice } from '@/components/error-notice';
import { RejectionNotice } from '@/components/rejection-notice';
import { ScreenHeader } from '@/components/screen-header';
import { useAnalyzeFlow } from '@/lib/analyze-flow';
import { useTheme } from '@/theme';

const PICK_ERROR = "We couldn't open your photos. Try again.";

export default function AnalyzeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { phase, chart, rejection, error, step, stepStartedAt, pickChart, submit, cancel } =
    useAnalyzeFlow();
  const [pickError, setPickError] = useState<string | null>(null);

  const analyzing = phase === 'analyzing';
  const rejected = phase === 'rejected';
  const failed = phase === 'failed';
  const errorMessage = pickError ?? error;

  /* Two stacked buttons. The actions area keeps that height in every phase so
     the Chart preview above it never jumps when an overlay appears. */
  const buttonHeight = theme.spacing.space12 * 2 + theme.lineHeight.body;
  const actionsMinHeight = buttonHeight * 2 + theme.spacing.space12;

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
    setPickError(null);
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
              <AnalyzingProgress step={step} startedAt={stepStartedAt} />
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
          justifyContent: 'flex-end',
          ...(chart === null ? {} : { minHeight: actionsMinHeight }),
        }}>
        {analyzing ? (
          <Button label="Cancel" variant="secondary" onPress={cancel} />
        ) : (
          <>
            {errorMessage && <ErrorNotice message={errorMessage} />}

            {chart === null && <Button label="Choose a chart" onPress={pick} />}

            {chart !== null && rejected && <Button label="Pick a different chart" onPress={pick} />}

            {/* Try again re-runs on the Chart already picked, so a flaky network
                costs one tap and no re-picking. */}
            {chart !== null && !rejected && (
              <>
                <Button label={failed ? 'Try again' : 'Analyze this chart'} onPress={analyze} />
                <Button label="Pick a different chart" variant="secondary" onPress={pick} />
              </>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
