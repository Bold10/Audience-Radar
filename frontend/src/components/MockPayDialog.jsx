import { useState } from "react";
import { CheckCircle2, Loader2, Wallet } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { money } from "@/lib/api";

const MOCK_ADDRESS = "0xA4d1…DEMO…9f3C";

export const MockPayDialog = ({ open, onOpenChange, amount, assets, onPay, onDone }) => {
  const [asset, setAsset] = useState(assets[0]);
  const [stage, setStage] = useState("pay");
  const [tx, setTx] = useState(null);

  const confirm = async () => {
    setStage("processing");
    try {
      const run = await onPay(asset);
      setTx(run.payment.tx_hash);
      setStage("done");
    } catch {
      setStage("pay");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => stage !== "processing" && onOpenChange(o)}>
      <DialogContent className="rounded-2xl border-line bg-ground sm:max-w-md" data-testid="mock-pay-dialog">
        {stage !== "done" ? (
          <>
            <DialogHeader>
              <span className="eyebrow">Mock payment · no money moves</span>
              <DialogTitle className="font-display text-2xl">Pay {money(amount)} with crypto</DialogTitle>
              <DialogDescription className="text-soft">Demo mode simulates a wallet payment. Nothing is charged.</DialogDescription>
            </DialogHeader>
            <fieldset className="space-y-2">
              <legend className="mb-2 text-sm font-medium">Pay with</legend>
              <div className="flex gap-2">
                {assets.map((a) => (
                  <button key={a} type="button" onClick={() => setAsset(a)} aria-pressed={asset === a}
                    data-testid={`mock-pay-asset-${a.toLowerCase()}`}
                    className={`min-h-[44px] flex-1 rounded-xl border text-sm font-semibold transition-colors ${asset === a ? "border-btn bg-surface" : "border-line"}`}>
                    {a}
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="card-ar space-y-1 p-4 text-sm">
              <p className="text-soft">Send to (mock address)</p>
              <p className="font-mono font-medium" data-testid="mock-pay-address">{MOCK_ADDRESS}</p>
              <p className="pt-2 text-soft">Amount</p>
              <p className="font-display text-xl font-semibold" data-testid="mock-pay-amount">{money(amount)} in {asset}</p>
            </div>
            <button type="button" className="btn-primary w-full" onClick={confirm} disabled={stage === "processing"} data-testid="mock-pay-confirm-button">
              {stage === "processing" ? <><Loader2 className="animate-spin" size={18} /> Confirming and scanning sources…</> : <><Wallet size={18} /> Confirm mock payment</>}
            </button>
          </>
        ) : (
          <div className="space-y-5 text-center" data-testid="mock-pay-confirmation">
            <CheckCircle2 className="mx-auto text-brand" size={56} aria-hidden />
            <DialogTitle className="font-display text-2xl">Payment confirmed</DialogTitle>
            <DialogDescription className="text-soft">Mock confirmation. Your radar is ready.</DialogDescription>
            <p className="break-all rounded-xl bg-surface p-3 font-mono text-xs" data-testid="mock-pay-tx-hash">tx {tx}</p>
            <button type="button" className="btn-primary w-full" onClick={onDone} data-testid="mock-pay-view-results-button">View results</button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
