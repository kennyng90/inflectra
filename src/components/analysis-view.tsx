import { Image } from 'expo-image';
import { type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Accordion } from '@/components/accordion';
import { Pill, TrendPill } from '@/components/pill';
import type { Analysis } from '@/lib/analysis-contract';
import {
  DISCLAIMER,
  buildLadder,
  directionCopy,
  formatPercent,
  formatPrice,
  type LadderRung,
} from '@/lib/analysis-copy';
import { useTheme, type Theme } from '@/theme';

/* Sizes with no token behind them: a chart strip wide enough to recognise but
   short enough to keep the ladder in view, and the ladder's own dots. */
const CHART_ASPECT_RATIO = 2;
const DOT_SIZE = 10;
const DELTA_COLUMN_WIDTH = 64;
const DETAIL_LABEL_WIDTH = 104;
const TABULAR = { fontVariant: ['tabular-nums' as const] };

const rungColors: Record<LadderRung['kind'], (theme: Theme) => { dot: string; delta: string }> = {
  target: (theme) => ({ dot: theme.colors.fillSuccessStrong, delta: theme.colors.textSuccess }),
  entry: (theme) => ({ dot: theme.colors.fillBrandStrong, delta: theme.colors.textWeak }),
  stop: (theme) => ({ dot: theme.colors.fillErrorStrong, delta: theme.colors.textError }),
};

function Note({ children }: { children: string }) {
  const theme = useTheme();
  return <Text style={{ ...theme.text.tiny, color: theme.colors.textWeak }}>{children}</Text>;
}

function BodyText({ children }: { children: string }) {
  const theme = useTheme();
  return <Text style={{ ...theme.text.body, color: theme.colors.textStrong }}>{children}</Text>;
}

function ChartStrip({
  uri,
  cacheKey,
  assetGuess,
}: {
  uri: string | null;
  cacheKey?: string;
  assetGuess: string;
}) {
  const theme = useTheme();

  return (
    <View
      style={{
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.colors.strokeWeak,
      }}>
      <Image
        accessibilityLabel="The chart you analyzed"
        source={uri ? { uri, cacheKey } : null}
        contentFit="contain"
        style={{
          width: '100%',
          aspectRatio: CHART_ASPECT_RATIO,
          backgroundColor: theme.colors.backgroundAlternate,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: theme.spacing.space12,
          left: theme.spacing.space12,
        }}>
        <Pill
          fill={theme.colors.fillStrong}
          color={theme.colors.backgroundBase}
          label={assetGuess}
        />
      </View>
    </View>
  );
}

function Rung({ rung, first }: { rung: LadderRung; first: boolean }) {
  const theme = useTheme();
  const colors = rungColors[rung.kind](theme);
  const isEntry = rung.kind === 'entry';

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.space12,
        paddingVertical: theme.spacing.space12,
        borderTopWidth: first ? 0 : StyleSheet.hairlineWidth,
        borderTopColor: theme.colors.strokeWeak,
      }}>
      {/* The entry dot wears a halo; the padding keeps every label in one column. */}
      <View
        style={{
          padding: theme.spacing.space4,
          borderRadius: theme.radius.rFull,
          backgroundColor: isEntry ? theme.colors.strokeBrandWeak : undefined,
        }}>
        <View
          style={{
            width: DOT_SIZE,
            height: DOT_SIZE,
            borderRadius: theme.radius.rFull,
            backgroundColor: colors.dot,
          }}
        />
      </View>
      <View style={{ flex: 1, gap: theme.spacing.space2 }}>
        <Text
          style={{
            ...theme.text.tiny,
            fontWeight: theme.fontWeight.medium,
            color: theme.colors.textStrong,
          }}>
          {rung.label}
        </Text>
        <Text style={{ ...theme.text.tiny, color: theme.colors.textWeak }}>{rung.hint}</Text>
      </View>
      <Text
        style={{
          ...theme.text.heading4,
          ...TABULAR,
          fontWeight: theme.fontWeight.strong,
          color: theme.colors.textStrong,
        }}>
        {formatPrice(rung.price)}
      </Text>
      <Text
        style={{
          ...theme.text.tiny,
          ...TABULAR,
          color: colors.delta,
          minWidth: DELTA_COLUMN_WIDTH,
          textAlign: 'right',
        }}>
        {rung.delta ?? ''}
      </Text>
    </View>
  );
}

function ConfidenceBar({ confidence }: { confidence: number }) {
  const theme = useTheme();
  const percent = `${Math.round(confidence * 100)}%` as const;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.space12 }}>
      <Text style={{ ...theme.text.tiny, color: theme.colors.textWeak }}>How sure is the AI?</Text>
      <View
        style={{
          flex: 1,
          height: theme.spacing.space4,
          borderRadius: theme.radius.rFull,
          backgroundColor: theme.colors.fillWeak,
          overflow: 'hidden',
        }}>
        <View
          style={{
            width: percent,
            height: '100%',
            borderRadius: theme.radius.rFull,
            backgroundColor: theme.colors.fillBrandStrong,
          }}
        />
      </View>
      <Text
        style={{
          ...theme.text.tiny,
          ...TABULAR,
          fontWeight: theme.fontWeight.strong,
          color: theme.colors.textStrong,
        }}>
        {percent}
      </Text>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const theme = useTheme();

  return (
    <View style={{ flexDirection: 'row', gap: theme.spacing.space8 }}>
      <Text
        style={{ ...theme.text.tiny, color: theme.colors.textWeak, width: DETAIL_LABEL_WIDTH }}>
        {label}
      </Text>
      <Text style={{ ...theme.text.tiny, color: theme.colors.textStrong, flex: 1 }}>{value}</Text>
    </View>
  );
}

function PatternRow({ name, confidence }: { name: string; confidence: number }) {
  const theme = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: theme.spacing.space12,
      }}>
      <Text style={{ ...theme.text.tiny, color: theme.colors.textStrong, flex: 1 }}>{name}</Text>
      <Text
        style={{
          ...theme.text.tiny,
          ...TABULAR,
          fontWeight: theme.fontWeight.strong,
          color: theme.colors.textWeak,
        }}>
        {`${formatPercent(confidence)} sure`}
      </Text>
    </View>
  );
}

function priceList(levels: number[]): string {
  return levels.length === 0 ? 'None found' : levels.map(formatPrice).join(', ');
}

export function AnalysisView({
  analysis,
  chartUri,
  /* Keyed by storage path for a saved Chart, whose signed URL changes every
     time it is opened and would otherwise re-download. */
  chartCacheKey,
  /* Anything that belongs after the Analysis, inside the same scroll. */
  footer,
}: {
  analysis: Analysis;
  chartUri: string | null;
  chartCacheKey?: string;
  footer?: ReactNode;
}) {
  const theme = useTheme();
  const strategy = analysis.strategy;
  const copy = directionCopy[strategy.direction];
  const ladder = buildLadder(strategy);
  const showLadderNote = ladder.some((rung) => rung.delta !== null);

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing.space32 }}>
      <ChartStrip uri={chartUri} cacheKey={chartCacheKey} assetGuess={analysis.asset_guess} />

      <View style={{ padding: theme.spacing.space20, gap: theme.spacing.space16 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: theme.spacing.space12,
          }}>
          <View style={{ flexShrink: 1, gap: theme.spacing.space2 }}>
            <Text
              accessibilityRole="header"
              style={{
                ...theme.text.heading3,
                fontWeight: theme.fontWeight.bold,
                color: theme.colors.textStrong,
              }}>
              {copy.headline}
            </Text>
            <Text style={{ ...theme.text.tiny, color: theme.colors.textWeak }}>{copy.sub}</Text>
          </View>
          <TrendPill trend={analysis.trend} />
        </View>

        <View>
          {ladder.map((rung, index) => (
            <Rung key={`${rung.kind}-${rung.label}`} rung={rung} first={index === 0} />
          ))}
        </View>

        {showLadderNote && <Note>{copy.ladderNote}</Note>}

        <ConfidenceBar confidence={strategy.confidence} />

        <View
          style={{
            backgroundColor: theme.colors.backgroundAlternate,
            borderRadius: theme.radius.r12,
            paddingHorizontal: theme.spacing.space16,
            paddingVertical: theme.spacing.space12,
          }}>
          <Text style={{ ...theme.text.tiny, color: theme.colors.textWeak }}>
            {strategy.rationale}
          </Text>
        </View>
      </View>

      <Accordion title={`Why the AI says ${copy.verb}`} defaultOpen>
        <BodyText>{analysis.summary}</BodyText>
      </Accordion>

      <Accordion title={`Shapes in the chart (${analysis.patterns.length})`}>
        {analysis.patterns.length === 0 ? (
          <Note>The AI didn&apos;t find any known shapes in this chart.</Note>
        ) : (
          <>
            <Note>
              The AI found shapes that hint where the price may go next. The percentage shows how
              sure it is about each one.
            </Note>
            <View style={{ gap: theme.spacing.space8 }}>
              {analysis.patterns.map((pattern, index) => (
                <PatternRow
                  key={`${pattern.name}-${index}`}
                  name={pattern.name}
                  confidence={pattern.confidence}
                />
              ))}
            </View>
          </>
        )}
      </Accordion>

      <Accordion title="Key prices & market mood">
        <Note>The price tends to bounce up from the floor and stop at the ceiling.</Note>
        <View style={{ gap: theme.spacing.space8 }}>
          <DetailRow label="Price floor" value={priceList(analysis.support_levels)} />
          <DetailRow label="Price ceiling" value={priceList(analysis.resistance_levels)} />
          <DetailRow label="Price swings" value={analysis.volatility} />
          <DetailRow label="Trading activity" value={analysis.volume_read} />
          <DetailRow label="Market mood" value={analysis.sentiment} />
        </View>
      </Accordion>

      <Text
        style={{
          ...theme.text.tiny,
          color: theme.colors.textWeak,
          textAlign: 'center',
          paddingHorizontal: theme.spacing.space20,
          paddingTop: theme.spacing.space20,
        }}>
        {DISCLAIMER}
      </Text>

      {footer}
    </ScrollView>
  );
}
