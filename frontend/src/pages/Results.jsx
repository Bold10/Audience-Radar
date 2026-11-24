import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowRight, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Page } from "@/components/Layout";
import { Stepper } from "@/components/Stepper";
import { AiSourceTag, DemoBadge, EstimateMeta, InterestLabel, SourceTag } from "@/components/Interest";
import { api, isResearcher, modeLabel, unitLabel } from "@/lib/api";
import { ShareControl } from "@/components/ShareControl";

export const RESEARCHER_TITLE = "Best places to reach your audience";

export const SourceRows = ({ rows }) => (
  <ul className="space-y-3" data-testid="results-source-list">
    {rows.map((r) => (
      <li key={r.id} className="card-ar grid items-center gap-3 p-5 sm:grid-cols-[1fr_auto_1.2fr]" data-testid={`result-row-${r.id}`}>
        <span className="flex flex-wrap items-center gap-2 font-display text-2xl font-semibold">{r.name} <SourceTag live={r.live} fallback={r.fallback} testid={`result-tag-${r.id}`} /></span>
        <InterestLabel label={r.label} testid={`result-label-${r.id}`} />
        <span className="sm:text-right"><EstimateMeta sample={r.sample_size} unit={r.unit} testid={`result-meta-${r.id}`} /></span>
      </li>
    ))}
  </ul>
);

export const Keywords = ({ words }) => (
  <section className="mt-12" data-testid="hot-keywords-section">
    <h2 className="font-display text-2xl font-semibold">Hot keywords</h2>
    <p className="mt-1 text-sm text-soft">Words over-represented in each source's top 20% of posts by engagement. Keywords only, no post text.</p>
    <div className="mt-5 flex flex-wrap gap-2">
      {words.map((k, i) => <span key={k} className="chip" data-testid={`hot-keyword-${i}`}>{k}</span>)}
    </div>
  </section>
);

export const rankingItems = (res) => res.researcher_ranking || res.creator_ranking || [];

const summaryText = (run) => [
  RESEARCHER_TITLE, `For: ${run.description}`, `${modeLabel(run)} · Audience: ${run.audience.name}`, "",
  ...rankingItems(run.results).map((it, i) =>
    `${i + 1}. ${it.name}: ${it.community}\n   Interest: ${it.label} (Estimate, ${unitLabel(it.sample_size, it.unit)})\n   Why: ${it.reason}\n   Best way to show up: ${it.show_up || it.format}`),
].join("\n");

export const CopySummary = ({ run }) => (
  <button type="button" className="btn-ghost" data-testid="copy-summary-button" onClick={async () => {
    try { await navigator.clipboard.writeText(summaryText(run)); toast.success("Summary copied"); }
    catch { toast.error("Copy is blocked in this browser."); }
  }}>
    <Copy size={16} /> Copy summary
  </button>
);

export const ResearcherList = ({ items }) => (
  <ol className="space-y-3" data-testid="researcher-ranking-list">
    {items.map((it, i) => (
      <li key={`${it.platform}-${i}`} className="card-ar grid gap-4 p-5 md:grid-cols-[auto_1fr_auto]" data-testid={`researcher-rank-${i}`}>
        <span className="w-14 font-display text-4xl font-bold text-brand tabular-nums" aria-label={`Rank ${i + 1}`}>{String(i + 1).padStart(2, "0")}</span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-soft">{it.name}</p>
          <p className="font-display text-xl font-semibold">{it.community}</p>
          <p className="mt-1 text-sm text-soft">{it.reason}</p>
          <p className="mt-3 text-sm"><span className="font-semibold">Best way to show up:</span> {it.show_up || it.format}</p>
        </div>
        <div className="flex flex-col gap-2 md:items-end">
          <InterestLabel label={it.label} testid={`researcher-label-${i}`} />
          <EstimateMeta sample={it.sample_size} unit={it.unit} />
        </div>
      </li>
    ))}
  </ol>
);

export const ResearcherResults = ({ run }) => (
  <>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <AiSourceTag source={run.results.ranking_source || "sample"} testid="ranking-ai-source" />
      <CopySummary run={run} />
    </div>
    <ResearcherList items={rankingItems(run.results)} />
  </>
);

export default function Results() {
  const { runId } = useParams();
  const [run, setRun] = useState(null);
  useEffect(() => { api.get(`/runs/${runId}`).then((r) => setRun(r.data)).catch(() => setRun(false)); }, [runId]);

  if (run === false) return <Navigate to="/history" replace />;
  if (!run) return <Page><Loader2 className="animate-spin" /></Page>;
  if (run.status !== "paid") return <Navigate to={`/app/pay/${runId}`} replace />;
  const res = run.results;
  const researcher = isResearcher(run.mode);

  return (
    <Page testid="results-page">
      <Stepper current={4} />
      <div className="flex flex-wrap items-center gap-3">
        <DemoBadge demo={res.demo !== false} />
        <span className="text-sm text-soft">{researcher ? modeLabel(run) : "Launch mode"} · {run.audience.name}</span>
      </div>
      <h1 className="mt-4 font-display text-4xl font-bold sm:text-5xl">{researcher ? RESEARCHER_TITLE : "Your audience radar"}</h1>
      <p className="mt-4 max-w-2xl text-base text-soft md:text-lg">For “{run.description}”. {researcher ? "Platforms and communities only, never individual people. " : ""}Interest labels are estimates from sampled posts (volume plus median engagement), not knowledge of any platform's algorithm.</p>
      <div className="mt-10">{researcher ? <ResearcherResults run={run} /> : <SourceRows rows={res.sources} />}</div>
      <Keywords words={res.keywords} />
      <div className="mt-12 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start">
        <Link to={`/app/runs/${runId}/kit`} className="btn-primary" data-testid="open-launch-kit-button">Open launch kit <ArrowRight size={18} /></Link>
        <Link to="/history" className="btn-ghost" data-testid="results-history-link">View history</Link>
        <ShareControl runId={runId} />
      </div>
    </Page>
  );
}
