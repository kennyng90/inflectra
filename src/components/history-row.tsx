import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { TrendPill } from '@/components/pill';
import type { Direction } from '@/lib/analysis-contract';
import { directionCopy, trendCopy } from '@/lib/analysis-copy';
import { formatHistoryDate, type HistoryEntry } from '@/lib/history';
import { useTheme, type Theme } from '@/theme';

/* A chart-shaped thumbnail: wide enough to recognise the shape at a glance,
   short enough to keep rows scannable. No layout token covers this. */
export const THUMBNAIL_WIDTH = 72;
const THUMBNAIL_HEIGHT = 48;

const directionColor: Record<Direction, (theme: Theme) => string> = {
  long: (theme) => theme.colors.textSuccess,
  short: (theme) => theme.colors.textError,
  hold: (theme) => theme.colors.textWeak,
};

export function HistoryRow({ entry }: { entry: HistoryEntry }) {
  const theme = useTheme();
  const direction = directionCopy[entry.direction].headline;
  const date = formatHistoryDate(entry.createdAt);

  return (
    <View
      accessible
      accessibilityLabel={`${entry.assetGuess}. ${direction}. ${trendCopy[entry.trend].label}. ${date}.`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.space12,
        paddingHorizontal: theme.spacing.space20,
        paddingVertical: theme.spacing.space12,
      }}>
      {/* Cached by storage path: the signed URL is re-minted on every visit,
          and would otherwise re-download the Chart each time. */}
      <Image
        source={entry.thumbnailUrl ? { uri: entry.thumbnailUrl, cacheKey: entry.storagePath } : null}
        contentFit="cover"
        transition={theme.duration.fast}
        style={{
          width: THUMBNAIL_WIDTH,
          height: THUMBNAIL_HEIGHT,
          borderRadius: theme.radius.r8,
          backgroundColor: theme.colors.backgroundAlternate,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.strokeWeak,
        }}
      />

      <View style={{ flex: 1, gap: theme.spacing.space2 }}>
        <Text
          numberOfLines={1}
          style={{
            ...theme.text.body,
            fontWeight: theme.fontWeight.medium,
            color: theme.colors.textStrong,
          }}>
          {entry.assetGuess}
        </Text>
        <Text numberOfLines={1} style={{ ...theme.text.tiny, color: theme.colors.textWeak }}>
          <Text
            style={{
              fontWeight: theme.fontWeight.strong,
              color: directionColor[entry.direction](theme),
            }}>
            {direction}
          </Text>
          {`  ·  ${date}`}
        </Text>
      </View>

      <TrendPill trend={entry.trend} />
    </View>
  );
}
