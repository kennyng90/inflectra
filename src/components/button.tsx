import { ActivityIndicator, Text } from 'react-native';

import { OpacityPressable } from '@/components/opacity-pressable';
import { lightTheme as tokens, useTheme } from '@/theme';

/* Kept in step with the padding and text style below, for layouts that need to
   hold a button's worth of height before one is rendered. */
export const BUTTON_HEIGHT = tokens.spacing.space12 * 2 + tokens.lineHeight.body;

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  loading?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  accessibilityLabel,
}: ButtonProps) {
  const theme = useTheme();
  const inactive = disabled || loading;
  const primary = variant === 'primary';

  const backgroundColor = primary
    ? inactive
      ? theme.colors.fillDisabled
      : theme.colors.interactiveAction
    : theme.colors.fillWeak;
  const color = inactive
    ? theme.colors.textWeak
    : primary
      ? theme.colors.textInverseStrong
      : theme.colors.textStrong;

  return (
    <OpacityPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inactive }}
      disabled={inactive}
      hitSlop={0}
      onPress={onPress}
      style={{
        backgroundColor,
        borderRadius: theme.radius.r12,
        paddingVertical: theme.spacing.space12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.space8,
      }}>
      {loading && <ActivityIndicator size="small" color={color} />}
      <Text style={{ ...theme.text.body, fontWeight: theme.fontWeight.strong, color }}>
        {label}
      </Text>
    </OpacityPressable>
  );
}
