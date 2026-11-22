import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, Eye, Loader2 } from "lucide-react";
import { Page } from "@/components/Layout";
import { DemoBadge } from "@/components/Interest";
import { KitView } from "@/components/KitView";
import { CreatorList, Keywords, SourceRows } from "@/pages/Results";
import { api, fmtDate } from "@/lib/api";

const useNoIndex = () => useEffect(() => {
  const m = document.createElement("meta");
  m.name = "robots";
  m.content = "noindex, nofollow";
  document.head.appendChild(m);
  return () => m.remove();
}, []);

const SharedFooter = () => (
  <div className="card-ar mt-16 flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center" data-testid="shared-footer-note">
    <p className="text-sm"><span className="font-semibold">Shared from Audience Radar.</span> Know where your audience is, then launch there.</p>
    <Link to="/app" className="btn-primary" data-testid="shared-start-own-run-button">Start your own run <ArrowRight size={18} /></Link>
  </div>
);

export default function SharedRun() {
  const { token } = useParams();
  const [run, setRun] = useState(null);
  useNoIndex();
  useEffect(() => { api.get(`/shared/${token}`).then((r) => setRun(r.data)).catch(() => setRun(false)); }, [token]);

  if (run === false) {
    return (
      <Page testid="shared-not-found" narrow>
        <h1 className="font-display text-4xl font-bold">This link is not active</h1>
        <p className="mt-4 text-soft">The owner may have stopped sharing it.</p>
        <Link to="/app" className="btn-primary mt-8" data-testid="shared-not-found-start-button">Start your own run</Link>
      </Page>
    );
  }
  if (!run) return <Page><Loader2 className="animate-spin" /></Page>;
  const creator = run.mode === "creator";

  return (
    <>
      <div className="border-b border-line bg-surface" data-testid="shared-readonly-bar">
        <p className="mx-auto flex max-w-6xl items-center gap-2 px-5 py-2 text-sm font-medium md:px-8"><Eye size={15} /> Read-only shared view</p>
      </div>
      <Page testid="shared-run-page">
        <div className="flex flex-wrap items-center gap-3">
          <DemoBadge demo={run.results.demo !== false} />
          <span className="text-sm text-soft">{creator ? `Creator · ${run.role}` : "Launch mode"} · {run.audience.name} · {fmtDate(run.created_at)}</span>
        </div>
        <h1 className="mt-4 font-display text-4xl font-bold sm:text-5xl">{creator ? "Where to publish" : "Audience radar"}</h1>
        <p className="mt-4 max-w-2xl text-base text-soft md:text-lg">For “{run.description}”. Interest labels are estimates from sampled posts, not knowledge of any platform's algorithm.</p>
        <div className="mt-10">{creator ? <CreatorList items={run.results.creator_ranking} /> : <SourceRows rows={run.results.sources} />}</div>
        <Keywords words={run.results.keywords} />
        <h2 className="mb-6 mt-16 font-display text-3xl font-bold">Launch kit</h2>
        <KitView kit={run.kit} />
        <SharedFooter />
      </Page>
    </>
  );
}
