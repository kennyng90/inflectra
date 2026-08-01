---
status: accepted
date: 2026-07-28
tags:
  - adr
---

# The Instrument list is what Firi sells for kroner

ADR 0004 gave the user an Instrument to pick, and ADR 0003 made that list Bitcoin and Ethereum,
on the grounds that thinly traded coins produce Patterns that are artifacts of thin trading. That
reasoning is sound and it is kept. What was wrong was using it to pick the list by hand.

The list is now **the nine pairs Firi quotes in NOK**: Bitcoin, Ethereum, BNB, USDC, XRP, Solana,
Cardano, Litecoin and Polkadot. It comes from `GET api.firi.com/v2/markets`, filtered to `*NOK`.

## Why Firi decides it

Firi is where the user trades. An Analysis of something they cannot buy there is a suggestion they
cannot act on, and a coin they *can* buy but which the app refuses to read is a hole they have to
work around by screenshotting it themselves - the exact tedium ADR 0004 set out to remove. Firi's
own list draws the line in the only place that survives contact with the user: what is for sale.

It also happens to satisfy ADR 0003's liquidity worry rather than override it. That ADR measured
CoinGecko's NOK price against Firi's at decision time on BTC, SOL, LTC, DOT and ADA - five of these
nine - and found gaps of 0.65% or less. The pairs an exchange bothers to run an NOK order book for
are, by and large, the ones with the volume to make a shape mean something.

The list is fetched, not hardcoded to nine forever. Firi adding a tenth NOK pair should add a tenth
Instrument without a release.

### Correction, 2026-08-01

A tenth pair needs a release after all. Firi says which Instruments *exist*; it does not say what
any of them is. Drawing one takes its identifier at CoinGecko, and offering one takes a plain name
and the `stable` fact - none of which is in Firi's answer, and none of which can be derived from a
symbol without risking a Chart of the wrong thing under the right name.

So a static catalogue holds those three facts per Instrument, and a fetched NOK pair with no entry
in it is left out rather than shown broken. Adding a tenth Instrument is a one-line catalogue
addition and a release.

Firi still decides the list: it can drop a pair, or stop quoting one in kroner, and the app follows
the same day, with no release at all. What it cannot do on its own is add one.

## What this costs

- **The prices still come from CoinGecko** (ADR 0003), because Firi has no OHLC endpoint. Firi picks
  the list; CoinGecko draws it. The two are separate decisions and this one does not disturb the
  other.
- **USDC is on the list and cannot be analyzed.** It is a stablecoin: its chart is a flat line by
  construction and there is no shape to read. Hiding it would misrepresent what Firi sells, so it
  is listed, drawn flat, and says why in place of its buttons. `stable` is a fact recorded on the
  Instrument, not a guess made from today's numbers - a real coin can have a flat day.
- **Nine Instruments cannot each fetch their own candles when the screen opens.** Measured against
  the free tier, nine `/coins/{id}/ohlc` calls paced ten seconds apart still answered `429` on the
  eighth and ninth. So the list is drawn from the *single* `/coins/markets` call, which returns a
  seven-day sparkline for all nine at once, and candles are fetched only for the one Chart being
  analyzed. A rate limit gets its own plain-words message rather than folding into a generic
  failure.
- **That sparkline is priced in USD** whatever `vs_currency` says. It is a shape and never a number:
  it carries no axis, no label, and never sits where it could be read as the NOK price beside it.
- **Every preview floors its price range at 4% of price.** Nine cards that each scale to their own
  range make a coin that moved 0.05% look exactly like one that moved 5%. The floor is what makes
  a quiet day render quiet, and it is a correctness rule, not a style choice.
