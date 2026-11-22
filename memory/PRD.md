# Audience Radar — PRD

## Original problem statement
"Audience Radar" — "Know where your audience is, then launch there." Responsive web app in DEMO MODE on bundled sample data. Describe → audience wizard (3 AI cards + refine) → sources & cost (X paid $0.005/post, Telegram/Reddit/YouTube free) → mock crypto pay → results (launch: per-source High/Medium/Low + 3-bar icon + sample size + "Estimate" + hot keywords; creator: ranked platforms/communities with reason + best format) → launch kit (X post w/ highlighted keywords, Telegram message, graphic card, 30s script; copy/download; full kit zip) → history. Landing page + Roadmap page. Light/dark themes with given palette, Space Grotesk + Inter. Adapters per source, configurable thresholds, callModel(task,input) with provider/model from env, prompts in files, validated JSON.

## Architecture (implemented 2026-06)
- Backend FastAPI: `server.py` (routes), `adapters/` (base + x/telegram/reddit/youtube Demo & Live stubs, `DATA_MODE` env), `scoring.py` (interest score + keyword over-representation), `config/settings.json` (thresholds 66/33, price per post, targets, keyword params), `model_layer.py` (`call_model`, env `MODEL_PROVIDER`/`MODEL_NAME`/`AI_ENABLED`/`MODEL_API_KEY`→fallback `EMERGENT_LLM_KEY`), `schemas.py` (pydantic validation), `prompts/*.txt`, `sample_data/*.json` + `ai_fallbacks.json`, `scripts/generate_samples.py`.
- Mongo `runs` collection (uuid id). History: My runs (browser client id) / All runs.
- Frontend React: pages Landing, Roadmap, Describe, Audience, Sources, Pay, Results, Kit, History; next-themes (system + toggle); canvas-rendered launch card; JSZip full kit.

## Implemented
- Full flow in both modes, both themes, mobile + desktop. Tested (iteration_1): backend 100%, frontend all flows pass.
- Gemini (gemini-3-flash-preview) via Emergent LLM key; sample fallbacks on failure.
- Payment is MOCKED. Data sources are DEMO sample files.

## Iteration 2 (2026-06)
- Livelier hover on buttons (fill sweep, lift, halo, icon nudge, press) and header nav (pill + accent underline).
- Hero animated radar backdrop (inline SVG + CSS: pulsing rings 9s, 12s sweep with wedge, 7 blips in padding strips; reduced-motion off).
- Live adapters on official APIs: X v2 recent search (100 posts, $0.50), Reddit app-only OAuth search, YouTube Data API v3. Telegram stays sample. DATA_MODE=auto: live where keys set, else sample per source, with per-source Live/Demo data tags. Live fetch errors fall back to sample. Live volume = posts/day; live_targets in settings.json are placeholders to tune.
- Keys needed: X_BEARER_TOKEN, REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, YOUTUBE_API_KEY.

## Iteration 3 (2026-06)
- Hero radar card: rotating audience word (crypto traders → writers → developers → researchers → enthusiasts, 3s, slide-up/fade) with pulsing ellipsis in accent; rows change per audience (crypto = real demo values, others illustrative); pause on hover/focus; reduced-motion static; stable aria-label. Tested iteration_2: 100%.
- Live keys (X, Reddit, YouTube) skipped by user: all sources on sample data.

## Backlog
- P1: Live adapters (official APIs), real crypto payment, threshold tuning on real data.
- P2: Prepaid credits, Bitcoin, more sources, scheduling; dedupe creator ranking per platform; demo video asset.
