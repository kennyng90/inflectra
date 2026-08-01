import { Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Dialog } from '@/components/dialog';
import { ErrorNotice } from '@/components/error-notice';
import { useTheme } from '@/theme';

type DeleteDialogProps = {
  visible: boolean;
  title: string;
  body: string;
  busy?: boolean;
  /* Why the delete didn't go through, shown without closing the dialog. */
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

/* Asks before something is deleted for good. */
export function DeleteDialog({
  visible,
  title,
  body,
  busy = false,
  error = null,
  onConfirm,
  onCancel,
}: DeleteDialogProps) {
  const theme = useTheme();

  return (
    /* A delete in flight can't be called off, so the ways out are the buttons. */
    <Dialog visible={visible} title={title} onRequestClose={busy ? undefined : onCancel}>
      <Text style={{ ...theme.text.small, color: theme.colors.textWeak }}>{body}</Text>

      {error && <ErrorNotice message={error} />}

      <View style={{ gap: theme.spacing.space8, paddingTop: theme.spacing.space8 }}>
        <Button label="Delete" variant="danger" loading={busy} onPress={onConfirm} />
        <Button label="Keep it" variant="secondary" disabled={busy} onPress={onCancel} />
      </View>
    </Dialog>
  );
}
