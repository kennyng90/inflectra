import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { ErrorNotice } from '@/components/error-notice';
import { OpacityPressable } from '@/components/opacity-pressable';
import { OverlayCard } from '@/components/overlay-card';
import { DRAWING_CHART_ACTION, DRAW_CHART_ACTION } from '@/lib/drawn-chart-copy';
import {
  INSTRUMENT_LIST_LOADING,
  INSTRUMENT_LIST_UNAVAILABLE,
  PICK_INSTRUMENT_DISMISS,
  PICK_INSTRUMENT_TITLE,
  STABLE_INSTRUMENT_NOTE,
} from '@/lib/instrument-copy';
import { fetchInstruments, type Instrument } from '@/lib/instruments';
import { userFacingMessage } from '@/lib/user-facing-error';
import { useTheme } from '@/theme';

/* Tall enough to read as a list, short enough to leave the way out on screen;
   no layout token covers a scroll bound. */
const LIST_MAX_HEIGHT = 320;

type InstrumentPickerProps = {
  /* A drawing this opened is still being made. */
  busy: boolean;
  disabled: boolean;
  onPick: (instrument: Instrument) => void;
};

/* The way to ask for a drawn Chart, and the list it opens. The two are one
   component because the list is loaded by the tap that opens it, and because
   the list is the only way to name an Instrument: there is nothing to type
   into, so nothing Inflectra cannot draw can be asked for. */
export function InstrumentPicker({ busy, disabled, onPick }: InstrumentPickerProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [instruments, setInstruments] = useState<Instrument[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loadGeneration = useRef(0);

  const load = useCallback(async () => {
    const generation = ++loadGeneration.current;
    setError(null);
    setInstruments(null);
    try {
      const listed = await fetchInstruments();
      /* A load left behind by an earlier opening must not stomp this one. */
      if (generation === loadGeneration.current) setInstruments(listed);
    } catch (caught) {
      if (generation === loadGeneration.current) {
        setError(userFacingMessage(caught, INSTRUMENT_LIST_UNAVAILABLE));
      }
    }
  }, []);

  /* Loaded on every opening rather than once: what Firi sells can change while
     the app is running. */
  const openPicker = () => {
    setOpen(true);
    void load();
  };

  const pick = (instrument: Instrument) => {
    setOpen(false);
    onPick(instrument);
  };

  return (
    <>
      <Button
        label={busy ? DRAWING_CHART_ACTION : DRAW_CHART_ACTION}
        variant="secondary"
        icon="chart.xyaxis.line"
        iconFallback="📈"
        disabled={disabled}
        onPress={openPicker}
      />

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
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
              {PICK_INSTRUMENT_TITLE}
            </Text>

            {error ? (
              <ErrorNotice message={error} />
            ) : instruments ? (
              <ScrollView style={{ maxHeight: LIST_MAX_HEIGHT }}>
                {instruments.map((instrument) => (
                  <InstrumentRow
                    key={instrument.symbol}
                    instrument={instrument}
                    onPick={() => pick(instrument)}
                  />
                ))}
              </ScrollView>
            ) : (
              <ActivityIndicator
                accessibilityLabel={INSTRUMENT_LIST_LOADING}
                style={{ paddingVertical: theme.spacing.space32 }}
              />
            )}

            <View style={{ gap: theme.spacing.space8, paddingTop: theme.spacing.space8 }}>
              {error && <Button label="Try again" onPress={load} />}
              <Button
                label={PICK_INSTRUMENT_DISMISS}
                variant="secondary"
                onPress={() => setOpen(false)}
              />
            </View>
          </OverlayCard>
        </View>
      </Modal>
    </>
  );
}

function InstrumentRow({ instrument, onPick }: { instrument: Instrument; onPick: () => void }) {
  const theme = useTheme();
  const style = {
    paddingVertical: theme.spacing.space12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.strokeWeak,
    gap: theme.spacing.space2,
  };
  const name = (
    <Text
      style={{
        ...theme.text.body,
        fontWeight: theme.fontWeight.strong,
        color: instrument.stable ? theme.colors.textWeak : theme.colors.textStrong,
      }}>
      {instrument.name}
    </Text>
  );

  /* An Instrument whose price is meant to stay put is still listed - hiding it
     would misrepresent what Firi sells - but it says why in place of its way
     in, rather than offering an Analysis of a flat line. */
  if (instrument.stable) {
    return (
      <View style={style}>
        {name}
        <Text style={{ ...theme.text.tiny, color: theme.colors.textWeak }}>
          {STABLE_INSTRUMENT_NOTE}
        </Text>
      </View>
    );
  }

  return (
    <OpacityPressable
      accessibilityRole="button"
      accessibilityLabel={instrument.name}
      hitSlop={0}
      onPress={onPick}
      style={style}>
      {name}
    </OpacityPressable>
  );
}
