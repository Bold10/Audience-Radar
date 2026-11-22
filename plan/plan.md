# Audience Radar: Rotating Niche in the Hero Card

The radar card in the landing-page hero says "a portfolio tracker for crypto traders". The words "crypto traders" will cycle through other audiences in a slide-up animation, and the card's radar rows will change to match each one.
The card stays labelled as demo data throughout.

## Who it's for
- Visitors on the landing page. They should see that Audience Radar works for many audiences, not only crypto.

## Core features and experience
- **Rotating audience words**: the phrase reads "a portfolio tracker for **[audience]**". The audience part cycles in this order: crypto traders → writers → developers → researchers → enthusiasts, then starts again.
- **Slide up and fade**: the current word slides up and fades out while the next word slides in from below. Each word stays on screen for about 3 seconds.
- **Colour**: the rotating words are #E5482D.
- **Trailing dots**: an animated ellipsis ("…") follows the rotating words. The three dots pulse one after another, also in #E5482D.
- **Rows change with each audience**: the X, Telegram, YouTube and Reddit rows change their High / Medium / Low level, 3-bar icon and sample size for each audience. Every row keeps the word "Estimate".
  - Crypto traders: X High (500 posts), Telegram Medium (40 channels), YouTube Medium (120 videos), Reddit Low (300 posts). These are the existing demo results.
  - The other four audiences get made-up example levels.
- **Honest labelling**: the "Demo data" badge stays on the card. The example rows for the other audiences are marked as illustrative.
- **Smooth row changes**: the bars and labels fade or slide into their new values at the same moment the words change. The card keeps its size, so the page does not jump.
- **Pause on hover or focus**: the rotation pauses while the pointer is over the card or the card has keyboard focus.
- **Reduced motion**: when the system asks for reduced motion, nothing rotates or animates. The card shows the crypto traders version and the dots stay still.
- **Screen readers**: the changing words are not read out every few seconds. Screen readers hear a single stable sentence that describes the card.

## User flow
1. A visitor opens the landing page.
2. The hero card shows the crypto traders results first.
3. About every 3 seconds the audience words and the rows change to the next audience.
4. Hovering over the card pauses it. Clicking "Start a run" begins the normal flow, unchanged.

## UI/UX feel
- Quiet and confident. The motion stays slow so it does not compete with the headline.
- Works in light and dark mode, on mobile and desktop. Long words like "researchers" never overflow the card on a 390px-wide screen.
- The animated radar background and the button hover effects stay as they are.

## Implementation phases
**Phase 1 — MVP (built now)**
- Rotating, coloured audience words with slide-up-and-fade.
- Animated trailing dots.
- Rows that change per audience, with illustrative example values for the four new audiences.
- Pause on hover or focus, reduced-motion support and screen-reader handling.

**Phase 2**
- Make the audience list and the example rows editable in one settings file.
- Optionally pull each audience's rows from real recent runs instead of made-up values.

**Phase 3**
- Clicking an audience in the card starts a run with that audience already filled in.

## Assumptions
- **Your two row answers**: you picked both "Only the words change" and "Rows change with each niche". These conflict, so the plan uses "Rows change with each niche", which includes the words changing.
- **"Add a ……… to the end"**: read as an animated ellipsis after the rotating words, in the same colour.
- **Contrast**: #E5482D on the card's background is below the 4.5:1 contrast rule for normal-size text. To keep it readable, the audience words and dots will be larger and bold, which meets the rule for large text. Light mode uses #E5482D exactly as asked. Dark mode uses the dark-mode accent #FF6A4A, because #E5482D is too dim on the dark card.
- **Grammar**: the sentence stays "a portfolio tracker for [audience]" for every audience. Nothing else in the phrase changes.
- **Timing**: about 3 seconds per audience, with an animation of about 0.5 seconds.
- **Sample sizes**: the made-up example audiences use round, believable sample sizes in the same units (posts, channels, videos).
- **Live data keys**: you skipped adding the X, Reddit and YouTube keys. Those sources stay on sample data until keys are added. This change does not affect that.
