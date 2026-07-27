---
status: accepted
date: 2026-07-27
tags:
  - adr
---

# Watches run server-side with the service role, outside RLS

Every Phase 1 path is RLS-scoped. `analyze-chart` authenticates the caller, downloads the Chart
with a client that makes another user's path read as missing, and inserts the Analysis as that
user.

A Watch has no caller. It fires at 04:00 with nobody signed in. So the natural instinct was to
keep the security model and let the phone do the work: `expo-background-task` runs while the
user's session exists, RLS is untouched, and nothing new is deployed.

We rejected that. iOS decides when background tasks run, runs them less the less the app is used,
and never runs them when the app is force-quit. "Several times a day" would have become "maybe
once, maybe not", and that is the entire value of Phase 2.

We rejected storing a long-lived refresh token so cron could act as the user, too. It puts a key
to the account in the database, and it dies silently the day the token expires.

So a new `run-watches` Edge Function is invoked by Supabase Cron and runs with the service key. It
reads Watches, fetches market data, draws the Chart, and saves the Analysis for a user who is not
present. The AI call moves to `_shared/` so both paths use one implementation. `analyze-chart`
stays exactly as it is, and the manual flow keeps the security it has today.

Here is the consequence, and the reason this is written down. RLS no longer protects that path.
`run-watches` must scope every read and write to the Watch's own `user_id` in its own code, and a
missing filter is a cross-user leak that the database will not catch. Reviews of that function
have to treat `user_id` filtering as load-bearing rather than incidental.
