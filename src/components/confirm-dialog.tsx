import { Modal, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { ErrorNotice } from '@/components/error-notice';
import { OverlayCard } from '@/components/overlay-card';
import { useTheme } from '@/theme';

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  /* Set while the action runs, so it can't be started twice. */
  busy?: boolean;
  /* Why the action didn't go through, shown without closing the dialog. */
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

/* Asks before something destructive happens. Deliberately not a native alert:
   the same dialog then shows on every platform, including web. */
export function ConfirmDialog({
  visible,
  title,
  body,
  confirmLabel,
  busy = false,
  error = null,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const theme = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      /* Android back and the web escape key answer it the safe way. */
      onRequestClose={busy ? undefined : onCancel}>
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
          <Text style={{ ...theme.text.small, color: theme.colors.textWeak }}>{body}</Text>

          {error && <ErrorNotice message={error} />}

          <View style={{ gap: theme.spacing.space8, paddingTop: theme.spacing.space8 }}>
            <Button label={confirmLabel} variant="danger" loading={busy} onPress={onConfirm} />
            <Button label="Keep it" variant="secondary" disabled={busy} onPress={onCancel} />
          </View>
        </OverlayCard>
      </View>
    </Modal>
  );
}
