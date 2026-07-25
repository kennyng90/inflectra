import { type ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { useTheme } from '@/theme';

/* Covers the Chart preview whenever the app has something to say about it.
   Scrolls rather than clips when the message outgrows a short preview. */
export function ChartOverlay({ children }: { children: ReactNode }) {
  const theme = useTheme();

  return (
    <ScrollView
      accessibilityViewIsModal
      style={StyleSheet.absoluteFill}
      contentContainerStyle={{
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.space20,
      }}>
      {children}
    </ScrollView>
  );
}
