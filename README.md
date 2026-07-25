# Inflectra

AI-powered trading chart analysis app. Expo (React Native) + Supabase. See `CONTEXT.md` for product language and `docs/` for design tokens, research, and ADRs.

## Develop

```bash
npm install
npx expo start        # dev server; press i for iOS simulator, w for web
npm test              # jest
npm run typecheck     # tsc --noEmit
npm run lint          # expo lint
```

## Supabase

Copy `.env.example` to `.env.local` and fill in the project URL and anon key from the Supabase dashboard (Project Settings -> API). The Metro dev server picks these up; without them the app boots and Settings shows the server as not set up.

## analyze-chart Edge Function

The only AI touchpoint. It takes the storage path of an uploaded Chart, calls Claude, and returns either a schema-valid Analysis (saved to History) or a Rejection (saved nowhere). The response contract lives in `supabase/functions/_shared/analysis-contract.ts` and is re-exported to the app as `src/lib/analysis-contract.ts`.

```bash
npm run test:functions   # deno contract tests, no Supabase or network needed
supabase start           # local stack (db, auth, storage)
supabase functions serve analyze-chart --env-file supabase/functions/.env.local
```

Copy `supabase/functions/.env.example` to `supabase/functions/.env.local` for local runs. In production the key is a function secret, never in the app binary:

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase functions deploy analyze-chart
```

After changing migrations, run `supabase db reset` locally and regenerate `supabase/functions/_shared/database.types.ts`:

```bash
supabase gen types typescript --local > supabase/functions/_shared/database.types.ts
```

## Dev build on iPhone

The app runs as an EAS development build (project `@kenng90/inflectra`):

```bash
npx eas-cli build --platform ios --profile development
```

First run is interactive: sign in with the Apple Developer account and register the iPhone when prompted (`npx eas-cli device:create` generates the registration link). Install the build from the link EAS prints, then point it at the local dev server started with `npx expo start`.

## Design tokens

All styling comes from `src/theme/tokens.ts`, ported from `docs/design/tokens.js` (single source of truth: the Figma token export). Do not hardcode colors, spacing, or type; use `useTheme()`.
