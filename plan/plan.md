# Audience Radar: Share Links, Email Code Sign-up, Keyword Copy and Editable Card

This update adds four things. Any run can be shared as a read-only link. Visitors can sign up with a Gmail address and a one-time code. The launch kit gets a keywords-only section for writing your own posts, and the graphic card can be downloaded as an editable SVG.

## Who it's for
- **Run owners**: makers and creators who want to show their radar and launch kit to a team.
- **Teammates**: people who open a shared link and only need to read, copy and download.
- **Returning users**: people who want their runs to follow them to any device.

## Core features and experience

### Shareable radar link
- A **"Share"** button on the Results page and on the Launch kit page.
- It creates a private, hard-to-guess link and copies it to the clipboard. The link is also shown so it can be copied by hand.
- **Anyone with the link** can open it without signing up.
- The shared page is **read-only** and shows the full run:
  - The results: radar rows or creator ranking, plus hot keywords.
  - The launch kit: X post, Telegram message, graphic card and video script.
- Viewers can still use Copy and Download on each kit item, including the full kit.
- Viewers cannot pay, refine, or regenerate anything. They do not see payment details or who made the run.
- The "Demo data" badge, "Estimate" labels and sample sizes appear on the shared page just as they do for the owner.
- The owner can **stop sharing**, which turns the link off. Sharing again creates a new link.
- Shared pages carry a small "Shared from Audience Radar" note with a "Start your own run" button.

### Sign up with a Gmail code
- **"Sign up"** and **"Sign in"** buttons in the header.
- You enter a Gmail address and receive a **one-time code** by email. Enter the code and you are signed in. There is no password and no "Continue with Google" button yet.
- **Only Gmail addresses** (@gmail.com and @googlemail.com) are accepted. Other addresses get a clear message explaining that only Gmail is supported for now.
- **Signing up is optional.** Runs work exactly as they do today without an account.
- When you are signed in:
  - New runs are saved to your account.
  - Runs already made in this browser are added to your account automatically on first sign-in.
  - History "My runs" shows your account's runs on any device.
- The header shows a small account menu with your email and **Sign out**.

### Keywords-only section in the launch kit
- Directly under the X post: a **"Hot keywords"** block showing only the 8 keywords as chips.
- **Click a chip** to copy that single keyword. A brief "Copied" confirmation appears.
- A **"Copy all keywords"** button copies them all on one line, separated by spaces, so they can be pasted into your own post.
- The block contains keywords only, never post text, which keeps the existing rule.

### Editable graphic card (SVG)
- Next to the current download, a new **"Download editable SVG"** button on the graphic card.
- The SVG keeps the headline, subline and keyword chips as **real, editable text and shapes**, with the logo mark as a separate image layer.
- It opens in Figma, Illustrator, Inkscape or Canva for personal edits.
- The PNG download stays as it is.
- The full-kit zip includes the SVG as well as the PNG.

## User flow
1. A visitor completes a run as today, signed in or not.
2. On Results or the Launch kit, they click **Share**, and the link is copied.
3. A teammate opens the link and sees the read-only results and kit. They copy keywords, download the card or the full kit.
4. The owner can click **Stop sharing** at any time.
5. Optionally, a visitor clicks **Sign up**, enters a Gmail address, types the emailed code and is signed in. Their earlier browser runs now appear under History on any device.
6. In the launch kit, the user copies single keywords or all of them from the block under the X post. They download the editable SVG card for their own design work.

## UI/UX feel
- The same warm, editorial look, colours, fonts and hover effects as now, in light and dark mode, on mobile and desktop.
- Shared pages look like the owner's view without the action buttons that change things. A thin "Read-only shared view" bar sits at the top.
- The sign-in and sign-up screens use the app's colours and fonts, centred, and readable in both themes.
- Keyword chips lift slightly on hover, show a copy icon, and confirm with a short "Copied" state.
- All new buttons are at least 44px tall, labelled, and usable by keyboard.

## Implementation phases

**Phase 1 — MVP (built now)**
- Share links: create, open read-only, stop sharing.
- Optional Gmail-only sign-up and sign-in with an emailed one-time code. Runs are saved to the account, and existing browser runs are added on first sign-in.
- The keywords-only block with per-keyword copy and "Copy all".
- The editable SVG export of the graphic card, also included in the full-kit zip.

**Phase 2**
- "Continue with Google" sign-in.
- See who opened a shared link, and when.
- Optional expiry date on share links.

**Phase 3**
- Team spaces where several accounts see the same runs.
- Comments on a shared run.

## Assumptions
- **Email code sign-in** uses the platform's managed sign-in service, so codes are sent for you and no email setup is needed.
- **Gmail-only rule**: @gmail.com and @googlemail.com are allowed. A non-Gmail address may still receive a code, but the app refuses to use that account and asks for a Gmail address instead.
- **Earlier runs**: runs made in the same browser before signing up are moved into the account automatically. Runs from other browsers stay where they are.
- **History tabs**: "My runs" shows account runs when signed in, and this browser's runs when not. "All runs" stays as it is today.
- **Sharing who**: any run's owner can share it. The owner is the account that made it, or the same browser for runs made without an account. Unpaid runs cannot be shared.
- **Launch kit on sharing**: if the kit has not been written yet when the owner shares, it is written at that moment. Teammates opening the link never trigger new AI writing.
- **Share link format**: one active link per run. Stopping and re-sharing makes a new link, and the old one stops working.
- **Shared page privacy**: shared pages are hidden from search engines and do not show payment transaction details.
- **SVG fonts**: the SVG names Space Grotesk and Inter. If those fonts are not installed on the editing computer, the design tool substitutes a similar font until they are added.
- **Only the SVG was chosen**, so the card stays at its current 1200×630 size. No extra square or story sizes and no high-resolution PNG are added.
- **Live data keys** for X, Reddit and YouTube remain unset, so those sources stay on sample data. This update does not change that.
