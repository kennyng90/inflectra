import { Image } from 'expo-image';
import { ScrollView, Text, View } from 'react-native';

import type { Analysis, Trend } from '@/lib/analysis-contract';
import {
  DISCLAIMER,
  directionCopy,
  formatPercent,
  formatPrice,
  trendCopy,
} from '@/lib/analysis-copy';
import { useTheme, type Theme } from '@/theme';

const CHART_ASPECT_RATIO = 16 / 9;

const trendPillColors: Record<Trend, (theme: Theme) => { fill: string; text: string }> = {
  bullish: (theme) => ({ fill: theme.colors.fillSuccessWeak, text: theme.colors.textSuccess }),
  bearish: (theme) => ({ fill: theme.colors.fillErrorWeak, text: theme.colors.textError }),
  sideways: (theme) => ({ fill: theme.colors.fillWeak, text: theme.colors.textWeak }),
};

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.spacing.space8 }}>
      <Text
        accessibilityRole="header"
        style={{
          ...theme.text.tiny,
          fontWeight: theme.fontWeight.strong,
          color: theme.colors.textWeak,
          textTransform: 'uppercase',
        }}>
        {heading}
      </Text>
      {children}
    </View>
  );
}

function Body({ children }: { children: string }) {
  const theme = useTheme();
  return <Text style={{ ...theme.text.body, color: theme.colors.textStrong }}>{children}</Text>;
}

/* Label left, short value pinned right. Labels wrap, values never do. */
function ValueRow({ label, hint, value }: { label: string; hint?: string; value: string }) {
  const theme = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: theme.spacing.space16,
      }}>
      <View style={{ flexShrink: 1, gap: theme.spacing.space2 }}>
        <Text style={{ ...theme.text.body, color: theme.colors.textStrong }}>{label}</Text>
        {hint && <Text style={{ ...theme.text.tiny, color: theme.colors.textWeak }}>{hint}</Text>}
      </View>
      <Text
        style={{
          ...theme.text.body,
          fontWeight: theme.fontWeight.strong,
          color: theme.colors.textStrong,
        }}>
        {value}
      </Text>
    </View>
  );
}

/* Prose values need the width, so these read as two columns instead. */
function DetailRow({ label, value }: { label: string; value: string }) {
  const theme = useTheme();

  return (
    <View style={{ flexDirection: 'row', gap: theme.spacing.space16 }}>
      <Text style={{ ...theme.text.body, color: theme.colors.textWeak, flex: 1 }}>{label}</Text>
      <Text style={{ ...theme.text.body, color: theme.colors.textStrong, flex: 2 }}>{value}</Text>
    </View>
  );
}

export function AnalysisView({ analysis, chartUri }: { analysis: Analysis; chartUri: string }) {
  const theme = useTheme();
  const strategy = analysis.strategy;
  const copy = directionCopy[strategy.direction];
  const trend = trendPillColors[analysis.trend](theme);

  return (
    <ScrollView
      contentContainerStyle={{
        padding: theme.spacing.space20,
        paddingBottom: theme.spacing.space48,
        gap: theme.spacing.space24,
      }}>
      <Image
        accessibilityLabel="The chart you analyzed"
        source={{ uri: chartUri }}
        contentFit="contain"
        style={{
          width: '100%',
          aspectRatio: CHART_ASPECT_RATIO,
          borderRadius: theme.radius.r12,
          backgroundColor: theme.colors.backgroundAlternate,
        }}
      />

      <View style={{ gap: theme.spacing.space8 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: theme.spacing.space12,
          }}>
          <Text
            style={{
              ...theme.text.heading4,
              fontWeight: theme.fontWeight.strong,
              color: theme.colors.textStrong,
              flexShrink: 1,
            }}>
            {analysis.asset_guess}
          </Text>
          <View
            style={{
              backgroundColor: trend.fill,
              borderRadius: theme.radius.rFull,
              paddingHorizontal: theme.spacing.space12,
              paddingVertical: theme.spacing.space4,
            }}>
            <Text
              style={{
                ...theme.text.tiny,
                fontWeight: theme.fontWeight.strong,
                color: trend.text,
              }}>
              {`${trendCopy[analysis.trend].arrow} ${trendCopy[analysis.trend].label}`}
            </Text>
          </View>
        </View>
        <Text
          accessibilityRole="header"
          style={{
            ...theme.text.heading2,
            fontWeight: theme.fontWeight.bold,
            color: theme.colors.textStrong,
          }}>
          {copy.headline}
        </Text>
        <Text style={{ ...theme.text.body, color: theme.colors.textWeak }}>{copy.sub}</Text>
      </View>

      <Section heading="Prices to act on">
        <View style={{ gap: theme.spacing.space12 }}>
          <ValueRow label={copy.entry} hint={copy.entryHint} value={formatPrice(strategy.entry)} />
          {strategy.take_profit.map((price, index) => (
            <ValueRow
              key={`${price}-${index}`}
              label={`${copy.target} ${index + 1}`}
              hint={copy.targetHint}
              value={formatPrice(price)}
            />
          ))}
          <ValueRow label={copy.stop} hint={copy.stopHint} value={formatPrice(strategy.stop_loss)} />
        </View>
      </Section>

      <Section heading="How sure is the AI?">
        <Body>{`${formatPercent(strategy.confidence)} sure about this plan.`}</Body>
      </Section>

      <Section heading={`Why the AI says ${copy.headline.toLowerCase()}`}>
        <Body>{strategy.rationale}</Body>
      </Section>

      <Section heading="What the AI sees">
        <Body>{analysis.summary}</Body>
      </Section>

      <Section heading="Shapes in the chart">
        {analysis.patterns.length === 0 ? (
          <Body>The AI didn&apos;t find any known shapes in this chart.</Body>
        ) : (
          <View style={{ gap: theme.spacing.space8 }}>
            {analysis.patterns.map((pattern, index) => (
              <ValueRow
                key={`${pattern.name}-${index}`}
                label={pattern.name}
                value={`${formatPercent(pattern.confidence)} sure`}
              />
            ))}
          </View>
        )}
      </Section>

      <Section heading="Key prices and market mood">
        <View style={{ gap: theme.spacing.space8 }}>
          <DetailRow
            label="Price floor"
            value={
              analysis.support_levels.length === 0
                ? 'None found'
                : analysis.support_levels.map(formatPrice).join(', ')
            }
          />
          <DetailRow
            label="Price ceiling"
            value={
              analysis.resistance_levels.length === 0
                ? 'None found'
                : analysis.resistance_levels.map(formatPrice).join(', ')
            }
          />
          <DetailRow label="Price swings" value={analysis.volatility} />
          <DetailRow label="Trading activity" value={analysis.volume_read} />
          <DetailRow label="Market mood" value={analysis.sentiment} />
        </View>
      </Section>

      <Text style={{ ...theme.text.tiny, color: theme.colors.textWeak }}>{DISCLAIMER}</Text>
    </ScrollView>
  );
}
