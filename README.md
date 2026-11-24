# Audience Radar

**Know where your audience is, then launch there.**

Audience Radar estimates where an audience is paying attention (X, Telegram, Reddit and YouTube) and writes a ready-to-post launch kit for that place. Every interest label is an **estimate** from a sample of recent posts, always shown with its sample size. It never claims to know any platform's algorithm.

## Features

### Launch mode ("I'm launching a product")
- Describe the product (up to 1,000 characters) and pick one of 3 AI-suggested audiences, or refine for 3 new ones.
- Pick sources and choose how many X posts to search (50 or 100). The cost updates live.
- Radar results: one row per source with High / Medium / Low, a 3-bar icon, sample size and "Estimate".
- 8 hot keywords from top-performing posts (keywords only, never post text).
- Launch kit: X post (hot keywords highlighted), Telegram message, graphic card (PNG and editable SVG), 30-second video script. Copy, download, or download the full kit as a zip.

### Researcher mode ("I'm a researcher")
- Roles: Video creator, Writer, Marketer, Sales rep, or Other (free text).
- "Best places to reach your audience": a ranked list of platforms and communities (never individual people), each with an interest label, a one-line reason and the best way to show up for the role.
- "Copy summary" copies the ranked list as plain text.

### Also
- History of past runs, read-only share links (with "Stop sharing"), optional sign-in with an emailed one-time code.
- Light and dark mode, mobile and desktop.

## How AI is used

All AI calls go through one server-side function, `call_model(task, input)` in `backend/model_layer.py`. The provider is Google Gemini. The model comes from `GEMINI_MODEL` (default `gemini-flash-latest`) and the key from `GEMINI_API_KEY`.

| Task | What it does | Prompt file |
| --- | --- | --- |
| `audience_options` | 3 audience definitions, and 3 new ones on refine | `backend/prompts/audience_options.txt` |
| `researcher_ranking` | Ranked platforms and communities with a role-specific "best way to show up" | `backend/prompts/researcher_ranking.txt` |
| `launch_kit` | X post, Telegram message, card text, 30-second script | `backend/prompts/launch_kit.txt` |

- Answers are requested as JSON and validated with Pydantic (`backend/schemas.py`). Invalid or failed answers fall back to sample answers.
- User text is treated as data, not instructions, and capped at 1,000 characters.
- Gemini only receives the description, the chosen audience, the role, the hot keywords and aggregate numbers (labels and sample sizes). **It never receives post text.**
- Limits: 20 AI requests per browser per day (`AI_DAILY_LIMIT_PER_BROWSER`). Identical requests are cached for 24 hours and do not count.
- Every AI output is labelled **Live AI** or **Sample**, with "AI-generated. Check before posting."
- **Hot keywords do not use AI.** Plain server code (`backend/scoring.py`) splits each source's posts into the top 20% by engagement (likes + reposts + replies + quotes) and the rest, then returns the 8 most over-represented words or hashtags.

## Demo mode

- With no keys set, every source uses bundled sample data in `backend/sample_data/` for "a portfolio tracker for crypto traders" (X High, Telegram Medium, Reddit Low, YouTube Medium).
- With `X_BEARER_TOKEN` set, X uses the official X API v2 recent search. The caps are `MAX_POSTS_PER_RUN` per run and `DAILY_X_POST_CAP` per day for the whole app. If the key is missing, credits run out, the cap is reached or the call fails, X shows "Showing sample result".
- Telegram, Reddit and YouTube stay on sample data in this version. LinkedIn is listed as "Coming soon".
- Each source is labelled "Live data" or "Demo data".
- **Payment is mocked.** "Pay $X with crypto" opens a mock window and confirmation, and no money moves. It sits behind a payment adapter (`backend/payments.py`, `PAYMENT_MODE=mock`), ready for Solana USDC later.

## Configuration

See `.env.example` for every variable name. All keys stay on the server and are never sent to the browser.

- Interest thresholds (High 66+, Medium 33–65, Low below 33), scoring targets and keyword settings: `backend/config/settings.json`.
- Price per post: `PRICE_PER_POST_USD` (default $0.01). The X API cost is recorded for reference via `X_COST_PER_POST_USD`.
- Author metrics: `X_INCLUDE_AUTHOR_METRICS=true` requests follower counts, ranks posts by engagement per follower, and adds `X_COST_PER_AUTHOR_USD` per post to the cost.

## Setup and run

Requirements: Python 3.11+, Node 18+ with Yarn, MongoDB.

```bash
# Backend
cd backend
pip install -r requirements.txt
cp ../.env.example .env        # keep only the backend section, then fill in values
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Frontend (new terminal)
cd frontend
yarn install
echo "REACT_APP_BACKEND_URL=http://localhost:8001" > .env
yarn start
```

Open http://localhost:3000. All backend routes are under `/api`.

## Project layout

```
backend/
  server.py            API routes, pricing, caps, results
  model_layer.py       call_model(task, input): Gemini, cache, daily limits
  prompts/             one prompt file per AI task
  schemas.py           JSON validation for AI answers
  scoring.py           interest score and hot keywords (no AI)
  adapters/            one module per data source (demo + live, same interface)
  payments.py          payment adapter (mock)
  config/settings.json thresholds and scoring settings
  sample_data/         bundled demo data and sample AI answers
frontend/src/
  pages/               landing, flow screens, results, kit, history, shared view
  components/          UI building blocks
```

## License

MIT, see [LICENSE](LICENSE).
