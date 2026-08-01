import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, Platform, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnalyzingProgress } from '@/components/analyzing-progress';
import { Button, BUTTON_HEIGHT } from '@/components/button';
import { ChartOverlay } from '@/components/chart-overlay';
import { EmptyState } from '@/components/empty-state';
import { RejectionNotice } from '@/components/rejection-notice';
import { ScreenHeader } from '@/components/screen-header';
import { useAnalyzeFlow } from '@/lib/analyze-flow';
import { chooseChartFromLibrary, takeChartPhoto, type CaptureOutcome } from '@/lib/chart-capture';
import { useDrawnChartCapture } from '@/lib/drawn-chart-capture';
import { DRAWING_CHART_ACTION, DRAW_CHART_ACTION } from '@/lib/drawn-chart-copy';
import { useTheme } from '@/theme';

/* What a failed attempt to source a Chart left behind. */
type CaptureNote = Extract<CaptureOutcome, { message: string }>;

export default function AnalyzeScreen() {
  const theme = useTheme();
  const router = useRouter();
  /* Native tabs give each screen its own SafeAreaProvider, so this bottom inset
     already covers the floating tab bar. Only scroll views get it for free. */
  const insets = useSafeAreaInsets();
  const { phase, chart, rejection, error, progress, pickChart, submit, cancel } = useAnalyzeFlow();
  const [captureNote, setCaptureNote] = useState<CaptureNote | null>(null);
  /* The drawn Chart needs a view on screen to capture, so the source and the
     canvas it captures arrive together. */
  const { drawChart, canvas, busy: drawing } = useDrawnChartCapture();

  const analyzing = phase === 'analyzing';
  const rejected = phase === 'rejected';
  const failed = phase === 'failed';
  const cameraOff = captureNote?.status === 'blocked';
  /* One line, and the freshest thing to say wins it. Analyzing clears the
     capture note first, so a note that survives is newer than any error - which
     is what stops a stale analysis failure covering up "we couldn't reach the
     price data" when drawing the next Chart goes wrong. */
  const message = captureNote?.message ?? error;
  /* One Chart at a time: whichever way in is already busy closes all three. */
  const sourcingBlocked = analyzing || drawing;
  /* A rejected Chart can't be analyzed again, and a camera that's off can't
     take one, so whichever action can still move the user on leads. */
  const lead = chart !== null && !rejected ? 'analyze' : cameraOff ? 'library' : 'camera';
  /* The actions area holds two stacked buttons' worth of height in every phase,
     so the Chart preview above it never jumps when an overlay appears. */
  const actionsMinHeight = BUTTON_HEIGHT * 2 + theme.spacing.space12;

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
          body="Add a photo or screenshot of a trading chart, or let Inflectra draw one for you. The AI reads it and explains what it sees."
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
              <AnalyzingProgress progress={progress} />
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
          paddingBottom: insets.bottom + theme.spacing.space32,
          gap: theme.spacing.space12,
          justifyContent: 'flex-end',
          ...(chart === null ? {} : { minHeight: actionsMinHeight }),
        }}>
        {analyzing ? (
          <Button
            label="Cancel"
            variant="secondary"
            icon="xmark"
            iconFallback="✕"
            onPress={cancel}
          />
        ) : (
          <>
            {message && (
              <Text
                accessibilityRole="alert"
                style={{
                  ...theme.text.small,
                  color: theme.colors.textError,
                  textAlign: 'center',
                }}>
                {message}
              </Text>
            )}

            {/* Kept mounted while analyzing so the preview doesn't jump; the
                overlay carries the progress, so no second spinner here. */}
            {lead === 'analyze' && (
              <Button
                label={failed ? 'Try again' : 'Analyze this chart'}
                icon={failed ? 'arrow.clockwise' : 'sparkles'}
                iconFallback={failed ? '↻' : '✨'}
                disabled={analyzing}
                onPress={analyze}
              />
            )}

            <Button
              label="Take a photo"
              variant={lead === 'camera' ? 'primary' : 'secondary'}
              icon="camera"
              iconFallback="📷"
              disabled={sourcingBlocked}
              onPress={() => capture(takeChartPhoto)}
            />
            <Button
              label="Choose from photos"
              variant={lead === 'library' ? 'primary' : 'secondary'}
              icon="photo.on.rectangle"
              iconFallback="🖼"
              disabled={sourcingBlocked}
              onPress={() => capture(chooseChartFromLibrary)}
            />
            <Button
              label={drawing ? DRAWING_CHART_ACTION : DRAW_CHART_ACTION}
              variant="secondary"
              icon="chart.xyaxis.line"
              iconFallback="📈"
              disabled={sourcingBlocked}
              onPress={() => capture(drawChart)}
            />

            {/* Last in the stack: a repair step, not the way forward. */}
            {cameraOff && !analyzing && (
              <Button
                label="Open Settings"
                variant="secondary"
                icon="gearshape"
                iconFallback="⚙︎"
                onPress={openSettings}
              />
            )}
          </>
        )}
      </View>

      {canvas}
    </SafeAreaView>
  );
}
