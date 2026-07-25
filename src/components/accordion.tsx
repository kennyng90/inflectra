import { useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { OpacityPressable } from '@/components/opacity-pressable';
import { useTheme } from '@/theme';

/* Collapsible section: a full-width divider-topped row that opens its content
   underneath. Sits flush with the screen edges, so it owns its own padding. */
export function Accordion({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <View
      style={{
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: theme.colors.strokeWeak,
      }}>
      <OpacityPressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        hitSlop={0}
        onPress={() => setOpen((wasOpen) => !wasOpen)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: theme.spacing.space16,
          paddingHorizontal: theme.spacing.space20,
          paddingVertical: theme.spacing.space16,
        }}>
        <Text
          style={{
            ...theme.text.body,
            fontWeight: theme.fontWeight.strong,
            color: theme.colors.textStrong,
            flexShrink: 1,
          }}>
          {title}
        </Text>
        <Text style={{ ...theme.text.body, color: theme.colors.iconNeutral }}>
          {open ? '−' : '+'}
        </Text>
      </OpacityPressable>
      {open && (
        <View
          style={{
            paddingHorizontal: theme.spacing.space20,
            paddingBottom: theme.spacing.space20,
            gap: theme.spacing.space12,
          }}>
          {children}
        </View>
      )}
    </View>
  );
}
