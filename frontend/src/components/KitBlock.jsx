import { Copy, Download } from "lucide-react";
import { toast } from "sonner";

export const KitBlock = ({ title, id, copyText, onDownload, extra, children }) => {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(copyText);
      toast.success(`${title} copied`);
    } catch {
      toast.error("Copy is blocked in this browser. Use Download instead.");
    }
  };
  return (
    <section className="card-ar flex flex-col p-5 md:p-6" data-testid={`kit-${id}-card`}>
      <h2 className="mb-4 font-display text-lg font-semibold">{title}</h2>
      <div className="flex-1">{children}</div>
      <div className="mt-5 flex flex-wrap gap-2">
        {copyText && (
          <button type="button" className="btn-ghost" onClick={copy} data-testid={`kit-${id}-copy-button`}>
            <Copy size={16} /> Copy
          </button>
        )}
        <button type="button" className="btn-ghost" onClick={onDownload} data-testid={`kit-${id}-download-button`}>
          <Download size={16} /> Download
        </button>
        {extra}
      </div>
    </section>
  );
};
