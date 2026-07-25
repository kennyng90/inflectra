import { StyleSheet, View, type ViewProps } from 'react-native';

import { useTheme } from '@/theme';

/* Readable line length for centered body copy; no layout token exists for this. */
const CARD_MAX_WIDTH = 320;

/* The surface anything inside a ChartOverlay sits on, so copy stays readable
   over the Chart showing through behind it. */
export function OverlayCard({ children, style, ...props }: ViewProps) {
  const theme = useTheme();

  return (
    <View
      {...props}
      style={[
        {
          ...theme.elevation.md,
          maxWidth: CARD_MAX_WIDTH,
          gap: theme.spacing.space8,
          padding: theme.spacing.space20,
          borderRadius: theme.radius.r12,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.strokeWeak,
          backgroundColor: theme.colors.backgroundRaised,
        },
        style,
      ]}>
      {children}
    </View>
  );
}
