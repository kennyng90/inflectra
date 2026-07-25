import { Text, View } from 'react-native';

import { useTheme } from '@/theme';

/* Something broke on the way - the network, the upload, the AI. Deliberately
   louder than a Rejection, which is the AI answering rather than failing. */
export function ErrorNotice({ message }: { message: string }) {
  const theme = useTheme();

  return (
    <View
      accessibilityRole="alert"
      style={{
        backgroundColor: theme.colors.fillErrorWeak,
        borderColor: theme.colors.strokeErrorWeak,
        borderWidth: 1,
        borderRadius: theme.radius.r12,
        padding: theme.spacing.space16,
        gap: theme.spacing.space4,
      }}>
      <Text
        style={{
          ...theme.text.small,
          fontWeight: theme.fontWeight.strong,
          color: theme.colors.textError,
        }}>
        That didn&apos;t go through
      </Text>
      <Text style={{ ...theme.text.small, color: theme.colors.textStrong }}>{message}</Text>
    </View>
  );
}
