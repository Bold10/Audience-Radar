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

## Backlog
- P1: Live adapters (official APIs), real crypto payment, threshold tuning on real data.
- P2: Prepaid credits, Bitcoin, more sources, scheduling; dedupe creator ranking per platform; demo video asset.
