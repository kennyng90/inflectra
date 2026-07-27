import * as AppleAuthentication from 'expo-apple-authentication';
import { useState } from 'react';
import { useColorScheme, View } from 'react-native';

import { BUTTON_HEIGHT } from '@/components/button';
import {
  APPLE_SIGN_IN_FAILED,
  signInWithApple,
  useAppleSignInAvailable,
} from '@/lib/apple-auth';
import { userFacingMessage } from '@/lib/user-facing-error';
import { useTheme } from '@/theme';

type AppleSignInButtonProps = {
  /* Called before Apple's sheet opens, so the screen can clear stale errors. */
  onStart: () => void;
  onError: (message: string) => void;
};

export function AppleSignInButton({ onStart, onError }: AppleSignInButtonProps) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const available = useAppleSignInAvailable();
  const [exchanging, setExchanging] = useState(false);

  if (!available) return null;

  const signIn = async () => {
    onStart();
    setExchanging(true);
    try {
      await signInWithApple();
    } catch (error) {
      onError(userFacingMessage(error, APPLE_SIGN_IN_FAILED));
    }
    setExchanging(false);
  };

  return (
    /* Dims while the token is exchanged for a session; Apple's own button has
       no loading or disabled state. */
    <View pointerEvents={exchanging ? 'none' : 'auto'} style={{ opacity: exchanging ? 0.6 : 1 }}>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
        buttonStyle={
          scheme === 'dark'
            ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
            : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
        }
        cornerRadius={theme.radius.r12}
        style={{ height: BUTTON_HEIGHT }}
        onPress={signIn}
      />
    </View>
  );
}
