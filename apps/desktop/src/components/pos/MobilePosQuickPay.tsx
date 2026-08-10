/** Floating quick-pay chip above mobile POS tab bar */
export function MobilePosQuickPay({
  itemCount,
  grandTotal,
  currencySymbol,
  onPay,
}: {
  itemCount: number;
  grandTotal: number;
  currencySymbol: string;
  onPay: () => void;
}) {
  if (itemCount <= 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-4">
      <button
        type="button"
        onClick={onPay}
        className="pointer-events-auto inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-paper shadow-lift transition active:scale-[0.97]"
      >
        <span>دفع سريع</span>
        <span className="money-big rounded-full bg-white/15 px-2 py-0.5 text-xs">
          {itemCount} · {grandTotal.toFixed(2)} {currencySymbol}
        </span>
      </button>
    </div>
  );
}
