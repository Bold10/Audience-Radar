import { ROADMAP } from "@/pages/roadmapData";

export const RoadmapColumns = () => (
  <div className="grid gap-4 md:grid-cols-3" data-testid="roadmap-columns">
    {ROADMAP.map((c, i) => (
      <div key={c.phase} className={`card-ar p-6 ${i === 0 ? "!border-ink" : ""}`} data-testid={`roadmap-col-${c.phase.toLowerCase()}`}>
        <p className="eyebrow">{c.phase}</p>
        <h3 className="mt-2 font-display text-2xl font-semibold">{c.title}</h3>
        <ul className="mt-5 space-y-3 text-sm">
          {c.items.map((it) => (
            <li key={it} className="flex gap-3"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" aria-hidden />{it}</li>
          ))}
        </ul>
      </div>
    ))}
  </div>
);
