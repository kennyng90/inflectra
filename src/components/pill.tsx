import { Text, View } from 'react-native';

import type { Trend } from '@/lib/analysis-contract';
import { trendCopy } from '@/lib/analysis-copy';
import { useTheme, type Theme } from '@/theme';

export function Pill({ fill, color, label }: { fill: string; color: string; label: string }) {
  const theme = useTheme();

  return (
    <View
      style={{
        backgroundColor: fill,
        borderRadius: theme.radius.rFull,
        paddingHorizontal: theme.spacing.space12,
        paddingVertical: theme.spacing.space4,
      }}>
      <Text style={{ ...theme.text.tiny, fontWeight: theme.fontWeight.strong, color }}>
        {label}
      </Text>
    </View>
  );
}

const trendPillColors: Record<Trend, (theme: Theme) => { fill: string; text: string }> = {
  bullish: (theme) => ({ fill: theme.colors.fillSuccessWeak, text: theme.colors.textSuccess }),
  bearish: (theme) => ({ fill: theme.colors.fillErrorWeak, text: theme.colors.textError }),
  sideways: (theme) => ({ fill: theme.colors.fillWeak, text: theme.colors.textWeak }),
};

export function TrendPill({ trend }: { trend: Trend }) {
  const theme = useTheme();
  const colors = trendPillColors[trend](theme);

  return (
    <Pill
      fill={colors.fill}
      color={colors.text}
      label={`${trendCopy[trend].arrow} ${trendCopy[trend].label}`}
    />
  );
}
