import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, useColorScheme } from 'react-native';

import { useInterFonts } from '@/hooks/use-inter-fonts';
import { AuthProvider, useAuth } from '@/lib/auth';
import { startServerConnectionCheck } from '@/lib/use-server-connection';
import { themeForScheme } from '@/theme';

function RootStack() {
  const { session, isReady } = useAuth();

  if (!isReady) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={session !== null}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
      </Stack.Protected>
      <Stack.Screen name="sign-in" />
    </Stack>
  );
}

export default function RootLayout() {
  const fontsReady = useInterFonts();
  useEffect(() => {
    startServerConnectionCheck();
  }, []);
  const scheme = useColorScheme();
  const theme = themeForScheme(scheme);

  useEffect(() => {
    if (Platform.OS === 'web') {
      document.body.style.backgroundColor = theme.colors.backgroundBase;
    }
  }, [theme]);
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: theme.colors.interactiveAction,
      background: theme.colors.backgroundBase,
      card: theme.colors.backgroundBase,
      text: theme.colors.textStrong,
      border: theme.colors.strokeWeak,
    },
  };

  if (!fontsReady) return null;

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style="auto" />
      <AuthProvider>
        <RootStack />
      </AuthProvider>
    </ThemeProvider>
  );
}
