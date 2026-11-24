import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Megaphone, Search, Sparkles } from "lucide-react";
import { Page } from "@/components/Layout";
import { Stepper } from "@/components/Stepper";
import { useFlow } from "@/lib/flow";

const ROLES = ["Video creator", "Writer", "Marketer", "Sales rep", "Other"];
const MODES = [
  { id: "launch", label: "I'm launching a product", icon: Megaphone },
  { id: "researcher", label: "I'm a researcher", icon: Search },
];
const EXAMPLES = { launch: "a portfolio tracker for crypto traders", researcher: "crypto trading education" };
const MAX_TEXT = 1000;

export default function Describe() {
  const { flow, update } = useFlow();
  const nav = useNavigate();
  const [mode, setMode] = useState(flow.mode);
  const [role, setRole] = useState(ROLES.includes(flow.role) ? flow.role : "Other");
  const [roleOther, setRoleOther] = useState(flow.roleOther || "");
  const [text, setText] = useState(flow.description);
  const valid = text.trim().length >= 3;

  const submit = (e) => {
    e.preventDefault();
    if (!valid) return;
    const finalRole = role === "Other" ? (roleOther.trim() || "Other") : role;
    update({ description: text.trim().slice(0, MAX_TEXT), mode, role: mode === "researcher" ? finalRole : null, roleOther,
      audience: null, options: [], seen: [], round: 0 });
    nav("/app/audience");
  };

  return (
    <Page testid="describe-page" narrow>
      <Stepper current={0} />
      <h1 className="fade-up font-display text-4xl font-bold sm:text-5xl">What are you putting out into the world?</h1>
      <p className="mt-4 text-base text-soft md:text-lg">Describe it in a sentence. We will suggest who it is for, then show where they are paying attention.</p>
      <form onSubmit={submit} className="mt-10 space-y-8">
        <fieldset>
          <legend className="mb-3 text-sm font-semibold">Mode</legend>
          <div className="grid gap-3 sm:grid-cols-2" role="radiogroup">
            {MODES.map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" role="radio" aria-checked={mode === id} onClick={() => setMode(id)}
                data-testid={`mode-toggle-${id}`}
                className={`flex min-h-[64px] items-center gap-3 rounded-2xl border px-5 text-left font-medium transition-colors ${mode === id ? "border-btn bg-surface ring-1 ring-btn" : "border-line hover:bg-surface"}`}>
                <Icon size={20} className={mode === id ? "text-btn" : "text-soft"} /> {label}
              </button>
            ))}
          </div>
        </fieldset>
        {mode === "researcher" && (
          <fieldset className="fade-up" data-testid="researcher-role-selector">
            <legend className="mb-3 text-sm font-semibold">Your role</legend>
            <div className="flex flex-wrap gap-2" role="radiogroup">
              {ROLES.map((r) => (
                <button key={r} type="button" role="radio" aria-checked={role === r} onClick={() => setRole(r)}
                  data-testid={`role-option-${r.toLowerCase().replace(" ", "-")}`}
                  className={`min-h-[44px] rounded-full border px-5 text-sm font-medium transition-colors ${role === r ? "border-btn bg-btn text-btnink" : "border-line hover:bg-surface"}`}>
                  {r}
                </button>
              ))}
            </div>
            {role === "Other" && (
              <div className="mt-4 max-w-sm">
                <label htmlFor="role-other-input" className="mb-2 block text-sm font-semibold">Your role, in a few words</label>
                <input id="role-other-input" value={roleOther} onChange={(e) => setRoleOther(e.target.value)} maxLength={40}
                  placeholder="e.g. Podcast host" data-testid="role-other-input"
                  className="min-h-[44px] w-full rounded-xl border border-line bg-surface px-4 text-base outline-none focus:border-btn" />
                <p className="mt-1 text-xs text-soft">{roleOther.length}/40 characters</p>
              </div>
            )}
          </fieldset>
        )}
        <div>
          <label htmlFor="describe-input" className="mb-3 block text-sm font-semibold">
            {mode === "launch" ? "Describe your product" : "Describe your niche"}
          </label>
          <textarea id="describe-input" rows={4} value={text} onChange={(e) => setText(e.target.value)} maxLength={MAX_TEXT}
            placeholder={mode === "launch" ? "e.g. a portfolio tracker for crypto traders" : "e.g. crypto trading education"}
            className="w-full rounded-2xl border border-line bg-surface p-4 text-base outline-none transition-colors focus:border-btn"
            data-testid="describe-textarea" aria-describedby="describe-count" />
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
            <button type="button" onClick={() => { setText(EXAMPLES[mode]); if (mode === "researcher") setRole("Video creator"); }}
              className="inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-btn hover:underline" data-testid="use-sample-button">
              <Sparkles size={15} /> Use the demo example
            </button>
            <span id="describe-count" className="text-xs text-soft" data-testid="describe-char-count">{text.length}/{MAX_TEXT} characters</span>
          </div>
        </div>
        <button type="submit" className="btn-primary w-full sm:w-auto" disabled={!valid} data-testid="describe-continue-button">
          Find my audience <ArrowRight size={18} />
        </button>
      </form>
    </Page>
  );
}
