import { type ReactNode } from 'react';
import { Modal, Text, View } from 'react-native';

import { OverlayCard } from '@/components/overlay-card';
import { useTheme } from '@/theme';

type DialogProps = {
  visible: boolean;
  title: string;
  /* Android back and the web escape key. Left out while the dialog is busy, so
     they cannot answer for the user. */
  onRequestClose?: () => void;
  children: ReactNode;
};

/* The card the app stops to ask something in, centred over the dimmed screen.
   Deliberately not a native alert: the same dialog then shows on every
   platform, including web. */
export function Dialog({ visible, title, onRequestClose, children }: DialogProps) {
  const theme = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: theme.spacing.space20,
          backgroundColor: theme.colors.fillOverlay,
        }}>
        <OverlayCard accessibilityViewIsModal style={{ width: '100%' }}>
          <Text
            accessibilityRole="header"
            style={{
              ...theme.text.heading4,
              fontWeight: theme.fontWeight.strong,
              color: theme.colors.textStrong,
            }}>
            {title}
          </Text>
          {children}
        </OverlayCard>
      </View>
    </Modal>
  );
}
