import * as Linking from 'expo-linking';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OpacityPressable } from '@/components/opacity-pressable';
import { useAuth } from '@/lib/auth';
import { isValidEmail } from '@/lib/magic-link';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/theme';

/* Matches auth.email.max_frequency on the Supabase project. */
const RESEND_COOLDOWN_SECONDS = 60;

/* Readable line length for centered body copy, same as EmptyState. */
const BODY_MAX_WIDTH = 280;

/* Keeps the form phone-sized on wide (web) viewports. */
const FORM_MAX_WIDTH = 440;

function redirectUrl(): string {
  if (Platform.OS === 'web') return window.location.origin;
  return Linking.createURL('/');
}

function useResendCooldown() {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = () => {
    if (interval.current) clearInterval(interval.current);
    setSecondsLeft(RESEND_COOLDOWN_SECONDS);
    interval.current = setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1 && interval.current) clearInterval(interval.current);
        return Math.max(0, current - 1);
      });
    }, 1000);
  };

  useEffect(
    () => () => {
      if (interval.current) clearInterval(interval.current);
    },
    [],
  );

  return { secondsLeft, start };
}

export default function SignInScreen() {
  const theme = useTheme();
  const { linkError, clearLinkError } = useAuth();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const cooldown = useResendCooldown();

  const canSend = supabase !== null && isValidEmail(email) && !sending;
  const error = sendError ?? linkError;

  const sendLink = async (address: string) => {
    if (!supabase) return;
    setSending(true);
    setSendError(null);
    clearLinkError();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: address,
      options: { emailRedirectTo: redirectUrl() },
    });
    setSending(false);
    if (otpError) {
      setSendError(otpError.message);
    } else {
      setSentTo(address);
      cooldown.start();
    }
  };

  const inputStyle = {
    ...theme.text.body,
    color: theme.colors.textStrong,
    backgroundColor: theme.colors.backgroundAlternate,
    borderRadius: theme.radius.r12,
    borderWidth: 1,
    borderColor: theme.colors.strokeWeak,
    paddingHorizontal: theme.spacing.space16,
    paddingVertical: theme.spacing.space12,
  } as const;

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={{ flex: 1, backgroundColor: theme.colors.backgroundBase }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{
          flex: 1,
          justifyContent: 'center',
          alignSelf: 'center',
          width: '100%',
          maxWidth: FORM_MAX_WIDTH,
          paddingHorizontal: theme.spacing.space32,
          paddingBottom: theme.spacing.space64,
        }}>
        <View style={{ gap: theme.spacing.space8, marginBottom: theme.spacing.space32 }}>
          <Text
            accessibilityRole="header"
            style={{
              ...theme.text.heading1,
              fontWeight: theme.fontWeight.bold,
              color: theme.colors.textStrong,
              textAlign: 'center',
            }}>
            Inflectra
          </Text>
          <Text
            style={{
              ...theme.text.body,
              color: theme.colors.textWeak,
              textAlign: 'center',
              maxWidth: BODY_MAX_WIDTH,
              alignSelf: 'center',
            }}>
            {sentTo
              ? `We sent a sign-in link to ${sentTo}. Open it on this device to continue.`
              : 'Sign in with your email to analyze charts and keep your history.'}
          </Text>
        </View>

        {sentTo === null ? (
          <View style={{ gap: theme.spacing.space12 }}>
            <TextInput
              accessibilityLabel="Email address"
              style={inputStyle}
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                setSendError(null);
              }}
              placeholder="you@example.com"
              placeholderTextColor={theme.colors.textWeak}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              editable={!sending}
              onSubmitEditing={() => canSend && sendLink(email.trim())}
            />
            <OpacityPressable
              accessibilityRole="button"
              accessibilityLabel="Send sign-in link"
              accessibilityState={{ disabled: !canSend }}
              disabled={!canSend}
              onPress={() => sendLink(email.trim())}
              style={{
                backgroundColor: canSend ? theme.colors.interactiveAction : theme.colors.fillDisabled,
                borderRadius: theme.radius.r12,
                paddingVertical: theme.spacing.space12,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: theme.spacing.space8,
              }}>
              {sending && (
                <ActivityIndicator size="small" color={theme.colors.textInverseStrong} />
              )}
              <Text
                style={{
                  ...theme.text.body,
                  fontWeight: theme.fontWeight.strong,
                  color: canSend ? theme.colors.textInverseStrong : theme.colors.textWeak,
                }}>
                {sending ? 'Sending…' : 'Send sign-in link'}
              </Text>
            </OpacityPressable>
            {supabase === null && (
              <Text
                style={{ ...theme.text.small, color: theme.colors.textWeak, textAlign: 'center' }}>
                The server connection isn&apos;t set up yet. Add the Supabase keys and restart the
                app.
              </Text>
            )}
          </View>
        ) : (
          <View style={{ gap: theme.spacing.space12 }}>
            <OpacityPressable
              accessibilityRole="button"
              accessibilityLabel="Resend sign-in link"
              accessibilityState={{ disabled: cooldown.secondsLeft > 0 || sending }}
              disabled={cooldown.secondsLeft > 0 || sending}
              onPress={() => sendLink(sentTo)}
              style={{ alignItems: 'center', paddingVertical: theme.spacing.space8 }}>
              <Text
                style={{
                  ...theme.text.body,
                  fontWeight: theme.fontWeight.strong,
                  color:
                    cooldown.secondsLeft > 0 ? theme.colors.textWeak : theme.colors.interactiveAction,
                }}>
                {cooldown.secondsLeft > 0 ? `Resend link in ${cooldown.secondsLeft}s` : 'Resend link'}
              </Text>
            </OpacityPressable>
            <OpacityPressable
              accessibilityRole="button"
              accessibilityLabel="Use a different email"
              onPress={() => {
                setSentTo(null);
                setSendError(null);
                clearLinkError();
              }}
              style={{ alignItems: 'center', paddingVertical: theme.spacing.space8 }}>
              <Text style={{ ...theme.text.body, color: theme.colors.textWeak }}>
                Use a different email
              </Text>
            </OpacityPressable>
          </View>
        )}

        {error && (
          <Text
            accessibilityRole="alert"
            style={{
              ...theme.text.small,
              color: theme.colors.textError,
              textAlign: 'center',
              marginTop: theme.spacing.space16,
            }}>
            {error}
          </Text>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
