import { Text } from 'react-native';

import { OverlayCard } from '@/components/overlay-card';
import { REJECTION_HEADING, REJECTION_TIP, rejectionReason } from '@/lib/rejection-copy';
import { useTheme } from '@/theme';

/* The AI's verdict in the app's voice, read as one alert rather than three lines. */
export function RejectionNotice({ reason }: { reason: string | null }) {
  const theme = useTheme();

  return (
    <OverlayCard accessible accessibilityRole="alert">
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
    </OverlayCard>
  );
}
