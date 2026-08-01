---
status: accepted
date: 2026-07-27
tags:
  - adr
---

# Candles come from CoinGecko, priced in NOK

Inflectra draws Charts from market data (ADR 0004), so it needs candles. The market should have
been Firi's: Firi is where the user actually trades, so quoting its pairs would make the numbers in
an Analysis the numbers in the order form.

Firi cannot supply them. Its public API has no OHLC endpoint at all. `/v2/markets/:market/history`
returns raw trades, hard-capped at 1000 records with no pagination, and every attempt to page past
it is ignored. On BTCNOK those 1000 trades reach six hours back, and that is the entire history
available, ever. On thinner pairs the cap is not the problem: ETHNOK trades about eleven times a
day, so its 1000 trades span three months, and its quoted `last` was five hours stale when we
measured it. Neither end of that draws a readable chart.

Accumulating our own candles by polling Firi's ticker would preserve the exact numbers, but nothing
usable would exist for weeks.

So the candles come from CoinGecko's `/coins/{id}/ohlc?vs_currency=nok`. True OHLC, priced in NOK,
no key required.

## The two Time resolutions are the API's, not ours

CoinGecko picks granularity from the range requested; there is no granularity parameter. One to two
days gives 30-minute candles, three to thirty days gives 4-hour candles. So a drawn Chart is either
**two days in half-hour steps** (96 candles) or **thirty days in four-hour steps** (180 candles).
There is no hourly option to offer, and the choice is not arbitrary.

### Correction, measured 2026-08-01

Drawing the first Chart proved half of that unbuyable. Without a key the endpoint answers only a
listed set of ranges - 1, 7, 14, 30, 90, 180, 365 - and refuses `days=2` outright
(`Invalid days parameter`). The close-up Chart is therefore **one day in half-hour steps** (48
candles). Thirty days in four-hour steps is unaffected (180 candles).

The contract value is still `two_days`: renaming a value both sides validate is a change to the
spine and a migration, not a fix inside the drawing code.

## What it costs

A CoinGecko NOK price is an aggregated index converted to NOK, not Firi's order book, so a
Strategy's `entry`, `stop_loss` and `take_profit` are indicative rather than tradable. Measured
against Firi at decision time the gap was small on what actually trades: BTC -0.22%, SOL -0.62%,
LTC 0.65%, DOT 0.13%, ADA 0.00%. The larger gaps on ETH and XRP were Firi's stale last trade, not a
real spread.

This is survivable because the levels never leave the app. They sit next to the Chart, the
disclaimer, and a note that these prices follow the wider market.

Two risks remain. The NOK leg mixes currency movement into what is supposed to be a crypto pattern.
And thinly traded coins produce Patterns that are artifacts of thin trading, which is why the
Instrument list is short and liquid.
