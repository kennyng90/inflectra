import { type ReactNode } from 'react';
import { Text, View } from 'react-native';

import { SettingsButton } from '@/components/settings-button';
import { useTheme } from '@/theme';

export function ScreenHeader({
  title,
  compact = false,
  trailing = <SettingsButton />,
}: {
  title: string;
  compact?: boolean;
  trailing?: ReactNode;
}) {
  const theme = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.space20,
        paddingTop: theme.spacing.space16,
        paddingBottom: theme.spacing.space8,
      }}>
      <Text
        accessibilityRole="header"
        style={{
          ...(compact ? theme.text.heading3 : theme.text.heading2),
          fontWeight: theme.fontWeight.bold,
          color: theme.colors.textStrong,
        }}>
        {title}
      </Text>
      {trailing}
    </View>
  );
}
