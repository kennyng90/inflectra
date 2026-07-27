import { type ReactNode } from 'react';
import { Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OpacityPressable } from '@/components/opacity-pressable';
import { ScreenHeader } from '@/components/screen-header';
import { useTheme } from '@/theme';

/* The shell every screen the app presents as a modal shares: a compact title
   band with the one way out on the right. */
export function ModalScreen({
  title,
  onDone,
  children,
}: {
  title: string;
  onDone: () => void;
  children: ReactNode;
}) {
  const theme = useTheme();

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={{ flex: 1, backgroundColor: theme.colors.backgroundBase }}>
      <ScreenHeader
        title={title}
        compact
        divider
        trailing={
          <OpacityPressable
            accessibilityRole="button"
            accessibilityLabel={`Close ${title.toLowerCase()}`}
            onPress={onDone}>
            <Text
              style={{
                ...theme.text.body,
                fontWeight: theme.fontWeight.strong,
                color: theme.colors.interactiveAction,
              }}>
              Done
            </Text>
          </OpacityPressable>
        }
      />
      {children}
    </SafeAreaView>
  );
}
