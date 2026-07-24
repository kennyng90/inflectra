# ChartDetector AI - research for building a comparable app

Researched 2026-07-24. Primary sources: App Store listing, official site, privacy policy, Starter Story interview, official docs (Anthropic, OpenAI, Expo, Supabase, Apple, RevenueCat). All URLs in Sources.

## Summary (TLDR)

- ChartDetector AI: iOS app, user photographs/uploads a trading chart (stocks, crypto, forex), AI returns pattern/trend analysis + trading strategy. By Timo + Patrick Köhler (Germany/Cyprus), launched mid-2025.
- Confirmed stack (founder interview): React Native + Expo frontend, Supabase backend, OpenAI vision API for analysis, RevenueCat subscriptions, AppsFlyer attribution, TikTok ads for growth. Privacy policy independently confirms OpenAI, RevenueCat, AppsFlyer, PostHog, Firebase Analytics, TikTok, Meta.
- Numbers (Starter Story, July 2026): ~$56k/mo revenue, >$260k lifetime, ~25% net margin, ~$18-20k/mo TikTok ad spend, 13-14k downloads/mo, >90k lifetime, ~20 hrs/mo of work.
- Monetization: hard paywall, no free trial. Weekly $9.99-12.99, monthly ~$19.99-24.99, 6mo $34.99-59.99, annual $34.99-49.99.
- Notably listed in the **Education** category with a "not financial advice" disclaimer - sidesteps Apple guideline 3.2.1(viii) which requires trading/investing apps to come from licensed financial institutions. A clone must do the same: position as education/analysis tool, never execute trades or give personalized advice.
- Clone architecture: Expo app (expo-image-picker) -> Supabase Edge Function (holds the AI API key) -> vision LLM (Claude or GPT) with structured JSON output -> render analysis. Supabase auth + Postgres for history, RevenueCat for subscriptions.

## The app

App Store listing (id 6743856402):

- Name: ChartDetector AI. Developer: Köhler Technology GbR (seller: KI Koehler International Ltd, Larnaca, Cyprus). Category: **Education**. Rating 4.4 (57 ratings). 162 MB, iOS 15.1+, English, age 16+.
- Description: "Turn your iPhone into a portable trading expert - with just one photo... transform any chart image into a real-time expert analysis. Simply upload a photo and instantly receive professional insights, key metrics, and a well-grounded action plan."
- Flow: capture/upload chart -> AI analyzes metrics, signals, patterns, formations -> summary, analysis, trading strategies.
- v1.5.2 (Jul 2026) added ticker search: "Search any stock, crypto, or forex pair, preview a live chart, and get your AI analysis in one tap" (no screenshot needed).
- Disclaimer in listing: "The information provided does not constitute financial or investment advice. Trading financial instruments involves risk."

Features per official site (chartdetectorai.com):

- Chart capture (photo or screenshot upload)
- AI pattern recognition, trend analysis, support/resistance mapping
- Volatility + volume evaluation, market sentiment
- Long/short/hold strategy suggestion
- AI News Analysis (scans articles for price-relevant news) - sold as separate "News Monthly" $9.99 IAP
- Multilingual (EN/ES/FR/PT); claims 115,000+ users

Pricing (App Store IAP list): Weekly $9.99/$8.99; Monthly $24.99/$19.99/$17.99; 6 Months $59.99/$34.99; Annual $49.99/$34.99; News Monthly $9.99. Multiple price points per tier = A/B tested paywalls.

## What the interview revealed

Video: "I Make $50K Per Month Working 5 Hours A Week", Starter Story channel (youtube.com/watch?v=DPb-M0Vt4uI). Details via podcast summary of the episode (biggo.com) and founder's X bio ("building b2c apps, $50k MRR").

Founder story: Timo Köhler, 23, ex German automotive software engineer, built it with his brother Patrick. Idea came when ChatGPT added image upload; they prototyped as a **Telegram bot** first, then shipped the mobile app mid-2025. Quit jobs ~6 months in.

Financials (April 2026 month detailed):

- ~$56k/mo revenue, >$260k lifetime; April: $43.7k revenue, ~$11.5k net profit (~25% margin)
- Costs: TikTok ads ~$20k (46%), Apple 15% cut ~$6.5k, infra/tools ~$5.6-8.1k
- 13-14k downloads/mo (>90k lifetime); ~$4.30 revenue and ~$1.33 ad cost per download; target ROAS 2x
- ~20 hrs/mo work

Tech stack (stated in interview):

- Frontend: React Native + Expo
- Backend: Supabase
- AI: OpenAI API vision model for chart analysis
- Subscriptions: RevenueCat; Attribution: AppsFlyer; Video editing: CapCut
- AI code-gen tool transcribed as "Persea AI" - likely a transcription error (Cursor is the standard tool in this space); treat as unverified

Privacy policy corroborates: OpenAI ("analysis of uploaded chart images"), RevenueCat, AppsFlyer, PostHog, Google/Firebase Analytics, TikTok, Meta. Data collected includes uploaded chart images, email, device info.

Growth playbook (TikTok ads):

- Hard paywall, no free trial: "you get immediately your money back" - immediate purchase events feed the ad algorithm
- Optimize campaigns for **subscription events**, not installs (via AppsFlyer MMP integration)
- Smart+ campaigns, broad country-level targeting only, min $50/day, 7-day learning phase untouched, scale budget max +20% every 3 days
- Minimum 6 UGC-style ads, continuous fresh creative to fight fatigue; one video did $15k revenue off ~5M views
- Outcome-focused onboarding with embedded social proof before the paywall

## How it likely works

Core loop: image -> vision LLM -> structured analysis. Both major providers support this; the key architectural rule is the AI API key lives server-side (edge function), never in the app bundle.

Anthropic Claude vision (platform.claude.com/docs/en/build-with-claude/vision):

- Send images as `image` content blocks: `{"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": ...}}` (also URL and file_id sources), followed by a text block with the prompt. Image-before-text ordering performs best.
- JPEG/PNG/GIF/WebP, max 10 MB base64, max 8000x8000 px. Cost = ceil(w/28) x ceil(h/28) visual tokens; a ~1M px chart screenshot is ~1,300-1,500 tokens.
- Structured outputs: `output_config: {format: {type: "json_schema", schema: ...}}` guarantees schema-valid JSON (docs.claude.com structured outputs).
- Chart interpretation is an explicitly documented use case (multimodal cookbook, "interpreting charts").

OpenAI vision (developers.openai.com/api/docs/guides/images-vision):

- Images via URL, base64 data URL (`data:image/jpeg;base64,...`), or file ID. GPT-5.x family supports vision; `detail` parameter (low/high/original/auto) trades cost vs fidelity.
- Structured Outputs (json_schema) usable alongside image inputs.

What the AI prompt needs to output (matches ChartDetector's UI): asset/timeframe detected, trend direction, detected patterns/formations, support/resistance levels, volatility/volume read, sentiment, suggested strategy (long/short/hold) with entry/SL/TP zones, confidence, plus a fixed educational disclaimer. Enforce with a JSON schema so the client renders typed cards instead of parsing prose.

Cost reality: one analysis is roughly 1.5-2k input tokens (image) + ~1k output tokens. Even on premium models that is a few cents per analysis, against a $10+/week subscription - unit economics are the whole trick of this app category.

## Recommended stack for a clone

- **Expo SDK 57** (React Native 0.86, current latest per docs.expo.dev). Use a development build (not Expo Go) since RevenueCat needs native modules.
- **expo-image-picker** for chart capture: `launchCameraAsync` / `launchImageLibraryAsync` with `base64: true`; requires `NSCameraUsageDescription` and `NSPhotoLibraryUsageDescription`. Resize/compress client-side (~1568 px long edge) before upload to cut tokens and latency.
- **Supabase**: Auth (email/Apple Sign-In), Postgres for analysis history, Storage for chart images (optional), **Edge Functions** (Deno/TypeScript) to call the LLM - docs explicitly list "orchestrating calls to external LLM APIs" as a use case; store the key with `supabase secrets set`, access via env vars. Client invokes with `supabase.functions.invoke()`; JWT verification gives per-user rate limiting/quota enforcement.
- **Vision LLM**: Claude (Sonnet class) or OpenAI GPT-5.x via the edge function, with structured output schema. Keep provider behind one function so it is swappable.
- **RevenueCat** (`npx expo install react-native-purchases react-native-purchases-ui`): subscription entitlements, remote paywalls, A/B price testing (explains ChartDetector's multiple price points per duration). Configure per-platform API keys at app entry.
- **AppsFlyer + TikTok Ads** if replicating the growth model; PostHog for product analytics.

Apple App Review considerations (developer.apple.com/app-store/review/guidelines):

- **3.2.1(viii)**: "Apps used for financial trading, investing, or money management should be submitted by the financial institution performing such services and must have necessary licensing and permissions." A chart-analysis app must NOT trade, hold funds, or manage money. ChartDetector ships as Education with an explicit not-financial-advice disclaimer; do the same.
- **3.2.2(viii)**: no binary options; CFD/forex facilitation requires licensing - do not facilitate trades at all.
- **5.1.1(ix)**: apps in regulated fields must come from a legal entity, not an individual developer - publish under a company (Köhler use a Ltd).
- **2.3.1**: no misleading marketing; do not promise returns or "guaranteed signals".
- **3.1.2(a)/(c)**: subscriptions min 7 days, must state clearly what the user gets before purchase; scammy subscription flows get removed.
- Include the risk disclaimer in-app (onboarding + every analysis result), in the listing, and in terms.

## MVP feature spec

Screens:

1. Onboarding (3-5 outcome-focused slides + social proof) -> hard paywall (RevenueCat paywall, weekly + annual, no trial)
2. Home / capture: camera, photo library upload; later: ticker search with live chart preview
3. Analysis result: trend, patterns, S/R levels, volatility, sentiment, long/short/hold plan, confidence, disclaimer banner
4. History: past analyses (Supabase rows + stored image)
5. Settings: account, subscription management, legal (privacy, terms, disclaimer)

Backend:

- Supabase Auth (anonymous or Apple/email)
- Edge Function `analyze-chart`: verify JWT -> check entitlement/quota -> receive base64 image -> call vision LLM with system prompt + JSON schema -> store result -> return typed JSON
- Tables: `profiles`, `analyses` (user_id, image_path, result jsonb, model, created_at) with RLS
- Secrets: LLM API key via `supabase secrets set`, never in the client

AI output schema (minimum): `asset`, `timeframe`, `trend` (up/down/sideways), `patterns[]` (name + description), `support_levels[]`, `resistance_levels[]`, `volatility`, `sentiment`, `strategy` (direction, entry_zone, stop_loss, take_profit, rationale), `confidence`, `disclaimer`.

Monetization: RevenueCat entitlement "pro"; hard paywall after onboarding; A/B price experiments via RevenueCat offerings.

Compliance checklist: Education category, disclaimers everywhere, company entity as publisher, privacy policy naming AI/analytics processors, no trade execution.

## Sources

- App Store listing: https://apps.apple.com/us/app/chartdetector-ai/id6743856402
- Official site: https://chartdetectorai.com/
- Privacy policy: https://koehler-international.com/chartdetector-ai/privacy-policy
- Terms: https://koehler-international.com/chartdetector-ai/terms-of-service
- Interview video (Starter Story): https://www.youtube.com/watch?v=DPb-M0Vt4uI ("I Make $50K Per Month Working 5 Hours A Week")
- Episode summary (revenue, stack, TikTok playbook): https://finance.biggo.com/podcast/3d134c33f35c1357
- Founder X: https://x.com/timoxkoehler , app X: https://x.com/chartdetector
- Anthropic vision docs: https://platform.claude.com/docs/en/build-with-claude/vision
- Anthropic structured outputs: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
- OpenAI images/vision guide: https://developers.openai.com/api/docs/guides/images-vision
- Expo SDK versions: https://docs.expo.dev/versions/latest/
- expo-image-picker: https://docs.expo.dev/versions/latest/sdk/imagepicker/
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- RevenueCat Expo install: https://www.revenuecat.com/docs/getting-started/installation/expo
- Apple App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
