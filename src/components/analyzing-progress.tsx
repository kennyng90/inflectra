import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { analyzingStage, STAGE_COUNT, type AnalyzeStep } from '@/lib/analyzing-copy';
import { useTheme } from '@/theme';

/* Readable line length for centered body copy, matching EmptyState. */
const BODY_MAX_WIDTH = 280;
const CARD_MAX_WIDTH = 320;
const BAR_WIDTH = 160;
const BAR_HEIGHT = 4;
const TICK = 1000;

/* The staged wait: what the app is doing right now, and how far through the
   read that leaves us. */
export function AnalyzingProgress({ step, startedAt }: { step: AnalyzeStep; startedAt: number }) {
  const theme = useTheme();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), TICK);
    return () => clearInterval(tick);
  }, []);

  const stage = analyzingStage(step, now - startedAt);

  return (
    <View
      /* Same card as a Rejection: the Chart shows through behind it, so the
         copy needs its own surface to stay readable over a dark screenshot. */
      style={{
        ...theme.elevation.md,
        alignItems: 'center',
        maxWidth: CARD_MAX_WIDTH,
        gap: theme.spacing.space8,
        padding: theme.spacing.space20,
        borderRadius: theme.radius.r12,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.colors.strokeWeak,
        backgroundColor: theme.colors.backgroundRaised,
      }}>
      <ActivityIndicator size="small" color={theme.colors.interactiveAction} />

      <Text
        accessibilityRole="alert"
        style={{
          ...theme.text.heading4,
          fontWeight: theme.fontWeight.strong,
          color: theme.colors.textStrong,
          textAlign: 'center',
        }}>
        {stage.headline}
      </Text>

      <Text
        style={{
          ...theme.text.small,
          color: theme.colors.textWeak,
          textAlign: 'center',
          maxWidth: BODY_MAX_WIDTH,
        }}>
        {stage.detail}
      </Text>

      <View
        accessibilityRole="progressbar"
        accessibilityLabel={stage.headline}
        accessibilityValue={{ min: 1, max: STAGE_COUNT, now: stage.index + 1 }}
        style={{
          flexDirection: 'row',
          gap: theme.spacing.space4,
          width: BAR_WIDTH,
          marginTop: theme.spacing.space4,
        }}>
        {Array.from({ length: STAGE_COUNT }, (_, index) => (
          <View
            key={index}
            style={{
              flex: 1,
              height: BAR_HEIGHT,
              borderRadius: theme.radius.rFull,
              backgroundColor:
                index <= stage.index ? theme.colors.interactiveAction : theme.colors.strokeWeak,
            }}
          />
        ))}
      </View>
    </View>
  );
}
