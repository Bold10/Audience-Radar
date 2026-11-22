import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Page } from "@/components/Layout";
import { Stepper } from "@/components/Stepper";
import { MockPayDialog } from "@/components/MockPayDialog";
import { api, money, unitLabel, useConfig } from "@/lib/api";

export default function Pay() {
  const { runId } = useParams();
  const nav = useNavigate();
  const cfg = useConfig();
  const [run, setRun] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => { api.get(`/runs/${runId}`).then((r) => setRun(r.data)).catch(() => setRun(false)); }, [runId]);

  if (run === false) return <Navigate to="/history" replace />;
  if (!run || !cfg) return <Page><Loader2 className="animate-spin" /></Page>;
  if (run.status === "paid" && !open) return <Navigate to={`/app/runs/${runId}`} replace />;

  const pay = async (asset) => {
    try {
      const { data } = await api.post(`/runs/${runId}/pay`, { asset });
      return data;
    } catch (e) {
      toast.error("Mock payment failed. Try again.");
      throw e;
    }
  };

  return (
    <Page testid="pay-page" narrow>
      <Stepper current={3} />
      <h1 className="font-display text-4xl font-bold sm:text-5xl">Ready to scan.</h1>
      <p className="mt-4 text-base text-soft md:text-lg">Pay per run. No account, no subscription.</p>
      <div className="card-ar mt-10 p-6" data-testid="pay-summary">
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div><dt className="text-soft">{run.mode === "launch" ? "Product" : "Niche"}</dt><dd className="mt-1 font-medium">{run.description}</dd></div>
          <div><dt className="text-soft">Audience</dt><dd className="mt-1 font-medium">{run.audience.name}</dd></div>
          <div><dt className="text-soft">Mode</dt><dd className="mt-1 font-medium">{run.mode === "launch" ? "Launching a product" : `Creator · ${run.role}`}</dd></div>
        </dl>
        <ul className="mt-6 space-y-2 border-t border-line pt-5 text-sm">
          {run.cost.lines.map((l) => (
            <li key={l.source} className="flex justify-between"><span>{l.name} · {unitLabel(l.sample_size, l.unit)}</span><span className="tabular-nums">{money(l.cost)}</span></li>
          ))}
        </ul>
        <div className="mt-5 flex items-baseline justify-between border-t border-line pt-5">
          <span className="font-semibold">Total</span>
          <span className="font-display text-4xl font-bold text-brand" data-testid="pay-total">{money(run.cost.total)}</span>
        </div>
      </div>
      <button type="button" className="btn-primary mt-8 w-full text-lg sm:w-auto" onClick={() => setOpen(true)} data-testid="pay-with-crypto-button">
        <Wallet size={20} /> Pay {money(run.cost.total)} with crypto
      </button>
      <p className="mt-3 text-sm text-soft">Demo mode: opens a mock payment window. No real payment is taken.</p>
      <MockPayDialog open={open} onOpenChange={setOpen} amount={run.cost.total} assets={cfg.pricing.crypto_assets}
        onPay={pay} onDone={() => nav(`/app/runs/${runId}`)} />
    </Page>
  );
}
