import { useCallback, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ArrowRight, Check, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Page } from "@/components/Layout";
import { Stepper } from "@/components/Stepper";
import { api } from "@/lib/api";
import { useFlow } from "@/lib/flow";

export default function AudiencePage() {
  const { flow, update } = useFlow();
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);

  const fetchOptions = useCallback(async (round, seen) => {
    setLoading(true);
    try {
      const { data } = await api.post("/audiences", { description: flow.description, mode: flow.mode, role: flow.role, exclude: seen, round });
      update({ options: data.options, optionsSource: data.source, round, seen: [...seen, ...data.options.map((o) => o.name)], audience: null });
    } catch {
      toast.error("Could not load audience suggestions. Try again.");
    } finally {
      setLoading(false);
    }
  }, [flow.description, flow.mode, flow.role]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (flow.description && flow.options.length === 0) fetchOptions(0, []);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!flow.description) return <Navigate to="/app" replace />;

  return (
    <Page testid="audience-page">
      <Stepper current={1} />
      <p className="eyebrow">{flow.mode === "launch" ? "Launching" : `Creator · ${flow.role}`}</p>
      <h1 className="mt-3 font-display text-4xl font-bold sm:text-5xl">Who is this really for?</h1>
      <p className="mt-4 max-w-2xl text-base text-soft md:text-lg">Pick the audience that fits “{flow.description}” best.
        {flow.optionsSource && <span className="ml-1 text-sm" data-testid="audience-source-note">({flow.optionsSource === "ai" ? "Suggested by AI" : "Sample suggestions"})</span>}
      </p>
      {loading ? (
        <div className="mt-12 flex items-center gap-3 text-soft" data-testid="audience-loading"><Loader2 className="animate-spin" /> Asking the model for 3 audiences…</div>
      ) : (
        <div className="mt-10 grid gap-4 md:grid-cols-3" role="radiogroup" aria-label="Audience options">
          {flow.options.map((o, i) => {
            const on = flow.audience?.name === o.name;
            return (
              <button key={o.name} type="button" role="radio" aria-checked={on} onClick={() => update({ audience: o })}
                data-testid={`audience-option-${i}`} style={{ animationDelay: `${i * 80}ms` }}
                className={`fade-up card-ar relative p-6 text-left transition-transform hover:-translate-y-0.5 ${on ? "!border-btn ring-1 ring-btn" : ""}`}>
                {on && <span className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-btn text-btnink"><Check size={16} /></span>}
                <span className="font-display text-2xl font-semibold">{o.name}</span>
                <span className="mt-3 block text-sm text-soft">{o.description}</span>
                <span className="mt-4 flex flex-wrap gap-1.5">
                  {o.signals?.map((s) => <span key={s} className="rounded-full border border-line px-2.5 py-1 text-xs">{s}</span>)}
                </span>
              </button>
            );
          })}
        </div>
      )}
      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <button type="button" className="btn-primary" disabled={!flow.audience || loading} onClick={() => nav("/app/sources")} data-testid="audience-continue-button">
          Continue with {flow.audience?.name || "this audience"} <ArrowRight size={18} />
        </button>
        <button type="button" className="btn-ghost" disabled={loading} onClick={() => fetchOptions(flow.round + 1, flow.seen)} data-testid="audience-refine-button">
          <RefreshCw size={16} /> None of these, refine
        </button>
      </div>
    </Page>
  );
}
