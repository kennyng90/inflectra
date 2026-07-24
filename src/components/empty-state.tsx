import { Text, View } from 'react-native';

import { useTheme } from '@/theme';

/* Readable line length for centered body copy; no layout token exists for this. */
const BODY_MAX_WIDTH = 280;

export function EmptyState({ heading, body }: { heading: string; body: string }) {
  const theme = useTheme();

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: theme.spacing.space32,
        paddingBottom: theme.spacing.space64,
        gap: theme.spacing.space8,
      }}>
      <Text
        style={{
          ...theme.text.heading4,
          fontWeight: theme.fontWeight.strong,
          color: theme.colors.textStrong,
          textAlign: 'center',
        }}>
        {heading}
      </Text>
      <Text
        style={{
          ...theme.text.body,
          color: theme.colors.textWeak,
          textAlign: 'center',
          maxWidth: BODY_MAX_WIDTH,
        }}>
        {body}
      </Text>
    </View>
  );
}
