import { SymbolView } from 'expo-symbols';
import { Link } from 'expo-router';
import { Platform, Text } from 'react-native';

import { OpacityPressable } from '@/components/opacity-pressable';
import { useTheme } from '@/theme';

export function SettingsButton() {
  const theme = useTheme();
  const iconSize = theme.spacing.space24;

  return (
    <Link href="/settings" asChild>
      <OpacityPressable accessibilityRole="button" accessibilityLabel="Open settings">
        {Platform.OS === 'ios' ? (
          <SymbolView name="gearshape" size={iconSize} tintColor={theme.colors.iconNeutral} />
        ) : (
          <Text style={{ fontSize: iconSize, color: theme.colors.iconNeutral }}>{'⚙︎'}</Text>
        )}
      </OpacityPressable>
    </Link>
  );
}
