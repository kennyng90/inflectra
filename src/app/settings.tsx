import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OpacityPressable } from '@/components/opacity-pressable';
import { ScreenHeader } from '@/components/screen-header';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
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

function SignOutRow() {
  const theme = useTheme();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Guard in the root stack redirects to sign-in once the session clears. */
  const signOut = async () => {
    if (!supabase || signingOut) return;
    setSigningOut(true);
    setError(null);
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setSigningOut(false);
      setError("Couldn't sign out. Check your connection and try again.");
    }
  };

  return (
    <OpacityPressable
      accessibilityRole="button"
      accessibilityLabel="Sign out"
      accessibilityState={{ disabled: signingOut }}
      disabled={signingOut}
      hitSlop={0}
      onPress={signOut}
      style={{
        paddingHorizontal: theme.spacing.space16,
        paddingVertical: theme.spacing.space12,
        gap: theme.spacing.space4,
      }}>
      <Text style={{ ...theme.text.body, color: theme.colors.textError }}>
        {signingOut ? 'Signing out…' : 'Sign out'}
      </Text>
      {error && (
        <Text accessibilityRole="alert" style={{ ...theme.text.small, color: theme.colors.textWeak }}>
          {error}
        </Text>
      )}
    </OpacityPressable>
  );
}

function SettingsCard({ children }: { children: React.ReactNode }) {
  const theme = useTheme();

  return (
    <View
      style={{
        backgroundColor: theme.colors.backgroundAlternate,
        borderRadius: theme.radius.r12,
        overflow: 'hidden',
      }}>
      {children}
    </View>
  );
}

function Divider() {
  const theme = useTheme();
  return (
    <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.strokeWeak }} />
  );
}

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const connection = useServerConnection();
  const { session } = useAuth();

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
        <SettingsCard>
          <SettingsRow label="Signed in as" value={session?.user.email ?? 'Unknown'} />
          <Divider />
          <SignOutRow />
        </SettingsCard>

        <SettingsCard>
          <SettingsRow label="Server connection" value={connectionLabel[connection]} />
          <Divider />
          <SettingsRow label="App version" value={Constants.expoConfig?.version ?? 'Unknown'} />
        </SettingsCard>
      </View>
    </SafeAreaView>
  );
}
