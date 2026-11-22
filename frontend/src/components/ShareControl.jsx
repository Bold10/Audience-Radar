import { useEffect, useState } from "react";
import { useAuth } from "@clerk/react";
import { Copy, Link2Off, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { api, clientId } from "@/lib/api";

const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

// Owner-only: create, copy and stop a read-only share link for a paid run.
export const ShareControl = ({ runId }) => {
  const { isLoaded, isSignedIn } = useAuth();
  const [state, setState] = useState({ owner: false, token: null });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    api.get(`/runs/${runId}/share`, { params: { client_id: clientId() } }).then((r) => setState(r.data)).catch(() => {});
  }, [runId, isLoaded, isSignedIn]);

  if (!state.owner) return null;
  const url = state.token ? `${window.location.origin}/s/${state.token}` : "";

  const share = async () => {
    setBusy(true);
    try {
      const { data } = await api.post(`/runs/${runId}/share`, { client_id: clientId() });
      setState({ owner: true, token: data.token });
      const ok = await copyText(`${window.location.origin}/s/${data.token}`);
      toast.success(ok ? "Share link copied" : "Share link ready. Copy it from the box.");
    } catch {
      toast.error("Could not create a share link. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const stop = async () => {
    setBusy(true);
    try {
      await api.delete(`/runs/${runId}/share`, { params: { client_id: clientId() } });
      setState({ owner: true, token: null });
      toast.success("Sharing stopped. The old link no longer works.");
    } catch {
      toast.error("Could not stop sharing. Try again.");
    } finally {
      setBusy(false);
    }
  };

  if (!state.token) {
    return (
      <button type="button" className="btn-ghost" onClick={share} disabled={busy} data-testid="share-run-button">
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Share2 size={16} />} {busy ? "Preparing link…" : "Share"}
      </button>
    );
  }
  return (
    <div className="card-ar w-full max-w-md space-y-3 p-4" data-testid="share-panel">
      <label htmlFor="share-url" className="block text-sm font-semibold">Read-only share link</label>
      <input id="share-url" readOnly value={url} onFocus={(e) => e.target.select()}
        className="min-h-[44px] w-full rounded-xl border border-line bg-ground px-3 font-mono text-xs" data-testid="share-url-input" />
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary" disabled={busy}
          onClick={async () => { if (await copyText(url)) toast.success("Link copied"); else toast.error("Copy blocked. Select the link and copy it."); }}
          data-testid="share-copy-link-button">
          <Copy size={16} /> Copy link
        </button>
        <button type="button" className="btn-ghost" onClick={stop} disabled={busy} data-testid="share-stop-button">
          <Link2Off size={16} /> Stop sharing
        </button>
      </div>
      <p className="text-xs text-soft">Anyone with the link can view and download. No payment details or owner info are shown.</p>
    </div>
  );
};
