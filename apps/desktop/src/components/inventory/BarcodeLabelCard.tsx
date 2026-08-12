import { useMemo, useState } from "react";
import { DownloadSimple, ShareNetwork } from "@phosphor-icons/react";
import {
  barcodeDataUrl,
  detectBarcodeFormat,
  formatLabel,
  saveBarcodePng,
} from "../../lib/barcode-label";

export function BarcodeLabelCard({
  code,
  productName,
}: {
  code: string;
  productName?: string;
}) {
  const trimmed = code.trim();
  const format = useMemo(() => detectBarcodeFormat(trimmed), [trimmed]);
  const src = useMemo(
    () => (trimmed ? barcodeDataUrl(trimmed, { scale: 4, barHeight: 96 }) : ""),
    [trimmed]
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!trimmed) return null;

  async function handleSave() {
    setBusy(true);
    setMessage(null);
    try {
      await saveBarcodePng(trimmed, productName);
      setMessage("تم حفظ صورة الباركود بجودة طباعة عالية");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "تعذر حفظ الباركود");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2 rounded-2xl border border-paper-line bg-paper p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold text-ink">
          معاينة الباركود · {formatLabel(format)}
        </p>
        <span className="font-mono text-[10px] text-ink-mute">{trimmed}</span>
      </div>
      <div className="overflow-hidden rounded-xl bg-white p-2">
        <img
          src={src}
          alt={`باركود ${trimmed}`}
          className="mx-auto h-24 w-full max-w-full object-contain"
        />
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => void handleSave()}
        className="btn-ghost inline-flex w-full items-center justify-center gap-1.5 text-[11px] font-bold"
      >
        <DownloadSimple size={16} />
        <ShareNetwork size={16} />
        {busy ? "جاري الحفظ…" : "حفظ / مشاركة الباركود بجودة عالية"}
      </button>
      {message && <p className="text-center text-[11px] text-ink-mute">{message}</p>}
    </div>
  );
}
