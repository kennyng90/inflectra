import { NativeTabs } from 'expo-router/unstable-native-tabs';

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
