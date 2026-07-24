# Analysis result screen prototype (gh issue #1)

**Question:** what should the Analysis result screen look like?

**Run:** `open prototype/analysis-result.html` (or any static server). Switch with the floating bar, `?variant=A|B|C`, or arrow keys. Moon button toggles dark mode.

Three structurally different takes, all styled exclusively with `docs/design/tokens.css`:

- **A - Verdict first.** Summary prose + trend pill lead, chart is a thumbnail, each contract section is a stacked card, Strategy is the closing card. Reads like a report.
- **B - Trade ticket.** Strategy is the screen: price ladder (TP2/TP1/entry/SL with % deltas) up top under a slim chart strip; summary, patterns, and levels demoted to accordions. Reads like an order.
- **C - Annotated chart.** Chart dominates with S/R levels drawn on the image, stat chips rail, prose below, Strategy pinned as a sticky bottom sheet. Reads like TradingView.

**Verdict (2026-07-24):** **B - Trade ticket** wins. First pass of B's copy was too jargon-heavy; rewritten per the ux-writing skill: plain-action labels first with the technical term as secondary text ("Sell to limit loss" / "Stop loss"), headline states the action ("Buy - go long" + "The AI expects the price to rise."), a note explains the % column, and the mock AI text (summary, rationale, conditions) uses short plain sentences - carry that into the production Claude prompt ("explain in plain language, define jargon inline"). Second pass went further: copy now assumes zero trading knowledge - "Buy" / "Emergency exit" / "How sure is the AI?", trend shown as "Rising/Falling/Flat" instead of bullish/bearish, sections named "Shapes in the chart" and "Key prices & market mood", support/resistance as "Price floor/ceiling". Trading terms survive only where the AI names a pattern. Fold B into the real Analysis screen, then delete this folder.
