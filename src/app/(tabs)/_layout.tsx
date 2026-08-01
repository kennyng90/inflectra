import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { ANALYZE_TITLE } from '@/lib/analyze-copy';
import { MARKET_TITLE } from '@/lib/market-copy';
import { useTheme } from '@/theme';

export default function TabsLayout() {
  const theme = useTheme();

  return (
    <NativeTabs
      backgroundColor={theme.colors.backgroundBase}
      indicatorColor={theme.colors.fillPress}
      tintColor={theme.colors.interactiveAction}
      labelStyle={{ color: theme.colors.textWeak, selected: { color: theme.colors.interactiveAction } }}>
      {/* First, on the left: the way in for a picture of the user's own, which
          used to be a button on the Market. A tap on a price card lands here
          too, so it is a destination whichever way the Chart arrives. */}
      <NativeTabs.Trigger name="analyze">
        <NativeTabs.Trigger.Label>{ANALYZE_TITLE}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'camera', selected: 'camera.fill' }}
          md="photo_camera"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>{MARKET_TITLE}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="chart.line.uptrend.xyaxis" md="monitoring" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="history">
        <NativeTabs.Trigger.Label>History</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'clock', selected: 'clock.fill' }} md="history" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
