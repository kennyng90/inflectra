import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Dialog } from '@/components/dialog';
import { ErrorNotice } from '@/components/error-notice';
import { OpacityPressable } from '@/components/opacity-pressable';
import { TIME_RESOLUTIONS, type TimeResolution } from '@/lib/chart-origin';
import type { DrawnChartPick } from '@/lib/drawn-chart';
import {
  DRAWING_CHART_ACTION,
  DRAW_CHART_ACTION,
  PICK_TIME_RESOLUTION_TITLE,
  TIME_RESOLUTION_COPY,
} from '@/lib/drawn-chart-copy';
import {
  INSTRUMENT_LIST_LOADING,
  INSTRUMENT_LIST_RETRY,
  PICK_INSTRUMENT_DISMISS,
  PICK_INSTRUMENT_TITLE,
  STABLE_INSTRUMENT_NOTE,
} from '@/lib/instrument-copy';
import type { Instrument } from '@/lib/instruments';
import { useInstrumentList } from '@/lib/use-instrument-list';
import { useTheme } from '@/theme';

/* Tall enough to read as a list, short enough to leave the two Time resolutions
   above it and the way out below it on screen; no layout token covers a scroll
   bound. */
const LIST_MAX_HEIGHT = 240;

/* Where a first opening starts. The wider view is the one that shows a shape at
   a glance, so the close-up is the deliberate ask rather than the default. */
const OPENS_ON: TimeResolution = 'thirty_days';

type DrawnChartPickerProps = {
  /* A drawing this opened is still being made. */
  busy: boolean;
  disabled: boolean;
  onPick: (pick: DrawnChartPick) => void;
};

/* The way to ask for a drawn Chart, and the two questions it opens: how far
   back, and what of. They are one component because the list is loaded by the
   tap that opens it, and because the list is the only way to name an
   Instrument: there is nothing to type into, so nothing Inflectra cannot draw
   can be asked for.

   Only the Instrument tap draws, so the Time resolution above it can be tapped
   back and forth for nothing. It is held between openings because looking at
   the same Instrument the other way round should not mean saying so twice. */
export function DrawnChartPicker({ busy, disabled, onPick }: DrawnChartPickerProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [timeResolution, setTimeResolution] = useState<TimeResolution>(OPENS_ON);
  const { instruments, error, load } = useInstrumentList();

  const openPicker = () => {
    setOpen(true);
    load();
  };

  const pick = (instrument: Instrument) => {
    setOpen(false);
    onPick({ instrument: instrument.symbol, timeResolution });
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

      <Dialog visible={open} title={DRAW_CHART_ACTION} onRequestClose={() => setOpen(false)}>
        <SectionTitle title={PICK_TIME_RESOLUTION_TITLE} />
        <View accessibilityRole="radiogroup" style={{ gap: theme.spacing.space8 }}>
          {TIME_RESOLUTIONS.map((resolution) => (
            <TimeResolutionOption
              key={resolution}
              resolution={resolution}
              picked={resolution === timeResolution}
              onPress={() => setTimeResolution(resolution)}
            />
          ))}
        </View>

        <SectionTitle title={PICK_INSTRUMENT_TITLE} />
        <InstrumentList instruments={instruments} error={error} onPick={pick} />

        <View style={{ gap: theme.spacing.space8, paddingTop: theme.spacing.space8 }}>
          {error && <Button label={INSTRUMENT_LIST_RETRY} onPress={load} />}
          <Button
            label={PICK_INSTRUMENT_DISMISS}
            variant="secondary"
            onPress={() => setOpen(false)}
          />
        </View>
      </Dialog>
    </>
  );
}

/* Which of the dialog's two questions the rows below it answer. */
function SectionTitle({ title }: { title: string }) {
  const theme = useTheme();

  return (
    <Text
      accessibilityRole="header"
      style={{
        ...theme.text.small,
        fontWeight: theme.fontWeight.strong,
        color: theme.colors.textWeak,
        paddingTop: theme.spacing.space8,
      }}>
      {title}
    </Text>
  );
}

/* One Time resolution: what it is called, and what picking it gets you. The
   explanation is not a hint under a switch - it is the only part a first-timer
   can read, so it carries the same weight as the name. */
function TimeResolutionOption({
  resolution,
  picked,
  onPress,
}: {
  resolution: TimeResolution;
  picked: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const copy = TIME_RESOLUTION_COPY[resolution];

  return (
    <OpacityPressable
      accessibilityRole="radio"
      accessibilityLabel={copy.label}
      accessibilityHint={copy.detail}
      accessibilityState={{ selected: picked }}
      hitSlop={0}
      onPress={onPress}
      style={{
        padding: theme.spacing.space12,
        borderRadius: theme.radius.r12,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: picked ? theme.colors.strokeSelected : theme.colors.strokeWeak,
        backgroundColor: picked ? theme.colors.fillBrandWeak : theme.colors.backgroundRaised,
        gap: theme.spacing.space2,
      }}>
      <Text
        style={{
          ...theme.text.body,
          fontWeight: theme.fontWeight.strong,
          color: picked ? theme.colors.textBrand : theme.colors.textStrong,
        }}>
        {copy.label}
      </Text>
      <Text style={{ ...theme.text.tiny, color: theme.colors.textWeak }}>{copy.detail}</Text>
    </OpacityPressable>
  );
}

/* One of three: why the list isn't here, the list, or the wait for it. */
function InstrumentList({
  instruments,
  error,
  onPick,
}: {
  instruments: Instrument[] | null;
  error: string | null;
  onPick: (instrument: Instrument) => void;
}) {
  const theme = useTheme();

  if (error) return <ErrorNotice message={error} />;

  if (!instruments) {
    return (
      <ActivityIndicator
        accessibilityLabel={INSTRUMENT_LIST_LOADING}
        style={{ paddingVertical: theme.spacing.space32 }}
      />
    );
  }

  return (
    <ScrollView style={{ maxHeight: LIST_MAX_HEIGHT }}>
      {instruments.map((instrument) => (
        <InstrumentRow
          key={instrument.symbol}
          instrument={instrument}
          onPick={() => onPick(instrument)}
        />
      ))}
    </ScrollView>
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
