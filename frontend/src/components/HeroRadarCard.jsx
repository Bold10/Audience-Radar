import { useEffect, useRef, useState } from "react";
import { InterestBars } from "@/components/Interest";

const SOURCES = [["X", "posts"], ["Telegram", "channels"], ["YouTube", "videos"], ["Reddit", "posts"]];
// Crypto traders mirrors the real demo results; the others are illustrative examples.
const AUDIENCES = [
  { word: "crypto traders", demo: true, rows: [["High", 500], ["Medium", 40], ["Medium", 120], ["Low", 300]] },
  { word: "writers", rows: [["Medium", 420], ["Low", 25], ["Medium", 90], ["High", 350]] },
  { word: "developers", rows: [["High", 480], ["Medium", 35], ["Medium", 110], ["High", 400]] },
  { word: "researchers", rows: [["Medium", 300], ["Low", 20], ["Low", 60], ["Medium", 250]] },
  { word: "enthusiasts", rows: [["Medium", 450], ["High", 55], ["High", 140], ["Medium", 320]] },
];
const HOLD_MS = 3000;

const useReducedMotion = () => {
  const [reduced, setReduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = (e) => setReduced(e.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
};

const RotatingWord = ({ idx, prev }) => (
  <span className="relative block h-[1.35em] overflow-hidden" aria-hidden>
    {prev !== null && <span key={`out-${prev}`} className="word-out absolute inset-x-0 top-0">{AUDIENCES[prev].word}</span>}
    <span key={`in-${idx}`} className={`absolute inset-x-0 top-0 ${prev !== null ? "word-in" : ""}`} data-testid="hero-rotating-word">
      {AUDIENCES[idx].word}
      <span className="ellipsis" data-testid="hero-rotating-ellipsis"><span>.</span><span>.</span><span>.</span></span>
    </span>
  </span>
);

export const HeroRadarCard = () => {
  const reduced = useReducedMotion();
  const [idx, setIdx] = useState(0);
  const [prev, setPrev] = useState(null);
  const [paused, setPaused] = useState(false);
  const idxRef = useRef(0);

  useEffect(() => {
    if (reduced) { idxRef.current = 0; setIdx(0); setPrev(null); return undefined; }
    if (paused) return undefined;
    const t = setInterval(() => {
      const next = (idxRef.current + 1) % AUDIENCES.length;
      setPrev(idxRef.current);
      idxRef.current = next;
      setIdx(next);
    }, HOLD_MS);
    return () => clearInterval(t);
  }, [paused, reduced]);

  const a = AUDIENCES[idx];
  return (
    <div className="card-ar fade-up p-6 outline-none focus-visible:ring-2 focus-visible:ring-btn focus-visible:ring-offset-2 focus-visible:ring-offset-ground md:p-8" style={{ animationDelay: "150ms" }} tabIndex={0}
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}
      aria-label="Example radar card, demo data: interest estimates on X, Telegram, YouTube and Reddit for a portfolio tracker aimed at different audiences."
      data-testid="hero-radar-preview">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full border border-ink px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider" data-testid="hero-demo-badge">Demo data</span>
        <span key={`note-${idx}`} className={`text-xs text-soft ${prev !== null ? "row-in" : ""}`} aria-hidden data-testid="hero-example-note">{a.demo ? "Demo results" : "Illustrative example"}</span>
      </div>
      <p className="mt-5 text-sm font-medium" aria-hidden>a portfolio tracker for</p>
      <div className="mt-1 font-display text-2xl font-bold text-brand md:text-[28px]"><RotatingWord idx={idx} prev={prev} /></div>
      <ul className="mt-4 divide-y divide-line" aria-hidden>
        {SOURCES.map(([name, unit], i) => {
          const [label, size] = a.rows[i];
          return (
            <li key={name} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 py-4 sm:grid-cols-[1fr_auto_auto]" data-testid={`hero-row-${name.toLowerCase()}`}>
              <span className="font-display text-xl font-semibold">{name}</span>
              <span key={`${idx}-l`} className={`flex items-center gap-2 ${prev !== null ? "row-in" : ""}`}>
                <InterestBars label={label} /><span className="w-16 font-semibold">{label}</span>
              </span>
              <span key={`${idx}-s`} className={`col-span-2 text-sm text-soft sm:col-span-1 sm:w-40 sm:text-right ${prev !== null ? "row-in" : ""}`}>
                {size.toLocaleString()} {unit} · Estimate
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
