import { Link } from "react-router-dom";
import { ArrowRight, Coins, FileText, Gauge, Hash, Megaphone, Play, ShieldCheck, Video } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { InterestBars } from "@/components/Interest";
import { RoadmapColumns } from "@/components/RoadmapColumns";
import { RadarBackdrop } from "@/components/RadarBackdrop";
import { money, useConfig } from "@/lib/api";

const Section = ({ id, eyebrow, title, children }) => (
  <section id={id} className="mx-auto max-w-7xl scroll-mt-24 px-5 pt-24 md:px-8 md:pt-32" data-testid={`landing-${id}-section`}>
    <p className="eyebrow">{eyebrow}</p>
    <h2 className="mt-3 max-w-3xl font-display text-3xl font-bold sm:text-4xl">{title}</h2>
    <div className="mt-10">{children}</div>
  </section>
);

const PREVIEW = [["X", "High", "500 posts"], ["Telegram", "Medium", "40 channels"], ["YouTube", "Medium", "120 videos"], ["Reddit", "Low", "300 posts"]];

const RadarPreview = () => (
  <div className="card-ar fade-up p-6 md:p-8" style={{ animationDelay: "150ms" }} data-testid="hero-radar-preview">
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium">a portfolio tracker for crypto traders</span>
      <span className="rounded-full border border-ink px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider">Demo data</span>
    </div>
    <ul className="mt-6 divide-y divide-line">
      {PREVIEW.map(([n, l, s]) => (
        <li key={n} className="flex items-center justify-between py-4">
          <span className="font-display text-xl font-semibold">{n}</span>
          <span className="flex items-center gap-2"><InterestBars label={l} /><span className="w-16 font-semibold">{l}</span></span>
          <span className="hidden text-sm text-soft sm:block">{s} · Estimate</span>
        </li>
      ))}
    </ul>
  </div>
);

const Hero = () => (
  <section className="relative isolate pb-16 md:pb-20" data-testid="landing-hero">
    <RadarBackdrop />
  <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 pt-14 md:px-8 md:pt-24 lg:grid-cols-[1.15fr_1fr]">
    <div className="fade-up">
      <p className="eyebrow">Audience Radar</p>
      <h1 className="mt-4 font-display text-4xl font-bold leading-[1.02] sm:text-5xl lg:text-6xl">
        Know where your audience is, then <span className="text-brand">launch there.</span>
      </h1>
      <p className="mt-6 max-w-xl text-base text-soft md:text-lg">Describe your product or niche. We sample X, Telegram, Reddit and YouTube, estimate where interest is highest, and write a launch kit you can post today.</p>
      <div className="mt-9 flex flex-col gap-3 sm:flex-row">
        <Link to="/app" className="btn-primary text-base" data-testid="hero-start-run-button">Start a run <ArrowRight size={18} /></Link>
        <a href="#how" className="btn-ghost" data-testid="hero-how-button">How it works</a>
      </div>
    </div>
    <RadarPreview />
  </div>
  </section>
);

const VideoSlot = () => (
  <section className="mx-auto max-w-7xl px-5 pt-4 md:px-8" data-testid="landing-video-slot">
    <div className="flex aspect-video w-full flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-ink bg-surface">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-btn text-btnink"><Play size={26} /></span>
      <p className="font-display text-xl font-semibold">Demo video</p>
      <p className="text-sm text-soft">Coming soon. A 60-second walkthrough of a full run.</p>
    </div>
  </section>
);

const STEPS = [
  ["Describe", "Type your product or niche and pick a mode."],
  ["Confirm your audience", "Choose one of three AI-suggested audiences, or refine."],
  ["Pick sources, see the cost", "Free sources are $0. X is priced per sampled post."],
  ["Get your radar and kit", "Interest by platform, hot keywords and ready-to-post copy."],
];

const FEATURES = [
  [Gauge, "Interest estimates", "High, Medium or Low per source, with a 3-bar icon and the sample size every time."],
  [Hash, "Hot keywords", "The 8 words most over-represented in top-performing posts. Keywords only, never copied text."],
  [FileText, "Launch kit", "An X post, a Telegram message, a graphic card and a 30-second video script."],
  [Coins, "Pay per run", "No subscription and no account. Pay with crypto for exactly what you sample."],
  [ShieldCheck, "Official APIs only", "Live sources will use official platform APIs. No scraping, no auto-posting."],
  [Video, "Built for creators too", "Creator mode ranks platforms and communities with the best format for each."],
];

const FAQ = [
  ["Is this a guarantee of reach?", "No. Labels are estimates from a sample of recent posts: their volume and median engagement. We never claim to know how any platform's algorithm works."],
  ["What does demo mode mean?", "Every result uses bundled sample data for “a portfolio tracker for crypto traders”, so you can try the full flow with no keys and no real payment."],
  ["Why is X paid and the others free?", "X charges for API access per post, so we pass that cost through at a configurable price per post. Telegram, Reddit and YouTube cost $0."],
  ["Do you post for me?", "No. You copy or download the launch kit and post it yourself."],
  ["Do I need an account?", "No. Your runs are remembered in this browser under History."],
];

export default function Landing() {
  const cfg = useConfig();
  const price = cfg?.pricing.x_price_per_post ?? 0.005;
  const rows = [["X only, 500 posts", 500], ["X only, 1,000 posts", 1000], ["Telegram + Reddit + YouTube", 0], ["All four sources (500 X posts)", 500]];
  return (
    <div data-testid="landing-page">
      <Hero />
      <VideoSlot />
      <Section id="how" eyebrow="How it works" title="Four steps from idea to launch plan.">
        <ol className="grid gap-4 md:grid-cols-4">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="border-t-2 border-ink pt-5" data-testid={`how-step-${i}`}>
              <span className="font-display text-5xl font-bold text-brand">{i + 1}</span>
              <h3 className="mt-3 font-display text-xl font-semibold">{t}</h3>
              <p className="mt-2 text-sm text-soft">{d}</p>
            </li>
          ))}
        </ol>
      </Section>
      <Section id="modes" eyebrow="Two modes" title="Launching something, or building an audience?">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="card-ar p-8" data-testid="mode-card-launch">
            <Megaphone className="text-brand" size={30} />
            <h3 className="mt-5 font-display text-2xl font-semibold">I'm launching a product</h3>
            <p className="mt-3 text-soft">See which platforms show the most interest in your product category, the hot keywords to use, and a launch kit to post.</p>
          </div>
          <div className="card-ar p-8" data-testid="mode-card-creator">
            <Video className="text-brand" size={30} />
            <h3 className="mt-5 font-display text-2xl font-semibold">I'm a creator</h3>
            <p className="mt-3 text-soft">Video creator, writer, designer or other: get a ranked list of platforms and communities, each with a reason and the best content format.</p>
          </div>
        </div>
      </Section>
      <Section id="features" eyebrow="Features" title="Honest signals, ready-to-use copy.">
        <div className="grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(([Icon, t, d]) => (
            <div key={t}><Icon size={24} className="text-brand" /><h3 className="mt-4 font-display text-lg font-semibold">{t}</h3><p className="mt-2 text-sm text-soft">{d}</p></div>
          ))}
        </div>
      </Section>
      <Section id="pricing" eyebrow="Pricing" title="Pay per run. Only for what you sample.">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.3fr]">
          <div className="space-y-4 text-soft">
            <p>X posts cost <strong className="text-ink">${price}</strong> each. Telegram, Reddit and YouTube are free. Your total is shown before you pay, in crypto.</p>
            <p>No subscription, no account, no card payments.</p>
          </div>
          <table className="card-ar w-full overflow-hidden text-left text-sm" data-testid="pricing-table">
            <thead><tr className="border-b border-line"><th className="p-4 font-semibold">Example run</th><th className="p-4 text-right font-semibold">Cost</th></tr></thead>
            <tbody>
              {rows.map(([l, n]) => (
                <tr key={l} className="border-b border-line last:border-0"><td className="p-4">{l}</td><td className="p-4 text-right font-display text-lg font-semibold tabular-nums">{money(n * price)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      <Section id="roadmap" eyebrow="Roadmap" title="Where Audience Radar is heading.">
        <RoadmapColumns />
        <Link to="/roadmap" className="btn-ghost mt-8" data-testid="landing-roadmap-link">Full roadmap <ArrowRight size={16} /></Link>
      </Section>
      <Section id="faq" eyebrow="FAQ" title="Questions, answered plainly.">
        <Accordion type="single" collapsible className="max-w-3xl">
          {FAQ.map(([q, a], i) => (
            <AccordionItem key={q} value={`q${i}`} className="border-line">
              <AccordionTrigger className="min-h-[56px] text-left font-display text-lg" data-testid={`faq-trigger-${i}`}>{q}</AccordionTrigger>
              <AccordionContent className="text-base text-soft">{a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Section>
    </div>
  );
}
