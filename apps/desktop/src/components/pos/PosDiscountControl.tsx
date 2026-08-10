import { useEffect, useState } from "react";
import { cn } from "../../lib/cn";
import { formatMoney } from "../../lib/format";

const QUICK_PERCENTS = [5, 10, 15, 20, 25] as const;

export function PosDiscountControl({
  discount,
  cartSubtotal,
  currencySymbol,
  isMobile,
  onDiscountChange,
}: {
  discount: number;
  cartSubtotal: number;
  currencySymbol: string;
  isMobile?: boolean;
  onDiscountChange: (value: number) => void;
}) {
  const [mode, setMode] = useState<"fixed" | "percent">("fixed");
  const [percentInput, setPercentInput] = useState("");

  useEffect(() => {
    if (mode === "percent" && cartSubtotal > 0 && discount > 0) {
      const pct = Math.round((discount / cartSubtotal) * 1000) / 10;
      setPercentInput(String(pct));
    }
  }, [discount, cartSubtotal, mode]);

  function applyPercent(pct: number) {
    const amount = Math.round(((cartSubtotal * pct) / 100) * 100) / 100;
    onDiscountChange(Math.min(amount, cartSubtotal));
    setPercentInput(String(pct));
    setMode("percent");
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-ink-mute">خصم إضافي</p>
        <div className="flex rounded-full bg-paper p-0.5">
          <button
            type="button"
            onClick={() => setMode("fixed")}
            className={cn(
              "rounded-full px-2.5 py-1 text-[10px] font-bold transition",
              mode === "fixed" ? "bg-ink text-paper" : "text-ink-mute"
            )}
          >
            مبلغ
          </button>
          <button
            type="button"
            onClick={() => setMode("percent")}
            className={cn(
              "rounded-full px-2.5 py-1 text-[10px] font-bold transition",
              mode === "percent" ? "bg-ink text-paper" : "text-ink-mute"
            )}
          >
            %
          </button>
        </div>
      </div>

      {mode === "percent" && (
        <div className="flex flex-wrap gap-1.5">
          {QUICK_PERCENTS.map((pct) => (
            <button
              key={pct}
              type="button"
              onClick={() => applyPercent(pct)}
              className={cn(
                "rounded-xl border px-3 py-2 text-xs font-bold transition active:scale-[0.97]",
                Number(percentInput) === pct
                  ? "border-highlight bg-highlight/12 text-highlight"
                  : "border-paper-line bg-paper-raised text-ink"
              )}
            >
              {pct}%
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        {mode === "fixed" ? (
          <input
            type="number"
            min={0}
            placeholder="0"
            value={discount || ""}
            onChange={(e) => onDiscountChange(Number(e.target.value) || 0)}
            className="input-field flex-1 font-mono text-xs"
          />
        ) : (
          <input
            type="number"
            min={0}
            max={100}
            step="0.5"
            placeholder="نسبة %"
            value={percentInput}
            onChange={(e) => {
              const raw = e.target.value;
              setPercentInput(raw);
              const pct = Number(raw);
              if (Number.isFinite(pct) && pct >= 0) applyPercent(pct);
            }}
            className="input-field flex-1 font-mono text-xs"
          />
        )}
        {discount > 0 && (
          <div className="flex shrink-0 items-center rounded-xl bg-danger/10 px-3 text-xs font-bold text-danger">
            −{formatMoney(Math.min(discount, cartSubtotal), currencySymbol)}
          </div>
        )}
      </div>

      {isMobile && mode === "percent" && cartSubtotal > 0 && (
        <p className="text-[10px] text-ink-mute">
          {percentInput || "0"}% من {formatMoney(cartSubtotal, currencySymbol)}
        </p>
      )}
    </div>
  );
}
