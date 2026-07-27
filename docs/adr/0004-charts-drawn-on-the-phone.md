---
status: accepted
date: 2026-07-27
tags:
  - adr
---

# Inflectra draws its own Charts, on the phone

Before Inflectra can analyze anything, someone has to produce a chart image. Until now that was the
user: photograph a screen, or dig a screenshot out of the camera roll. That is the tedious part, and
it is the part worth removing.

So the user picks an Instrument and a Time resolution and taps analyze, exactly as they tap analyze
on a photo today. The app fetches candles (ADR 0003), draws the Chart on the device with
`react-native-svg`, captures it to an image, and hands it into the existing prepare-upload-invoke
path. `analyze-chart` is untouched, and supplying your own image stays a first-class way in.

## Why the phone

The obvious home for rendering is the Edge Function, and a spike proved it works there:
`@resvg/resvg-wasm` rasterizes a 1200px candle chart in about 80 ms after a 400 ms cold start. It
was investigated because an earlier design ran analyses on a schedule with nobody signed in, where
the phone could not be relied on to exist.

That design was dropped, and with it the reason. The user is present, holding the device, waiting
for the answer. Rendering on the phone therefore costs nothing in capability and removes a Deno SVG
builder, a wasm rasterizer, a bundled TTF font (which fails by silently dropping every label), and a
deploy cycle wrapped around the code most likely to need twenty attempts to look right. What
replaces all of it is a React component with hot reload.

The price is two native dependencies (`react-native-svg`, `react-native-view-shot`) and so a fresh
dev build, plus unreliable capture on web. Web is a development convenience here, not a target.

## What this fixes in place

- **BTC and ETH only.** Thin coins produce Patterns that are artifacts of thin trading.
- **The phone fetches the candles.** CoinGecko needs no key, so ADR 0001's keys-live-on-the-server
  rule does not bite yet. The day it needs one, the fetch moves behind an Edge Function and nothing
  else changes.
- **The Chart carries its own labels**, rendered into the image the way a photographed chart carries
  its own. `analyze-chart` never learns where an image came from, and the prompt and the analysis
  contract stay untouched. Label readability is the risk this buys, and the thing worth testing
  hardest.
- **`analyses` records the Instrument and the Time resolution**, both nullable. A drawn Chart's
  identity is fact; `asset_guess` is a guess. The app passes them to `analyze-chart`, which still
  writes the row.
- **A Rejection on a drawn Chart is our defect.** It surfaces as a retryable failure, never as the
  Rejection screen, because that screen judges an image the user did not supply.
- **A drawn Chart is stored like any other**, in the same private per-user folder, so every Analysis
  in History keeps the picture it was read from.
