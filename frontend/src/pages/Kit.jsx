import { Fragment, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Page } from "@/components/Layout";
import { Stepper } from "@/components/Stepper";
import { DemoBadge } from "@/components/Interest";
import { KitBlock } from "@/components/KitBlock";
import { api } from "@/lib/api";
import { renderCard } from "@/lib/card";
import { downloadDataUrl, downloadText, downloadZip, scriptText } from "@/lib/download";

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const Highlighted = ({ text, keywords }) => {
  const terms = keywords.map((k) => k.replace(/^#/, "")).filter(Boolean);
  if (!terms.length) return text;
  const re = new RegExp(`(#?(?:${terms.map(esc).join("|")}))`, "gi");
  return text.split(re).map((part, i) =>
    i % 2 ? <mark key={i} className="kw-hl text-ink" data-testid="kit-x-keyword-highlight">{part}</mark> : <Fragment key={i}>{part}</Fragment>);
};

export default function Kit() {
  const { runId } = useParams();
  const [kit, setKit] = useState(null);
  const [card, setCard] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.post(`/runs/${runId}/kit`).then(async (r) => {
      setKit(r.data);
      setCard(await renderCard({ headline: r.data.card_headline, subline: r.data.card_subline, keywords: r.data.keywords }));
    }).catch(() => setError(true));
  }, [runId]);

  if (error) return <Page><p>Could not load the launch kit. <Link className="underline" to={`/app/runs/${runId}`}>Back to results</Link></p></Page>;
  if (!kit) return <Page testid="kit-loading"><Stepper current={5} /><p className="flex items-center gap-3 text-soft"><Loader2 className="animate-spin" /> Writing your launch kit…</p></Page>;

  const full = async () => { await downloadZip(kit, card); toast.success("Full kit downloaded"); };

  return (
    <Page testid="kit-page">
      <Stepper current={5} />
      <div className="flex flex-wrap items-center gap-3"><DemoBadge /><span className="text-sm text-soft">{kit.source === "ai" ? "Written by AI" : "Sample copy"}</span></div>
      <div className="mt-4 flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <h1 className="font-display text-4xl font-bold sm:text-5xl">Your launch kit</h1>
          <p className="mt-4 text-base text-soft md:text-lg">Ready to post. You publish it yourself; nothing is posted automatically.</p>
        </div>
        <button type="button" className="btn-primary" onClick={full} data-testid="download-full-kit-button"><Download size={18} /> Download the full kit</button>
      </div>
      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        <KitBlock title="X post" id="x" copyText={kit.x_post} onDownload={() => downloadText(kit.x_post, "x-post.txt")}>
          <p className="whitespace-pre-line text-base leading-relaxed" data-testid="kit-x-text"><Highlighted text={kit.x_post} keywords={kit.keywords} /></p>
          <p className="mt-3 text-xs text-soft">{kit.x_post.length} characters · highlighted: hot keywords</p>
        </KitBlock>
        <KitBlock title="Telegram message" id="telegram" copyText={kit.telegram_message} onDownload={() => downloadText(kit.telegram_message, "telegram-message.txt")}>
          <p className="whitespace-pre-line text-base leading-relaxed" data-testid="kit-telegram-text">{kit.telegram_message}</p>
        </KitBlock>
        <KitBlock title="Graphic card" id="card" copyText={`${kit.card_headline}\n${kit.card_subline}`} onDownload={() => card && downloadDataUrl(card, "launch-card.png")}>
          {card ? <img src={card} alt={`Launch card: ${kit.card_headline}`} className="w-full rounded-xl border border-line" data-testid="kit-card-image" />
            : <div className="aspect-[1200/630] animate-pulse rounded-xl bg-surface2" />}
        </KitBlock>
        <KitBlock title="30-second video script" id="script" copyText={scriptText(kit.video_script)} onDownload={() => downloadText(scriptText(kit.video_script), "video-script-30s.txt")}>
          <ol className="space-y-3" data-testid="kit-script-list">
            {kit.video_script.map((b, i) => (
              <li key={i} className="grid grid-cols-[64px_1fr] gap-3 text-sm"><span className="font-mono font-semibold text-btn">{b.time}</span><span>{b.line}</span></li>
            ))}
          </ol>
        </KitBlock>
      </div>
      <Link to={`/app/runs/${runId}`} className="btn-ghost mt-10" data-testid="kit-back-to-results"><ArrowLeft size={16} /> Back to results</Link>
    </Page>
  );
}
