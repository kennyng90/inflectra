import { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SettingsButton } from '@/components/settings-button';
import { useTheme } from '@/theme';

export function ScreenHeader({
  title,
  compact = false,
  /* Set when content scrolls underneath, so the title keeps its own band. */
  divider = false,
  trailing = <SettingsButton />,
}: {
  title: string;
  compact?: boolean;
  divider?: boolean;
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
        borderBottomWidth: divider ? StyleSheet.hairlineWidth : 0,
        borderBottomColor: theme.colors.strokeWeak,
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
