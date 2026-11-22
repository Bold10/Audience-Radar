# Audience Radar — Build Plan

"Know where your audience is, then launch there."
A web app that estimates which platforms (X, Telegram, Reddit, YouTube) care most about a product or niche, then writes a ready-to-post launch kit. Version 1 runs in demo mode on bundled sample data, so the whole flow works without data-source keys or real payments.

## Who it's for
- **Product launchers**: indie makers and small teams deciding where to announce a product.
- **Creators**: video creators, writers, designers and others choosing which platforms and communities to publish in for their niche.

## Core features and experience
- **Two modes**, set by a toggle on the first screen: "I'm launching a product" and "I'm a creator". Creator mode adds a role selector: Video creator, Writer, Designer, Other.
- **Audience wizard**: the AI suggests 3 audience definitions as selectable cards. "None of these, refine" asks for 3 new ones.
- **Sources and cost**: checkboxes for X (PAID), Telegram (FREE), Reddit (FREE) and YouTube (FREE), each showing its sample size. A cost box shows X posts × price per post (default $0.005, configurable), $0 for free sources, and the total.
- **Mock crypto payment**: a "Pay $X with crypto" button opens a mock payment window and then a mock confirmation. No money moves and there is no card option.
- **Launch results**: one row per source, each with an interest label (High / Medium / Low), a 3-bar level icon, the sample size and the word "Estimate". Below the rows are 8 "Hot keywords" chips.
- **Creator results**: a ranked list of platforms and communities, each with an interest label, a one-line reason and the best content format.
- **Launch kit**: an X post with hot keywords highlighted, a Telegram message, a graphic card preview, and a 30-second video script. Each piece has Copy and Download buttons, and "Download the full kit" saves everything at once.
- **History**: past runs with date, niche, mode and cost.
- **"Demo data" badge** on every results screen.
- **Landing page** with these sections: header, hero, a demo video slot, how it works in 4 steps, the two modes, features, pay-per-run pricing with an example cost table, a 3-column roadmap, FAQ and footer. There is also a separate **Roadmap page**.

### Scoring and honesty rules (configurable)
- **Interest score per source**: combines recent post volume with median engagement. Labels come from thresholds in one config file: High 66+, Medium 33–65, Low below 33.
- **Hot keywords**: posts are split into a top 20% (by engagement relative to the author's follower count) and the rest. The 8 words or hashtags most over-represented in the top group are returned. Only keywords are shown, never post text.
- Every label shows its sample size and the word "Estimate". The app never claims to know a platform's algorithm.
- Each data source sits behind its own module, and all modules share one interface. Demo modules read sample files. Future live modules will use official APIs only, with no scraping.

### AI layer
- Every AI step goes through one function, callModel(task, input). The four tasks are audience options, keyword extraction, creator ranking and launch kit writing.
- The provider and model come from settings. The default is Gemini Flash, run on the **Emergent LLM key**. Switching to OpenAI or Claude only needs a settings change.
- Prompts live in separate files. Data steps ask for structured JSON, and the answer is validated. If the AI is off or returns invalid output, the step falls back to the sample answer.

## User flow
1. Landing page → "Start a run".
2. Describe the product or niche, pick a mode (and a role in creator mode).
3. Choose one of 3 audience cards, or refine to get 3 new ones.
4. Pick data sources and review the cost.
5. Pay with crypto: mock window, then mock confirmation.
6. See the results: platform rows and keywords (launch mode) or a ranked platform list (creator mode).
7. Open the launch kit, then copy or download the pieces.
8. Look back at past runs in History.

## UI/UX feel
- Warm, editorial and confident. Light mode comes first. Dark mode follows the system setting and also has a manual toggle in the header. Solid colours only, no gradients.
- **Light**: ground #F4EFE6, surface #ECE6DA, text #1B1B1B, accent #E5482D, buttons #C93A20 with white text.
- **Dark**: ground #151311, surface #211E1B, text #F4EFE6, accent and buttons #FF6A4A with dark text.
- The accent colour is used only for graphics, highlights and large text. The button colour is used for primary buttons and small accent text.
- Space Grotesk for headings, Inter for body text. Rounded corners of about 16px and thin borders on cards.
- Interest is always shown with words plus bar icons, never colour alone. Contrast is at least 4.5:1, buttons are at least 44px tall, and every form field has a real label.
- The attached logos are used as supplied, not redrawn: the light version in light mode and the dark version in dark mode, in the header. The radar-eye mark is the basis for the favicon.
- Responsive layouts for mobile and desktop.

## Implementation phases
**Phase 1 — MVP (built now)**
- The landing page, the Roadmap page and all 8 app screens, in both modes, both themes, on mobile and desktop.
- Demo data source modules with sample data for "a portfolio tracker for crypto traders":
  - Audiences: Day traders, Long-term holders, NFT collectors.
  - Radar: X High (500 posts), Telegram Medium (40 channels), Reddit Low (300 posts), YouTube Medium.
  - Creator example: Video creator, crypto trading education.
- Configurable thresholds and price per post, the mock crypto payment and History.
- callModel running on Gemini Flash via the Emergent LLM key, with sample fallbacks.

**Phase 2**
- Live data source modules using official APIs (X, Telegram, Reddit, YouTube), with real sample sizes.
- Real crypto payment.
- Threshold tuning based on real data.

**Phase 3**
- Prepaid credits, Bitcoin, extra data sources and scheduling. All of these are out of scope for now.

## Assumptions
- **History**: you chose both options, so History has two tabs. "My runs" (the default) shows runs from this browser only. "All runs" shows every visitor's runs. No accounts are needed.
- **AI on custom input**: with the AI on, a description other than the sample still gets AI-written audience cards, rankings and launch kits. Platform figures always come from sample data in demo mode, and the "Demo data" badge stays visible.
- **AI usage cost**: AI usage is billed to your Emergent LLM key balance. A setting can turn AI off so everything uses sample answers.
- **Graphic card**: generated in the app as a branded card (headline plus keywords), downloadable as an image. It is not AI image generation.
- **Video script**: delivered as text. No video is produced.
- **Full kit download**: a single zip file holding the text pieces and the card image.
- **Demo video slot**: a labelled placeholder on the landing page until a video is supplied.
- **Pricing table**: example costs are worked out from the configurable price per post (for example, 500 X posts = $2.50; free sources = $0).
- **YouTube sample size**: shown in videos. Telegram is shown in channels and the others in posts.
