# Audience Radar: Final Update (Researcher Mode, Live Gemini, Live X, Caps, Docs)

Audience Radar estimates where an audience is paying attention (X, Telegram, Reddit, YouTube) and writes a launch kit for that place.
This update renames Creator mode to Researcher, connects Gemini and X with strict caps, and adds the repository docs. The name, design, colours and logo do not change.

## Who it's for
- **Product launchers** deciding where to announce a product.
- **Researchers**: video creators, writers, marketers, sales reps and others who want to know which platforms and communities to show up in.

## Already in place (kept, with small adjustments only)
- **Home page motion**: pulsing radar rings, the rotating sweep with a trailing wedge, and 7 fading blips. It uses CSS variables, turns off for reduced motion and keeps contrast. No change.
- **Share links**: create, open read-only, stop sharing. They are hidden from search engines and show no payment details. No change.
- **Keywords block** with per-keyword copy, a "Copied" state and "Copy all". The **editable SVG card** is also included in the full-kit zip. No change.
- **Optional sign-in with any email** using an emailed one-time code. The Gmail-only rule is already removed. There is no "see who opened a link" feature, and there are no team spaces or comments. No change.
- **One callModel(task, input) function**, prompts in separate files, JSON answers validated, sample fallbacks. It gets adjusted (see Live Gemini).
- **Mock payment window**. It gets moved behind a payment adapter.
- **Live X module on the official API**. It gets adjusted: post count, no author data by default, and caps.
- **Hot keywords in plain server code**. Two changes: the AI clean-up step is removed, and the ranking uses raw engagement.
- **Telegram, Reddit and YouTube on sample data.** No change.

## Missing or different (built now)

### 1. Researcher mode
- "Creator" becomes "Researcher" everywhere: the mode card, landing page, how it works, the two modes, FAQ, roadmap, results labels, History, shared pages and sample data. Past runs saved as Creator show as Researcher. Job titles such as "Video creator" stay.
- **Roles**: Video creator, Writer, Marketer, Sales rep, Other. "Other" opens a labelled free-text field, max 40 characters.
- **Results title**: "Best places to reach your audience". This is a ranked list of platforms and communities only, never individual people. Each row shows:
  - an interest label (High / Medium / Low) with a 3-bar icon, the sample size and "Estimate";
  - a one-line reason;
  - **"Best way to show up"**, worded for the role:
    - Video creator: a video format.
    - Writer: an article format.
    - Marketer: a channel tactic.
    - Sales rep: how to join the conversation and start outreach.
    - Other: general advice based on the typed role.
- A **"Copy summary"** button copies the ranked list as plain text.

### 2. Live Gemini (server only)
- Gemini runs three tasks:
  - the audience wizard: 3 options, plus "None of these, refine" for 3 new ones;
  - the Researcher ranking;
  - the launch kit: an X post using the hot keywords, a Telegram message, graphic card text and a 30-second video script.
- The model and key come from **GEMINI_API_KEY** and **GEMINI_MODEL**. If GEMINI_API_KEY is empty, every AI step uses sample answers labelled "Sample". The Emergent LLM key is no longer used.
- User text is treated as data, not instructions, and capped at 1,000 characters (enforced on screen and on the server).
- **Limits**: 20 AI requests per browser per day. Identical requests are answered from a cache and do not count. Over the limit, the step uses sample answers.
- Every AI output carries a **"Live AI"** or **"Sample"** label, plus "AI-generated. Check before posting."
- Gemini receives only the description, the chosen audience, the role, the hot keywords and aggregate numbers such as labels and sample sizes. It never receives post text.

### 3. Hot keywords without AI
- Engagement = likes + reposts + replies + quotes.
- The top 20% of posts by engagement are compared with the rest. The 8 most over-represented words or hashtags are returned.
- Raw post text is never stored and never sent to Gemini. Only the keywords are kept.
- **X_INCLUDE_AUTHOR_METRICS** (default false):
  - false: no author data is requested from X, and posts are ranked by raw engagement.
  - true: author follower counts are requested, engagement is divided by followers, and X_COST_PER_AUTHOR_USD (default $0.01) per post is added to the cost estimate.

### 4. Live X data and post count
- On Sources and cost, under X: a labelled number field **"Posts to search on X"**, with 44px − and + buttons. It goes from 50 to MAX_POSTS_PER_RUN (default 100) in steps of 50, and defaults to 50.
- The cost box updates live: N posts × PRICE_PER_POST_USD (default $0.01), $0 for free sources, the author add-on when enabled, and the total. The server recalculates and validates the number.
- With **X_BEARER_TOKEN** set, recent posts come from the official X API.
- **Caps on the server**:
  - MAX_POSTS_PER_RUN per run;
  - DAILY_X_POST_CAP (default 500) X posts per day for the whole app.
  - A request above the per-run limit is refused with a clear message on the Sources screen.
- **Fallbacks**: X uses sample data and shows **"Showing sample result"** in each of these cases:
  - the key is missing;
  - credits are used up;
  - the daily cap is reached;
  - the call fails.
- Each source is labelled **"Live data"** or **"Demo data"**.
- X_COST_PER_POST_USD (default $0.005) records the X API cost for reference. Customers pay PRICE_PER_POST_USD.

### 5. Payment and LinkedIn
- Payment stays a mock window behind a payment adapter. **PAYMENT_MODE=mock** is the only supported value. Solana USDC can be added later without changing screens.
- **RECEIVER_WALLET_ADDRESS** and **SOLANA_RPC_URL** are added, left empty and unused.
- **LinkedIn** appears on Sources as a disabled row tagged "Coming soon". It has no data and is not selectable. It is also added to the roadmap section and the Roadmap page.

### 6. Secrets, docs, GitHub
- These variables are defined on the server only, with safe defaults and no real values: GEMINI_API_KEY, GEMINI_MODEL, X_BEARER_TOKEN, X_INCLUDE_AUTHOR_METRICS, X_COST_PER_POST_USD, X_COST_PER_AUTHOR_USD, PRICE_PER_POST_USD, MAX_POSTS_PER_RUN, DAILY_X_POST_CAP, PAYMENT_MODE, RECEIVER_WALLET_ADDRESS, SOLANA_RPC_URL.
- Keys never reach the browser, the logs or the repository.
- Every file is searched for hard-coded secrets, and any found are removed.
- The repository gets four new files:
  - **.gitignore**: excludes .env, node_modules and build output.
  - **.env.example**: variable names only.
  - **LICENSE**: MIT.
  - **README**, covering:
    - the description;
    - features (Launch mode and Researcher mode);
    - "How AI is used": each task, the model and its prompt file;
    - "Demo mode": the sample data and the mocked payment;
    - setup and run steps.
- **GitHub**: this agent cannot push to GitHub directly. The project is pushed with the platform's **"Save to GitHub"** button in the chat. Choose a new public repository named `audience-radar`, branch `main`, and the message "Audience Radar demo". The final summary repeats these exact steps.

## User flow
1. Landing page, then "Start a run".
2. Describe the product or niche (up to 1,000 characters). Choose Launch or Researcher mode. In Researcher mode, pick a role or type one.
3. Pick one of the 3 audience cards, or refine to get 3 new ones.
4. Pick sources and set "Posts to search on X". The cost updates live. LinkedIn shows as "Coming soon".
5. Mock payment, then confirmation.
6. Results:
   - Launch mode: radar rows and hot keywords.
   - Researcher mode: "Best places to reach your audience" with "Copy summary".
7. The launch kit, then copy, download or share.
8. History.

## UI/UX feel
- The same name, logo, colours, fonts, hover effects and hero motion, in light and dark mode, on mobile and desktop.
- New elements follow the current style:
  - the post-count field with its +/− buttons;
  - the role free-text field;
  - the "Coming soon" row;
  - the "Live AI" / "Sample" and "Live data" / "Demo data" labels;
  - the "AI-generated. Check before posting." note.
- All new buttons are at least 44px tall and every field has a label. Fallbacks appear as quiet labels, never as error screens.

## Implementation phases
**Phase 1 — MVP (built now)**
- Everything under "Missing or different" above: Researcher mode, live Gemini with its limits, keyword changes, live X with the post count and caps, the payment adapter, the LinkedIn placeholder, the variables, the secrets sweep and the docs.

**Phase 2**
- Real Solana USDC payment through the payment adapter.
- A live LinkedIn source on an official API.
- Threshold tuning based on real X data.

**Phase 3**
- Live Telegram, Reddit and YouTube sources.
- Prepaid credits.

## Assumptions
- **No Gemini key**: every AI step uses sample answers labelled "Sample". The Emergent LLM key is no longer used.
- **Daily X cap**: shared by the whole app. Once 500 posts have been fetched in a day (UTC), every run uses sample X data until the next day.
- **Per-browser AI limit**: counted per browser, using its browser ID together with its network address, and resets daily (UTC). Cached answers do not count.
- **Cache**: identical requests (same task and same input) reuse the earlier answer for 24 hours.
- **Pricing**:
  - The customer pays N × PRICE_PER_POST_USD ($0.01). The default 50 posts costs $0.50, and 100 posts costs $1.00.
  - The author add-on, when enabled, is X_COST_PER_AUTHOR_USD per post searched.
  - The landing-page pricing table is updated to these numbers.
- **Demo X sample**: without a key, X uses the first N posts of the bundled sample, so the sample size matches the chosen number. X still shows High for the crypto trader example.
- **Keyword ranking**: live X data defaults to raw engagement, because author data is off by default. Bundled sample data keeps its current method.
- **AI keyword step**: the old AI clean-up of keywords is removed. Keywords now come only from server code.
- **Past runs**: runs saved as "Creator" are shown as "Researcher". Old "Designer" roles are shown as they were saved.
- **"Copy summary"** copies the title, the description and each ranked row (platform, label, sample size, "Estimate", reason, best way to show up) as plain text.
- **Over-limit post count**: the server refuses a request above MAX_POSTS_PER_RUN, and the Sources screen explains the limit. The daily cap never blocks a run; it switches X to sample data.
- **Your Gemini key**: you add GEMINI_API_KEY (and optionally X_BEARER_TOKEN) through the secure key card at the end of the build. Until then, everything runs on sample data.
