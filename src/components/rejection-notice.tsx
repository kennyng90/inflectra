import { StyleSheet, Text, View } from 'react-native';

import { REJECTION_HEADING, REJECTION_TIP, rejectionReason } from '@/lib/rejection-copy';
import { useTheme } from '@/theme';

/* Readable line length for centered body copy; no layout token exists for this. */
const CARD_MAX_WIDTH = 320;

/* The AI's verdict in the app's voice, read as one alert rather than three lines. */
export function RejectionNotice({ reason }: { reason: string | null }) {
  const theme = useTheme();

  return (
    <View
      accessible
      accessibilityRole="alert"
      style={{
        ...theme.elevation.md,
        maxWidth: CARD_MAX_WIDTH,
        gap: theme.spacing.space8,
        padding: theme.spacing.space20,
        borderRadius: theme.radius.r12,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.colors.strokeWeak,
        backgroundColor: theme.colors.backgroundRaised,
      }}>
      <Text
        style={{
          ...theme.text.heading4,
          fontWeight: theme.fontWeight.strong,
          color: theme.colors.textStrong,
          textAlign: 'center',
        }}>
        {REJECTION_HEADING}
      </Text>
      <Text
        style={{
          ...theme.text.body,
          color: theme.colors.textStrong,
          textAlign: 'center',
        }}>
        {rejectionReason(reason)}
      </Text>
      <Text
        style={{
          ...theme.text.small,
          color: theme.colors.textWeak,
          textAlign: 'center',
        }}>
        {REJECTION_TIP}
      </Text>
    </View>
  );
}
