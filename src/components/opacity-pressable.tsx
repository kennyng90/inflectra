import { Pressable, type PressableProps } from 'react-native';

import { useTheme } from '@/theme';

/* Pressable with the app's standard pressed-state opacity. */
export function OpacityPressable({ style, ...props }: PressableProps) {
  const theme = useTheme();

  return (
    <Pressable
      hitSlop={theme.spacing.space8}
      {...props}
      style={(state) => [
        typeof style === 'function' ? style(state) : style,
        { opacity: state.pressed ? 0.5 : 1 },
      ]}
    />
  );
}
