import { SymbolView } from 'expo-symbols';
import type { SFSymbol } from 'expo-symbols';
import { ActivityIndicator, Platform, Text } from 'react-native';

import { OpacityPressable } from '@/components/opacity-pressable';
import { lightTheme as tokens, useTheme, type Theme } from '@/theme';

/* Kept in step with the padding and text style below, for layouts that need to
   hold a button's worth of height before one is rendered. */
export const BUTTON_HEIGHT = tokens.spacing.space12 * 2 + tokens.lineHeight.body;

/* `danger` is the app's one destructive look: red on a red tint, quiet enough
   that it never reads as the way forward. */
type Variant = 'primary' | 'secondary' | 'danger';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  /* SF Symbol, with a glyph standing in off iOS. Decoration only - the label
     already says what the button does, so it stays out of the a11y tree. */
  icon?: SFSymbol;
  iconFallback?: string;
  loading?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
};

const variantColors: Record<Variant, (theme: Theme) => { fill: string; label: string }> = {
  primary: (theme) => ({
    fill: theme.colors.interactiveAction,
    label: theme.colors.textInverseStrong,
  }),
  secondary: (theme) => ({ fill: theme.colors.fillWeak, label: theme.colors.textStrong }),
  danger: (theme) => ({ fill: theme.colors.fillErrorWeak, label: theme.colors.textError }),
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  iconFallback,
  loading = false,
  disabled = false,
  accessibilityLabel,
}: ButtonProps) {
  const theme = useTheme();
  const inactive = disabled || loading;
  const colors = variantColors[variant](theme);
  const iconSize = theme.spacing.space20;

  /* Only the filled button greys out; the quiet ones just lose their label. */
  const backgroundColor =
    inactive && variant === 'primary' ? theme.colors.fillDisabled : colors.fill;
  const color = inactive ? theme.colors.textWeak : colors.label;

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
      {/* The spinner takes the icon's place, so the label never shifts. */}
      {loading ? (
        <ActivityIndicator size="small" color={color} />
      ) : icon && Platform.OS === 'ios' ? (
        <SymbolView name={icon} size={iconSize} weight="semibold" tintColor={color} />
      ) : icon && iconFallback ? (
        <Text style={{ fontSize: iconSize, lineHeight: iconSize, color }}>{iconFallback}</Text>
      ) : null}
      <Text style={{ ...theme.text.body, fontWeight: theme.fontWeight.strong, color }}>
        {label}
      </Text>
    </OpacityPressable>
  );
}
