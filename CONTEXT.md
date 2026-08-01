# Inflectra

AI-powered trading chart analysis app (personal-use build of the ChartDetector AI concept): a chart image goes in, an AI returns a structured analysis. The user can supply the image, or pick an Instrument and let Inflectra draw it.

## Copy

All user-facing text is written with the `/ux-writing` skill. It must be understandable for someone with zero trading knowledge: plain everyday words and short sentences. Trading jargon appears only as a secondary reference, defined inline ("This shape is called an ascending triangle...").

The preferred register: "Buy at this price", "Emergency exit", "How sure is the AI?", and trend as Rising/Falling/Flat rather than bullish/bearish.

This applies to AI-generated text too. The `analyze-chart` prompt must enforce the same style. See the verdict on issue #1 for the full vocabulary.

## Language

**Chart**:
An image of a trading chart (stocks, crypto, or forex). It arrives one of two ways: the user supplies it (photo or screenshot), or Inflectra draws it on the phone from market data for an Instrument the user picked. Either way it is one image, the user sees the same image the AI does, and one Analysis reads exactly one Chart.
_Avoid_: graph, image, screenshot (as domain terms)

**Analysis**:
The full structured result the AI returns for one Chart: summary, trend, Patterns, support/resistance levels, volatility, volume read, sentiment, and one Strategy. Identical in shape whether the Chart was supplied or drawn.
_Avoid_: report, prediction

**History**:
The user's saved record of past Analyses. Every Analysis keeps its Chart, supplied or drawn, so nothing in History is a result without the picture it was read from. Rejections never appear here.
_Avoid_: log, feed

**Instrument**:
The tradable thing the user picks when they want a Chart without supplying one. The list is whatever Firi quotes in NOK - nine of them today - because an Analysis of something the user cannot buy where they trade is a suggestion they cannot act on. Priced in NOK. Stocks are deliberately out of scope. A stablecoin is listed, because Firi sells it, but cannot be analyzed: its chart is a flat line and there is no shape to read.
_Avoid_: ticker, symbol, asset (the AI's `asset_guess` is a guess about one Chart, not an Instrument), coin, pair

**Market**:
The list of Instruments with what each costs right now, in kroner, and how its price has moved. It is the app's home screen: the first thing you see, and where an Analysis is asked for. Prices follow the wider market rather than any one exchange's order book, and the app says so.
_Avoid_: watchlist, portfolio, feed, ticker list

**Pattern**:
A named chart formation the AI detected (e.g. ascending triangle), with a confidence score.
_Avoid_: signal, formation

**Rejection**:
The AI's verdict that an image the user supplied is not a readable Chart (not a chart, or too degraded to read levels), with a user-facing reason. A Rejection is not an Analysis and is never persisted to History. The same verdict on a Chart Inflectra drew is not a Rejection at all - it is our own defect, and the user is never shown a judgement on an image they did not supply.
_Avoid_: error, failure

**Strategy**:
The actionable part of an Analysis: direction (long/short/hold), entry, stop-loss, take-profit targets, confidence, rationale. Educational suggestion, never executed - Inflectra places no trades.
_Avoid_: trade, signal, advice

**Time resolution**:
How far back a drawn Chart reaches and how coarse its candles are. There are exactly two, and they are not an arbitrary choice: the market data source picks granularity from the range asked for. Two days in half-hour steps, or thirty days in four-hour steps.
_Avoid_: interval, timeframe, granularity, period
