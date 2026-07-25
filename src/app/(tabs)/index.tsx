import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Linking, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { ScreenHeader } from '@/components/screen-header';
import { useAnalyzeFlow } from '@/lib/analyze-flow';
import { chooseChartFromLibrary, takeChartPhoto, type CaptureOutcome } from '@/lib/chart-capture';
import { useTheme } from '@/theme';

/* What a failed attempt to source a Chart left behind. */
type CaptureNote = Extract<CaptureOutcome, { message: string }>;

export default function AnalyzeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { phase, chart, message, pickChart, submit } = useAnalyzeFlow();
  const [captureNote, setCaptureNote] = useState<CaptureNote | null>(null);

  const analyzing = phase === 'analyzing';
  const cameraOff = captureNote?.status === 'blocked';
  /* A rejected Chart can't be analyzed again, and a camera that's off can't
     take one, so whichever action can still move the user on leads. */
  const lead = chart !== null && phase !== 'rejected' ? 'analyze' : cameraOff ? 'library' : 'camera';
  const note = captureNote?.message ?? message;
  const noteIsError = captureNote !== null || phase === 'failed';

  const capture = async (source: () => Promise<CaptureOutcome>) => {
    setCaptureNote(null);
    const outcome = await source();
    if (outcome.status === 'canceled') return;
    if (outcome.status === 'picked') pickChart(outcome.chart);
    else setCaptureNote(outcome);
  };

  const analyze = async () => {
    /* Whatever the analysis has to say outranks a stale capture note. */
    setCaptureNote(null);
    if (await submit()) router.push('/analysis');
  };

  const openSettings = () => {
    /* react-native-web has no openSettings, and no web pick can be blocked. */
    if (Platform.OS !== 'web') Linking.openSettings();
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
              opacity: analyzing ? 0.3 : 1,
            }}
          />
          {analyzing && (
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: theme.spacing.space12,
                  padding: theme.spacing.space20,
                },
              ]}>
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
              color: noteIsError ? theme.colors.textError : theme.colors.textStrong,
              textAlign: 'center',
            }}>
            {note}
          </Text>
        )}

        {/* Stays mounted while analyzing: the overlay carries the progress,
            so no second spinner here. */}
        {lead === 'analyze' && (
          <Button
            label={phase === 'failed' ? 'Try again' : 'Analyze this chart'}
            disabled={analyzing}
            onPress={analyze}
          />
        )}

        <Button
          label="Take a photo"
          variant={lead === 'camera' ? 'primary' : 'secondary'}
          disabled={analyzing}
          onPress={() => capture(takeChartPhoto)}
        />
        <Button
          label="Choose from photos"
          variant={lead === 'library' ? 'primary' : 'secondary'}
          disabled={analyzing}
          onPress={() => capture(chooseChartFromLibrary)}
        />

        {/* Last in the stack: a repair step, not the way forward. */}
        {cameraOff && !analyzing && (
          <Button label="Open Settings" variant="secondary" onPress={openSettings} />
        )}
      </View>
    </SafeAreaView>
  );
}
