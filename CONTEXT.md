# Inflectra

AI-powered trading chart analysis app (personal-use build of the ChartDetector AI concept): the user submits a chart image, an AI returns a structured analysis.

## Copy

All user-facing text is written with the `/ux-writing` skill and must be understandable for someone with zero trading knowledge: plain everyday words, short sentences, trading jargon only as secondary reference and defined inline ("This shape is called an ascending triangle..."). Examples of the preferred register: "Buy at this price", "Emergency exit", "How sure is the AI?", trend as Rising/Falling/Flat rather than bullish/bearish. This applies to AI-generated text too - the `analyze-chart` prompt must enforce the same style. See the verdict on issue #1 for the full vocabulary.

## Language

**Chart**:
A user-supplied image of a trading chart (photo or screenshot of stocks, crypto, or forex). The only MVP input; there is no live market data.
_Avoid_: graph, image, screenshot (as domain terms)

**Analysis**:
The full structured result the AI returns for one Chart: summary, trend, Patterns, support/resistance levels, volatility, volume read, sentiment, and one Strategy.
_Avoid_: report, prediction

**History**:
The user's persisted list of past Analyses. Each entry keeps the original Chart image (Supabase Storage, private per-user path) plus the Analysis row (Postgres). Rejections never appear here.
_Avoid_: log, feed

**Pattern**:
A named chart formation the AI detected (e.g. ascending triangle), with a confidence score.
_Avoid_: signal, formation

**Rejection**:
The AI's verdict that a submitted image is not a readable Chart (not a chart, or too degraded to read levels), with a user-facing reason. A Rejection is not an Analysis and is never persisted to History.
_Avoid_: error, failure

**Strategy**:
The actionable part of an Analysis: direction (long/short/hold), entry, stop-loss, take-profit targets, confidence, rationale. Educational suggestion, never executed - Inflectra places no trades.
_Avoid_: trade, signal, advice
