---
status: accepted
date: 2026-07-27
tags:
  - adr
---

# A Watch's Chart is drawn from CoinGecko's NOK candles

A Watch has to produce a Chart without the user photographing one.

Feeding the AI raw OHLCV numbers instead of an image would be cheaper, and more precise about
price levels. But it splits the product in two: a second prompt, a second contract, and a History
where the user's Analyses and the Watch's Analyses are no longer the same kind of thing.

Screenshotting a public charting site would look exactly like today's input. It also breaks that
site's terms, breaks again every time their UI changes, and needs a browser runtime that Edge
Functions do not have.

So Inflectra draws the Chart itself, and `Chart` survives as one concept with two origins.

## Where the candles come from

The market should have been Firi's. Firi is where the user actually trades, so quoting its pairs
would make the numbers in an Alert the numbers in the order form.

Firi cannot supply them. Its public API has no OHLC endpoint at all. `/v2/markets/:market/history`
returns raw trades, hard-capped at 1000 records with no pagination, and every attempt to page past
it is ignored. On BTCNOK those 1000 trades reach six hours back, and that is the entire history
available, ever.

On the thinner pairs the cap is not the problem. ETHNOK trades about eleven times a day, so its
1000 trades span three months, and its quoted `last` was five hours stale when we measured it.
Neither end of that produces a readable chart.

Accumulating our own candles by polling Firi's ticker would preserve the exact numbers. But no
Watch would draw a usable Chart for weeks after it was created.

So the candles come from CoinGecko's `/coins/{id}/ohlc?vs_currency=nok`. It is true OHLC priced in
NOK, and it needs no key.

Its granularity is not free: the range picks it. One to two days gives 30-minute candles, three to
thirty days gives 4-hour candles. A Watch's time resolution is therefore a choice between
**30 minutes** (a 2-day window, 96 candles) and **4 hours** (a 30-day window, 180 candles). It is
not an arbitrary interval.

## What that costs

A CoinGecko NOK price is an aggregated index converted to NOK, not Firi's order book. So a
Strategy's `entry`, `stop_loss`, and `take_profit` are indicative rather than tradable.

Measured against Firi at decision time, the gap was small on what actually trades: BTC -0.22%,
SOL -0.62%, LTC 0.65%, DOT 0.13%, ADA 0.00%. The larger gaps on ETH and XRP were Firi's stale last
trade, not a real spread.

This is survivable only because an Alert carries no numbers. The levels stay inside the app, next
to the Chart and the disclaimer, where being approximately right is what they always were.

Two risks remain. The NOK leg still mixes currency movement into what is supposed to be a crypto
pattern. And small altcoins may produce Patterns that are artifacts of thin trading. A Rejection
on a self-drawn Chart should be read as a defect in our own rendering, not as a message to the
user.

## Rendering

Rendering is an SVG string rasterized to PNG by a WASM rasterizer, because Deno has no canvas and
Claude does not read SVG. The SVG is the testable artifact; pixels are not asserted on.

This was the one assumption that could still have failed. It has now been confirmed against a
deployed Edge Function on the live project. `@resvg/resvg-wasm` 2.6.2 initialises in roughly
400 ms cold alongside its font, and renders a 1200px-wide candle chart to a valid PNG in about
80 ms.

Two things that spike taught us, both binding on the implementation:

**resvg will not read a woff font.** The buffer loads without error, and the output is
byte-identical to passing no font at all. Every text label vanishes silently. The font must be a
TTF, and the render path needs a test that fails when the labels disappear, not one that only
checks the PNG is valid.

**Nothing may be fetched from a public CDN per request.** The spike fetched both the wasm and the
font that way, which is fine for a spike and not fine for a scheduled job. Both belong bundled
with the function or stored in Supabase Storage, so a CDN outage cannot silence a Watch.
