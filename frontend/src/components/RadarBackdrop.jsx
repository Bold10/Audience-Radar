const C = 600;
const R = 520;
const wedge = (deg) => {
  const a = (-deg * Math.PI) / 180;
  return `M${C} 400 L${C + R} 400 A${R} ${R} 0 0 0 ${C + R * Math.cos(a)} ${400 + R * Math.sin(a)} Z`;
};
// Blips sit in the hero's top/bottom padding strips so they never overlap text.
const BLIPS = [
  { left: "7%", top: 18, d: 0 }, { left: "31%", top: 34, d: 1.4 }, { left: "58%", top: 12, d: 2.6 },
  { left: "86%", top: 38, d: 0.8 }, { left: "15%", bottom: 22, d: 3.3 }, { left: "49%", bottom: 34, d: 2.0 },
  { left: "79%", bottom: 14, d: 4.1 },
];

export const RadarBackdrop = () => (
  <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden data-testid="hero-radar-backdrop">
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
      {[140, 260, 380, 500].map((r, i) => (
        <circle key={r} className="radar-ring" cx={C} cy="400" r={r} fill="none" strokeWidth="1.5"
          style={{ animationDelay: `${-i * 2.25}s` }} />
      ))}
      <g className="radar-sweep">
        <path className="radar-wedge" d={wedge(34)} />
        <path className="radar-wedge" d={wedge(20)} />
        <path className="radar-wedge" d={wedge(8)} />
        <line className="radar-line" x1={C} y1="400" x2={C + R} y2="400" strokeWidth="1.5" />
      </g>
    </svg>
    {BLIPS.map((b, i) => (
      <span key={i} className="radar-blip" style={{ left: b.left, top: b.top, bottom: b.bottom, animationDelay: `${b.d}s` }} />
    ))}
  </div>
);
