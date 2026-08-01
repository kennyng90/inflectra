import { type ReactNode } from 'react';
import { Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

/* On web expo-router draws the tab bar as a pill fixed over the top of the
   screen (`native-tabs.module.css`: top 24, height 40) and reports no height,
   so the screens reserve it themselves. Native puts its tab bar at the bottom,
   where the OS insets the content for it. */
const WEB_TAB_BAR_CLEARANCE = Platform.OS === 'web' ? 24 + 40 : 0;

/* The frame every tab screen shares: the top inset, the background, and the
   room the tab bar needs above the header. */
export function TabScreen({ children }: { children: ReactNode }) {
  const theme = useTheme();

  return (
    <SafeAreaView
      edges={['top']}
      style={{
        flex: 1,
        backgroundColor: theme.colors.backgroundBase,
        paddingTop: WEB_TAB_BAR_CLEARANCE,
      }}>
      {children}
    </SafeAreaView>
  );
}
