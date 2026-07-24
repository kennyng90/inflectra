import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OpacityPressable } from '@/components/opacity-pressable';
import { ScreenHeader } from '@/components/screen-header';
import { useServerConnection, type ServerConnectionStatus } from '@/lib/use-server-connection';
import { useTheme } from '@/theme';

const connectionLabel: Record<ServerConnectionStatus, string> = {
  unconfigured: 'Not set up yet',
  checking: 'Checking…',
  connected: 'Connected',
  offline: "Can't reach the server",
};

function SettingsRow({ label, value }: { label: string; value: string }) {
  const theme = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.space16,
        paddingVertical: theme.spacing.space12,
        gap: theme.spacing.space16,
      }}>
      <Text style={{ ...theme.text.body, color: theme.colors.textStrong }}>{label}</Text>
      <Text style={{ ...theme.text.body, color: theme.colors.textWeak }}>{value}</Text>
    </View>
  );
}

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const connection = useServerConnection();

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={{ flex: 1, backgroundColor: theme.colors.backgroundBase }}>
      <ScreenHeader
        title="Settings"
        compact
        trailing={
          <OpacityPressable
            accessibilityRole="button"
            accessibilityLabel="Close settings"
            onPress={() => router.back()}>
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

      <View style={{ padding: theme.spacing.space20, gap: theme.spacing.space16 }}>
        <View
          style={{
            backgroundColor: theme.colors.backgroundAlternate,
            borderRadius: theme.radius.r12,
            overflow: 'hidden',
          }}>
          <SettingsRow label="Server connection" value={connectionLabel[connection]} />
          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.strokeWeak }} />
          <SettingsRow label="App version" value={Constants.expoConfig?.version ?? 'Unknown'} />
        </View>
      </View>
    </SafeAreaView>
  );
}
