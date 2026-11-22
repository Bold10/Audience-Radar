import { Database } from "lucide-react";
import { unitLabel } from "@/lib/api";

const LEVEL = { High: 3, Medium: 2, Low: 1 };

export const InterestBars = ({ label, size = 22 }) => {
  const lvl = LEVEL[label] || 0;
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" role="img" aria-label={`${label} interest, ${lvl} of 3 bars`}>
      {[0, 1, 2].map((i) => {
        const h = 7 + i * 6;
        const on = i < lvl;
        return (
          <rect key={i} x={1 + i * 7.5} y={21 - h} width="5" height={h} rx="1.5"
            style={{ fill: on ? "var(--accent)" : "transparent", stroke: on ? "var(--accent)" : "var(--muted-text)" }} strokeWidth="1.2" />
        );
      })}
    </svg>
  );
};

export const InterestLabel = ({ label, testid }) => (
  <span className="inline-flex items-center gap-2" data-testid={testid}>
    <InterestBars label={label} />
    <span className="font-display text-lg font-semibold">{label}</span>
  </span>
);

export const EstimateMeta = ({ sample, unit, testid }) => (
  <span className="inline-flex flex-wrap items-center gap-2 text-sm text-soft" data-testid={testid}>
    <span>Sample: {unitLabel(sample, unit)}</span>
    <span aria-hidden>·</span>
    <span className="rounded-full border border-line px-2 py-0.5 text-xs font-semibold uppercase tracking-wider">Estimate</span>
  </span>
);

export const DemoBadge = () => (
  <span className="inline-flex items-center gap-1.5 rounded-full border border-ink px-3 py-1 text-xs font-semibold uppercase tracking-wider" data-testid="demo-data-badge">
    <Database size={13} /> Demo data
  </span>
);
