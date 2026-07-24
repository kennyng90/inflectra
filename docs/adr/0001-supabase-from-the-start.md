---
status: accepted
date: 2026-07-24
tags:
  - adr
---

# Full Supabase backend for a personal-use app

Inflectra is personal-use first (no paywall, no public distribution), so the cheapest path was a purely on-device app: AI key on the phone, history in local SQLite, no auth. We chose a full Supabase backend anyway - auth, Postgres history, and an `analyze-chart` Edge Function holding the AI key - matching the original ChartDetector architecture. Rationale: keeps a clean path to multi-user/commercial later without a rewrite, keeps the AI key server-side from day one, and the stack (React Native + Expo + Supabase) is itself something the owner wants to build with. Trade-off accepted: auth flows, deploys, and a second codebase before any personal value ships.
