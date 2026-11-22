import { Fragment, useEffect, useState } from "react";
import { Check, Copy, Download, FileCode2 } from "lucide-react";
import { toast } from "sonner";
import { KitBlock } from "@/components/KitBlock";
import { renderCard, renderCardSvg } from "@/lib/card";
import { downloadDataUrl, downloadText, downloadZip, scriptText } from "@/lib/download";

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const Highlighted = ({ text, keywords }) => {
  const terms = keywords.map((k) => k.replace(/^#/, "")).filter(Boolean);
  if (!terms.length) return text;
  const re = new RegExp(`(#?(?:${terms.map(esc).join("|")}))`, "gi");
  return text.split(re).map((part, i) =>
    i % 2 ? <mark key={i} className="kw-hl text-ink" data-testid="kit-x-keyword-highlight">{part}</mark> : <Fragment key={i}>{part}</Fragment>);
};

export const KeywordCopy = ({ keywords }) => {
  const [copied, setCopied] = useState(null);
  const copy = async (text, id, msg) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      toast.success(msg);
      setTimeout(() => setCopied((c) => (c === id ? null : c)), 1600);
    } catch {
      toast.error("Copy is blocked in this browser. Select the keyword and copy it manually.");
    }
  };
  return (
    <section className="card-ar p-5 md:p-6" data-testid="kit-keywords-card">
      <h2 className="font-display text-lg font-semibold">Hot keywords</h2>
      <p className="mt-1 text-sm text-soft">Keywords only, for writing your own post. Click one to copy it.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {keywords.map((k, i) => (
          <button key={k} type="button" onClick={() => copy(k, i, `Copied ${k}`)} data-testid={`kit-keyword-chip-${i}`}
            aria-label={`Copy keyword ${k}`}
            className="chip min-h-[44px] gap-2 transition-[transform,border-color,background-color] duration-200 hover:-translate-y-0.5 hover:border-ink hover:bg-surface">
            {k}
            {copied === i ? <><Check size={14} className="text-btn" /><span className="text-xs text-btn">Copied</span></> : <Copy size={14} className="text-soft" />}
          </button>
        ))}
      </div>
      <button type="button" className="btn-ghost mt-5" onClick={() => copy(keywords.join(" "), "all", "All keywords copied")} data-testid="kit-copy-all-keywords-button">
        {copied === "all" ? <Check size={16} /> : <Copy size={16} />} {copied === "all" ? "Copied" : "Copy all keywords"}
      </button>
    </section>
  );
};

export const KitView = ({ kit }) => {
  const [card, setCard] = useState(null);
  const [svg, setSvg] = useState(null);

  useEffect(() => {
    const content = { headline: kit.card_headline, subline: kit.card_subline, keywords: kit.keywords };
    renderCard(content).then(setCard);
    renderCardSvg(content).then(setSvg);
  }, [kit]);

  const full = async () => { await downloadZip(kit, card, svg); toast.success("Full kit downloaded"); };
  const script = scriptText(kit.video_script);

  return (
    <>
      <button type="button" className="btn-primary" onClick={full} data-testid="download-full-kit-button"><Download size={18} /> Download the full kit</button>
      <div className="mt-8 grid items-start gap-5 lg:grid-cols-2">
        <div className="grid gap-5">
          <KitBlock title="X post" id="x" copyText={kit.x_post} onDownload={() => downloadText(kit.x_post, "x-post.txt")}>
            <p className="whitespace-pre-line text-base leading-relaxed" data-testid="kit-x-text"><Highlighted text={kit.x_post} keywords={kit.keywords} /></p>
            <p className="mt-3 text-xs text-soft">{kit.x_post.length} characters · highlighted: hot keywords</p>
          </KitBlock>
          <KeywordCopy keywords={kit.keywords} />
        </div>
        <KitBlock title="Telegram message" id="telegram" copyText={kit.telegram_message} onDownload={() => downloadText(kit.telegram_message, "telegram-message.txt")}>
          <p className="whitespace-pre-line text-base leading-relaxed" data-testid="kit-telegram-text">{kit.telegram_message}</p>
        </KitBlock>
        <KitBlock title="Graphic card" id="card" copyText={`${kit.card_headline}\n${kit.card_subline}`} onDownload={() => card && downloadDataUrl(card, "launch-card.png")}
          extra={(
            <button type="button" className="btn-ghost" disabled={!svg} onClick={() => downloadText(svg, "launch-card-editable.svg", "image/svg+xml")} data-testid="kit-card-download-svg-button">
              <FileCode2 size={16} /> Download editable SVG
            </button>
          )}>
          {card ? <img src={card} alt={`Launch card: ${kit.card_headline}`} className="w-full rounded-xl border border-line" data-testid="kit-card-image" />
            : <div className="aspect-[1200/630] animate-pulse rounded-xl bg-surface2" />}
        </KitBlock>
        <KitBlock title="30-second video script" id="script" copyText={script} onDownload={() => downloadText(script, "video-script-30s.txt")}>
          <ol className="space-y-3" data-testid="kit-script-list">
            {kit.video_script.map((b, i) => (
              <li key={i} className="grid grid-cols-[64px_1fr] gap-3 text-sm"><span className="font-mono font-semibold text-btn">{b.time}</span><span>{b.line}</span></li>
            ))}
          </ol>
        </KitBlock>
      </div>
    </>
  );
};
