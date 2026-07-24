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

## Dev build on iPhone

The app runs as an EAS development build (project `@kenng90/inflectra`):

```bash
npx eas-cli build --platform ios --profile development
```

First run is interactive: sign in with the Apple Developer account and register the iPhone when prompted (`npx eas-cli device:create` generates the registration link). Install the build from the link EAS prints, then point it at the local dev server started with `npx expo start`.

## Design tokens

All styling comes from `src/theme/tokens.ts`, ported from `docs/design/tokens.js` (single source of truth: the Figma token export). Do not hardcode colors, spacing, or type; use `useTheme()`.
