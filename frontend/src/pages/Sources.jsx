import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Page } from "@/components/Layout";
import { Stepper } from "@/components/Stepper";
import { api, clientId, money, unitLabel, useConfig } from "@/lib/api";
import { useFlow } from "@/lib/flow";

export default function Sources() {
  const { flow, update } = useFlow();
  const cfg = useConfig();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  if (!flow.audience) return <Navigate to="/app/audience" replace />;
  if (!cfg) return <Page><Loader2 className="animate-spin" /></Page>;

  const price = cfg.pricing.x_price_per_post;
  const selected = cfg.sources.filter((s) => flow.sources.includes(s.id));
  const lineCost = (s) => (s.paid ? s.sample_size * price : 0);
  const total = selected.reduce((t, s) => t + lineCost(s), 0);
  const toggle = (id) => update({ sources: flow.sources.includes(id) ? flow.sources.filter((x) => x !== id) : [...flow.sources, id] });

  const proceed = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/runs", { client_id: clientId(), description: flow.description, mode: flow.mode, role: flow.role, audience: flow.audience, sources: flow.sources });
      nav(`/app/pay/${data.id}`);
    } catch {
      toast.error("Could not create the run. Try again.");
      setBusy(false);
    }
  };

  return (
    <Page testid="sources-page">
      <Stepper current={2} />
      <h1 className="font-display text-4xl font-bold sm:text-5xl">Where should we look?</h1>
      <p className="mt-4 text-base text-soft md:text-lg">Audience: <strong className="text-ink">{flow.audience.name}</strong>. Pick the sources to sample.</p>
      <div className="mt-10 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <fieldset className="space-y-3">
          <legend className="mb-3 text-sm font-semibold">Data sources</legend>
          {cfg.sources.map((s) => (
            <label key={s.id} htmlFor={`src-${s.id}`} className="card-ar flex min-h-[72px] cursor-pointer items-center gap-4 p-5 transition-colors hover:border-ink" data-testid={`source-row-${s.id}`}>
              <Checkbox id={`src-${s.id}`} checked={flow.sources.includes(s.id)} onCheckedChange={() => toggle(s.id)} className="h-5 w-5 rounded-md" data-testid={`source-checkbox-${s.id}`} />
              <span className="flex-1">
                <span className="font-display text-lg font-semibold">{s.name}</span>
                <span className="block text-sm text-soft">Sample size: {unitLabel(s.sample_size, s.unit)}</span>
              </span>
              <span className={`rounded-full border px-3 py-1 text-xs font-bold tracking-wider ${s.paid ? "border-btn text-btn" : "border-line"}`}>{s.paid ? "PAID" : "FREE"}</span>
            </label>
          ))}
        </fieldset>
        <aside className="card-ar h-fit p-6 lg:sticky lg:top-24" data-testid="cost-box">
          <h2 className="font-display text-lg font-semibold">Cost of this run</h2>
          <dl className="mt-5 space-y-3 text-sm">
            {selected.map((s) => (
              <div key={s.id} className="flex justify-between gap-4" data-testid={`cost-line-${s.id}`}>
                <dt>{s.paid ? `${s.name}: ${s.sample_size} posts × $${price}` : `${s.name} (free)`}</dt>
                <dd className="font-medium tabular-nums">{money(lineCost(s))}</dd>
              </div>
            ))}
            {selected.length === 0 && <p className="text-soft">Select at least one source.</p>}
          </dl>
          <div className="mt-5 flex items-baseline justify-between border-t border-line pt-5">
            <span className="font-semibold">Total</span>
            <span className="font-display text-4xl font-bold text-brand" data-testid="cost-total">{money(total)}</span>
          </div>
          <button type="button" className="btn-primary mt-6 w-full" disabled={!selected.length || busy} onClick={proceed} data-testid="sources-continue-button">
            {busy ? <Loader2 className="animate-spin" size={18} /> : <>Continue to payment <ArrowRight size={18} /></>}
          </button>
        </aside>
      </div>
    </Page>
  );
}
