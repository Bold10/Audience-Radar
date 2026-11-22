import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Page } from "@/components/Layout";
import { api, clientId, fmtDate, money } from "@/lib/api";

const RunRow = ({ r }) => (
  <li>
    <Link to={r.status === "paid" ? `/app/runs/${r.id}` : `/app/pay/${r.id}`} data-testid={`history-row-${r.id}`}
      className="card-ar grid gap-2 p-5 transition-colors hover:border-ink md:grid-cols-[180px_1fr_150px_100px_24px] md:items-center">
      <span className="text-sm text-soft">{fmtDate(r.created_at)}</span>
      <span>
        <span className="font-display text-lg font-semibold">{r.description}</span>
        <span className="block text-sm text-soft">{r.audience?.name}</span>
      </span>
      <span className="text-sm font-medium">{r.mode === "launch" ? "Launch" : `Creator · ${r.role}`}</span>
      <span className="font-display text-lg font-semibold tabular-nums">
        {money(r.cost?.total)}{r.status !== "paid" && <span className="block text-xs font-normal text-btn">Unpaid</span>}
      </span>
      <ArrowRight size={18} className="hidden md:block" aria-hidden />
    </Link>
  </li>
);

export default function History() {
  const [scope, setScope] = useState("mine");
  const [runs, setRuns] = useState(null);

  useEffect(() => {
    setRuns(null);
    api.get("/runs", { params: { scope, client_id: clientId() } }).then((r) => setRuns(r.data)).catch(() => setRuns([]));
  }, [scope]);

  return (
    <Page testid="history-page">
      <h1 className="font-display text-4xl font-bold sm:text-5xl">History</h1>
      <p className="mt-4 text-base text-soft md:text-lg">Past runs with date, niche, mode and cost. No account needed.</p>
      <Tabs value={scope} onValueChange={setScope} className="mt-8">
        <TabsList className="h-auto rounded-full bg-surface p-1">
          <TabsTrigger value="mine" className="min-h-[40px] rounded-full px-5" data-testid="history-tab-mine">My runs</TabsTrigger>
          <TabsTrigger value="all" className="min-h-[40px] rounded-full px-5" data-testid="history-tab-all">All runs</TabsTrigger>
        </TabsList>
      </Tabs>
      {runs === null ? <Loader2 className="mt-8 animate-spin" /> : runs.length === 0 ? (
        <div className="card-ar mt-8 p-10 text-center" data-testid="history-empty">
          <p className="font-display text-xl font-semibold">No runs yet</p>
          <Link to="/app" className="btn-primary mt-5" data-testid="history-start-button">Start a run</Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-3" data-testid="history-list">{runs.map((r) => <RunRow key={r.id} r={r} />)}</ul>
      )}
    </Page>
  );
}
