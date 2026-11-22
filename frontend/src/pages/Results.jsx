import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import { Page } from "@/components/Layout";
import { Stepper } from "@/components/Stepper";
import { DemoBadge, EstimateMeta, InterestLabel, SourceTag } from "@/components/Interest";
import { api } from "@/lib/api";

const SourceRows = ({ rows }) => (
  <ul className="space-y-3" data-testid="results-source-list">
    {rows.map((r) => (
      <li key={r.id} className="card-ar grid items-center gap-3 p-5 sm:grid-cols-[1fr_auto_1.2fr]" data-testid={`result-row-${r.id}`}>
        <span className="flex items-center gap-2 font-display text-2xl font-semibold">{r.name} <SourceTag live={r.live} testid={`result-tag-${r.id}`} /></span>
        <InterestLabel label={r.label} testid={`result-label-${r.id}`} />
        <span className="sm:text-right"><EstimateMeta sample={r.sample_size} unit={r.unit} testid={`result-meta-${r.id}`} /></span>
      </li>
    ))}
  </ul>
);

const Keywords = ({ words }) => (
  <section className="mt-12" data-testid="hot-keywords-section">
    <h2 className="font-display text-2xl font-semibold">Hot keywords</h2>
    <p className="mt-1 text-sm text-soft">Words over-represented in top-performing posts (top 20% by engagement relative to followers). Keywords only, no post text.</p>
    <div className="mt-5 flex flex-wrap gap-2">
      {words.map((k, i) => <span key={k} className="chip" data-testid={`hot-keyword-${i}`}>{k}</span>)}
    </div>
  </section>
);

const CreatorList = ({ items }) => (
  <ol className="space-y-3" data-testid="creator-ranking-list">
    {items.map((it, i) => (
      <li key={`${it.platform}-${i}`} className="card-ar grid gap-4 p-5 md:grid-cols-[auto_1fr_auto]" data-testid={`creator-rank-${i}`}>
        <span className="w-14 font-display text-4xl font-bold text-brand tabular-nums" aria-label={`Rank ${i + 1}`}>{String(i + 1).padStart(2, "0")}</span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-soft">{it.name}</p>
          <p className="font-display text-xl font-semibold">{it.community}</p>
          <p className="mt-1 text-sm text-soft">{it.reason}</p>
          <p className="mt-3 text-sm"><span className="font-semibold">Best format:</span> {it.format}</p>
        </div>
        <div className="flex flex-col gap-2 md:items-end">
          <InterestLabel label={it.label} testid={`creator-label-${i}`} />
          <EstimateMeta sample={it.sample_size} unit={it.unit} />
        </div>
      </li>
    ))}
  </ol>
);

export default function Results() {
  const { runId } = useParams();
  const [run, setRun] = useState(null);
  useEffect(() => { api.get(`/runs/${runId}`).then((r) => setRun(r.data)).catch(() => setRun(false)); }, [runId]);

  if (run === false) return <Navigate to="/history" replace />;
  if (!run) return <Page><Loader2 className="animate-spin" /></Page>;
  if (run.status !== "paid") return <Navigate to={`/app/pay/${runId}`} replace />;
  const res = run.results;
  const creator = run.mode === "creator";

  return (
    <Page testid="results-page">
      <Stepper current={4} />
      <div className="flex flex-wrap items-center gap-3">
        <DemoBadge demo={res.demo !== false} />
        <span className="text-sm text-soft">{creator ? `Creator · ${run.role}` : "Launch mode"} · {run.audience.name}</span>
      </div>
      <h1 className="mt-4 font-display text-4xl font-bold sm:text-5xl">{creator ? "Where to publish" : "Your audience radar"}</h1>
      <p className="mt-4 max-w-2xl text-base text-soft md:text-lg">For “{run.description}”. Interest labels are estimates from sampled posts (volume plus median engagement), not knowledge of any platform's algorithm.</p>
      <div className="mt-10">{creator ? <CreatorList items={res.creator_ranking} /> : <SourceRows rows={res.sources} />}</div>
      <Keywords words={res.keywords} />
      <div className="mt-12 flex flex-col gap-3 sm:flex-row">
        <Link to={`/app/runs/${runId}/kit`} className="btn-primary" data-testid="open-launch-kit-button">Open launch kit <ArrowRight size={18} /></Link>
        <Link to="/history" className="btn-ghost" data-testid="results-history-link">View history</Link>
      </div>
    </Page>
  );
}
