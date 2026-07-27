# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

## Commands

```bash
npx expo start           # dev server; i = iOS simulator, w = web
npm test                 # jest (jest-expo preset); supabase/ is excluded
npm test -- history      # single suite by path substring
npm test -- -t "signs"   # single test by name
npm run typecheck        # tsc --noEmit; excludes supabase/functions (Deno)
npm run lint             # expo lint
npm run test:functions   # deno tests for the Edge Function, no network needed
```

Two toolchains: the app is npm/TypeScript, `supabase/functions/` is Deno with its own
`deno.json` import map. `tsc` and jest both skip the functions; `test:functions` is the
only thing that covers them.

Env: copy `.env.example` -> `.env.local` (Supabase URL + anon key) and
`supabase/functions/.env.example` -> `supabase/functions/.env.local` (`ANTHROPIC_API_KEY`).
Without the app-side vars the app still boots and Settings reports the server as not set up.

Supabase local stack:

```bash
supabase start
supabase functions serve analyze-chart --env-file supabase/functions/.env.local
supabase db reset                                     # after editing migrations
supabase gen types typescript --local > supabase/functions/_shared/database.types.ts
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...     # production; never in the app binary
supabase functions deploy analyze-chart
```

## Architecture

Expo Router (typed routes, React Compiler on) + Supabase. `src/app/` is the route tree;
`src/lib/` holds everything else. Path aliases: `@/*` -> `src/*`, `@/assets/*` -> `assets/*`.

**The one AI touchpoint** is the `analyze-chart` Edge Function. The app never calls Anthropic.

**The contract is the spine.** `supabase/functions/_shared/analysis-contract.ts` defines the
zod schemas for `Analysis | Rejection`, derives the JSON schema Claude is constrained to from
those same schemas, and is re-exported to the app as `src/lib/analysis-contract.ts` (a
three-line `export *` across the Deno/npm boundary). Both sides validate the identical shape.
Change the contract in the shared file only.

**The analyze flow** (`src/lib/chart-analysis.ts` + `src/lib/analyze-flow.tsx`):
resize to `MAX_CHART_EDGE` and re-encode to JPEG -> upload to `charts/{user_id}/{file}` ->
invoke `analyze-chart` with the storage path -> the function downloads via an RLS-scoped
client, calls Claude, and **inserts the History row itself** on success. Consequences worth
knowing before touching it:

- A Chart only stays in storage if an Analysis was saved. Rejections and failures delete the
  upload; the app does that cleanup.
- Neither the upload nor the function can be aborted, so cancel *stops waiting* and then
  undoes the result once it lands (`discardRun` removes both the object and the row the
  function wrote after the app stopped listening).
- `AnalyzeFlowProvider` is a root-level context because the Analyze tab and the analysis
  modal are separate routes sharing one in-flight run.

**Errors** flow through `src/lib/user-facing-error.ts`. `UserFacingError` means the message is
safe to render as-is; `PermanentError` means a retry is pointless (hide the retry button).
Anything else shows the caller's fallback. The Edge Function answers `{ error: { code, message } }`
and `serverErrorMessage()` digs that out of the supabase-js error's `context`.

**Data model** (`supabase/migrations/`): one `analyses` table, RLS-scoped by `user_id`, no
update policy - an Analysis is immutable. Charts live in a private `charts` bucket, one folder
per user, read through short-lived signed URLs. History lists rows with a *loose* schema
(`listedAnalysisSchema`) so an Analysis saved under an older contract still appears; opening
one parses strictly and fails with `HISTORY_ENTRY_UNREADABLE`.

**Auth** (`src/lib/auth.tsx`): email magic link plus Sign in with Apple. The web redirect URL
is captured at import time - expo-router strips the fragment before effects run. Routing is
`<Stack.Protected>` guards in `src/app/_layout.tsx`; both branches are guarded, since a screen
only redirects away when its own guard flips false.

## Conventions

**Copy is a first-class artifact.** All user-facing text targets someone with zero trading
knowledge: plain words, short sentences, jargon only as an inline aside. Rising/Falling/Flat,
not bullish/bearish. This applies to the `analyze-chart` prompt too. The domain vocabulary
(Chart, Analysis, History, Pattern, Rejection, Strategy - each with words to avoid) is in
`CONTEXT.md`; use those terms in code and comments. Copy lives in dedicated modules
(`analysis-copy.ts`, `rejection-copy.ts`, `analyzing-copy.ts`) and is unit-tested, not inlined
in components.

**Styling comes only from `src/theme/tokens.ts`** via `useTheme()`. Never hardcode a color,
spacing, radius, or type value. `tokens.ts` is a hand-corrected port of `docs/design/tokens.js`
(the Figma export, which is generated - do not hand-edit it).

**Tests** sit in `__tests__/` next to the code and target logic modules, not components:
schemas, copy formatting, cancel semantics, error mapping. Supabase is faked by passing a stub
client into the exported functions, which all take `client` as an optional last argument.

**Comments** explain the non-obvious "why" - a race, a cleanup obligation, a platform quirk -
in one or two terse lines. Self-evident code carries none.

## Worktrees

Agent worktrees live in `.claude/worktrees/`, inside the repo. `metro.config.js` blocks sibling
worktrees from the bundle and jest ignores them. Run `npm install` inside a worktree before
starting a dev server there, or the web bundle 404s to a blank page.
