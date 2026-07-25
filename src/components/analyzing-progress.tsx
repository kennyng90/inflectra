import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { OverlayCard } from '@/components/overlay-card';
import { analyzingStage, STAGE_COUNT, type AnalyzeProgress } from '@/lib/analyzing-copy';
import { useTheme } from '@/theme';

const BAR_WIDTH = 160;
const BAR_HEIGHT = 4;
const TICK = 1000;

/* The staged wait: what the app is doing right now, and how far through the
   read that leaves us. */
export function AnalyzingProgress({ progress }: { progress: AnalyzeProgress }) {
  const theme = useTheme();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), TICK);
    return () => clearInterval(tick);
  }, []);

  const stage = analyzingStage(progress.step, now - progress.startedAt);

  return (
    /* Polite, not an alert: the stages change mid-wait and should not
       interrupt whatever the screen reader is saying. */
    <OverlayCard accessibilityLiveRegion="polite" style={{ alignItems: 'center' }}>
      <ActivityIndicator size="small" color={theme.colors.interactiveAction} />

      <Text
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
    </OverlayCard>
  );
}
