import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Page } from "@/components/Layout";
import { Stepper } from "@/components/Stepper";
import { DemoBadge } from "@/components/Interest";
import { KitView } from "@/components/KitView";
import { ShareControl } from "@/components/ShareControl";
import { api } from "@/lib/api";

export default function Kit() {
  const { runId } = useParams();
  const [kit, setKit] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.post(`/runs/${runId}/kit`).then((r) => setKit(r.data)).catch(() => setError(true));
  }, [runId]);

  if (error) return <Page><p>Could not load the launch kit. <Link className="underline" to={`/app/runs/${runId}`}>Back to results</Link></p></Page>;
  if (!kit) return <Page testid="kit-loading"><Stepper current={5} /><p className="flex items-center gap-3 text-soft"><Loader2 className="animate-spin" /> Writing your launch kit…</p></Page>;

  return (
    <Page testid="kit-page">
      <Stepper current={5} />
      <div className="flex flex-wrap items-center gap-3"><DemoBadge demo={kit.demo !== false} /><span className="text-sm text-soft">{kit.source === "ai" ? "Written by AI" : "Sample copy"}</span></div>
      <div className="mt-4 mb-8 flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <h1 className="font-display text-4xl font-bold sm:text-5xl">Your launch kit</h1>
          <p className="mt-4 text-base text-soft md:text-lg">Ready to post. You publish it yourself; nothing is posted automatically.</p>
        </div>
        <ShareControl runId={runId} />
      </div>
      <KitView kit={kit} />
      <Link to={`/app/runs/${runId}`} className="btn-ghost mt-10" data-testid="kit-back-to-results"><ArrowLeft size={16} /> Back to results</Link>
    </Page>
  );
}
