import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ArrowRight, Loader2, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Page } from "@/components/Layout";
import { Stepper } from "@/components/Stepper";
import { api, clientId, money, unitLabel, useConfig } from "@/lib/api";
import { SourceTag } from "@/components/Interest";
import { useFlow } from "@/lib/flow";

const PostCount = ({ value, onChange, p }) => (
  <div className="mt-4 border-t border-line pt-4" data-testid="x-post-count">
    <label htmlFor="x-posts-input" className="mb-2 block text-sm font-semibold">Posts to search on X</label>
    <div className="flex items-center gap-2">
      <button type="button" className="btn-ghost !px-0 w-11" aria-label="Fewer posts" disabled={value <= p.min_posts}
        onClick={() => onChange(value - p.step)} data-testid="x-posts-decrease"><Minus size={16} /></button>
      <input id="x-posts-input" type="number" inputMode="numeric" min={p.min_posts} max={p.max_posts} step={p.step} value={value}
        onChange={(e) => onChange(Number(e.target.value))} data-testid="x-posts-input"
        className="min-h-[44px] w-24 rounded-xl border border-line bg-ground px-3 text-center text-base tabular-nums outline-none focus:border-btn" />
      <button type="button" className="btn-ghost !px-0 w-11" aria-label="More posts" disabled={value >= p.max_posts}
        onClick={() => onChange(value + p.step)} data-testid="x-posts-increase"><Plus size={16} /></button>
    </div>
    <p className="mt-2 text-xs text-soft">{p.min_posts} to {p.max_posts} posts, in steps of {p.step}.</p>
  </div>
);

const LinkedInRow = () => (
  <div className="card-ar flex min-h-[72px] items-center gap-4 p-5 opacity-70" aria-disabled="true" data-testid="source-row-linkedin">
    <Checkbox disabled aria-label="LinkedIn (coming soon)" className="h-5 w-5 rounded-md" />
    <span className="flex-1">
      <span className="font-display text-lg font-semibold">LinkedIn</span>
      <span className="block text-sm text-soft">Not available yet. Official API source planned.</span>
    </span>
    <span className="rounded-full border border-line px-3 py-1 text-xs font-bold tracking-wider" data-testid="linkedin-coming-soon">COMING SOON</span>
  </div>
);

export default function Sources() {
  const { flow, update } = useFlow();
  const cfg = useConfig();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!flow.audience) return <Navigate to="/app/audience" replace />;
  if (!cfg) return <Page><Loader2 className="animate-spin" /></Page>;

  const p = cfg.pricing;
  const xPosts = flow.xPosts || p.default_posts;
  const size = (s) => (s.id === "x" ? xPosts : s.sample_size);
  const selected = cfg.sources.filter((s) => flow.sources.includes(s.id));
  const lines = selected.flatMap((s) => {
    const base = { id: s.id, label: s.paid ? `${s.name}: ${size(s)} posts × $${p.price_per_post}` : `${s.name} (free)`, cost: s.paid ? size(s) * p.price_per_post : 0 };
    return s.id === "x" && p.include_author_metrics
      ? [base, { id: "x-authors", label: `X author data: ${size(s)} × $${p.author_cost_per_post}`, cost: size(s) * p.author_cost_per_post }]
      : [base];
  });
  const total = lines.reduce((t, l) => t + l.cost, 0);
  const tooMany = flow.sources.includes("x") && xPosts > p.max_posts;
  const toggle = (id) => update({ sources: flow.sources.includes(id) ? flow.sources.filter((x) => x !== id) : [...flow.sources, id] });
  const setPosts = (n) => { setError(""); update({ xPosts: Number.isFinite(n) ? n : p.default_posts }); };

  const proceed = async () => {
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post("/runs", { client_id: clientId(), description: flow.description, mode: flow.mode, role: flow.role,
        audience: flow.audience, sources: flow.sources, x_posts: xPosts });
      nav(`/app/pay/${data.id}`);
    } catch (e) {
      const msg = typeof e.response?.data?.detail === "string" ? e.response.data.detail : "Could not create the run. Try again.";
      setError(msg);
      toast.error(msg);
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
            <div key={s.id} className="card-ar p-5 transition-colors hover:border-ink" data-testid={`source-row-${s.id}`}>
              <div className="flex min-h-[32px] items-center gap-4">
                <Checkbox id={`src-${s.id}`} checked={flow.sources.includes(s.id)} onCheckedChange={() => toggle(s.id)} className="h-5 w-5 rounded-md" data-testid={`source-checkbox-${s.id}`} />
                <label htmlFor={`src-${s.id}`} className="flex-1 cursor-pointer">
                  <span className="flex flex-wrap items-center gap-2 font-display text-lg font-semibold">{s.name}
                    <SourceTag live={s.live} fallback={s.id === "x" && !s.live ? "No X key set" : null} testid={`source-tag-${s.id}`} /></span>
                  <span className="block text-sm text-soft">Sample size: {unitLabel(size(s), s.unit)}</span>
                </label>
                <span className={`rounded-full border px-3 py-1 text-xs font-bold tracking-wider ${s.paid ? "border-btn text-btn" : "border-line"}`}>{s.paid ? "PAID" : "FREE"}</span>
              </div>
              {s.id === "x" && flow.sources.includes("x") && <PostCount value={xPosts} onChange={setPosts} p={p} />}
            </div>
          ))}
          <LinkedInRow />
        </fieldset>
        <aside className="card-ar h-fit p-6 lg:sticky lg:top-24" data-testid="cost-box">
          <h2 className="font-display text-lg font-semibold">Cost of this run</h2>
          <dl className="mt-5 space-y-3 text-sm">
            {lines.map((l) => (
              <div key={l.id} className="flex justify-between gap-4" data-testid={`cost-line-${l.id}`}>
                <dt>{l.label}</dt>
                <dd className="font-medium tabular-nums">{money(l.cost)}</dd>
              </div>
            ))}
            {selected.length === 0 && <p className="text-soft">Select at least one source.</p>}
          </dl>
          <div className="mt-5 flex items-baseline justify-between border-t border-line pt-5">
            <span className="font-semibold">Total</span>
            <span className="font-display text-4xl font-bold text-brand" data-testid="cost-total">{money(total)}</span>
          </div>
          {(error || tooMany) && (
            <p className="mt-4 text-sm font-medium text-btn" role="alert" data-testid="sources-error">
              {error || `You can search up to ${p.max_posts} X posts per run.`}
            </p>
          )}
          <button type="button" className="btn-primary mt-6 w-full" disabled={!selected.length || busy || tooMany} onClick={proceed} data-testid="sources-continue-button">
            {busy ? <Loader2 className="animate-spin" size={18} /> : <>Continue to payment <ArrowRight size={18} /></>}
          </button>
        </aside>
      </div>
    </Page>
  );
}
