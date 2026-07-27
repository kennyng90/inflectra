# Inflectra

AI-powered trading chart analysis app (personal-use build of the ChartDetector AI concept): the user submits a chart image, an AI returns a structured analysis.

## Copy

All user-facing text is written with the `/ux-writing` skill. It must be understandable for someone with zero trading knowledge: plain everyday words and short sentences. Trading jargon appears only as a secondary reference, defined inline ("This shape is called an ascending triangle...").

The preferred register: "Buy at this price", "Emergency exit", "How sure is the AI?", and trend as Rising/Falling/Flat rather than bullish/bearish.

This applies to AI-generated text too. The `analyze-chart` prompt must enforce the same style. See the verdict on issue #1 for the full vocabulary.

## Language

**Chart**:
An image of a trading chart (stocks, crypto, or forex). It arrives one of two ways: the user supplies it (photo or screenshot), or Inflectra draws it from market data for a Watch. Either way it is one image, and one Analysis reads exactly one Chart.
_Avoid_: graph, image, screenshot (as domain terms)

**Analysis**:
The full structured result the AI returns for one Chart: summary, trend, Patterns, support/resistance levels, volatility, volume read, sentiment, and one Strategy. Identical in shape whether the user asked for it or a Watch did.
_Avoid_: report, prediction

**Alert**:
The push Inflectra sends when a Watch's verdict changes. It marks the moment the answer changed, not the fact that a run happened.

The comparison is against the last verdict Inflectra alerted about, not the previous run. That is deliberate. A verdict can arrive unconvincing and firm up over later runs, and it is still news the user never heard. Repeating a verdict already alerted stays silent, and so does an unconvincing one.

An Alert names what changed and nothing more. Price levels stay inside the app, next to the Chart and the disclaimer.
_Avoid_: signal, notification (as a domain term), tip

**History**:
The user's saved record of past Analyses. An Analysis the user asked for always keeps its Chart, because their own image cannot be recovered once dropped. An Analysis a Watch produced keeps its Chart only when it raised an Alert. The rest are drawings of data: worth remembering, not worth storing. Rejections never appear here.
_Avoid_: log, feed

**Instrument**:
The tradable thing a Watch follows. For now always a crypto pair, because crypto is what the user trades. Crypto never closes, so a Watch needs no opening hours and runs on a plain interval. Stocks would change that, and are deliberately out of scope.
_Avoid_: ticker, symbol, asset (the AI's `asset_guess` is a guess about one Chart, not an Instrument)

**Pattern**:
A named chart formation the AI detected (e.g. ascending triangle), with a confidence score.
_Avoid_: signal, formation

**Rejection**:
The AI's verdict that a submitted image is not a readable Chart (not a chart, or too degraded to read levels), with a user-facing reason. A Rejection is not an Analysis and is never persisted to History.
_Avoid_: error, failure

**Strategy**:
The actionable part of an Analysis: direction (long/short/hold), entry, stop-loss, take-profit targets, confidence, rationale. Educational suggestion, never executed - Inflectra places no trades.
_Avoid_: trade, signal, advice

**Watch**:
A standing instruction to keep analyzing one Instrument at one time resolution, on a repeating schedule, with nobody present. The same Instrument at two time resolutions is two Watches. Each run produces one Chart and one Analysis, and may raise an Alert.
_Avoid_: subscription, monitor, tracker, job
