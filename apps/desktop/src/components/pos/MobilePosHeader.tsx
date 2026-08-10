import {
  ArrowLeft,
  Receipt,
  Clock,
  Circle,
  Camera,
  Printer,
} from "@phosphor-icons/react";
import { cn } from "../../lib/cn";

export function MobilePosHeader({
  branchName,
  shiftOpen,
  heldCount,
  printerConnected,
  onExit,
  onOpenSales,
  onOpenHeld,
  onScan,
  onPrinterClick,
}: {
  branchName: string;
  shiftOpen: boolean;
  heldCount: number;
  printerConnected?: boolean;
  onExit?: () => void;
  onOpenSales?: () => void;
  onOpenHeld: () => void;
  onScan?: () => void;
  onPrinterClick?: () => void;
}) {
  return (
    <header className="flex shrink-0 items-center gap-2 border-b border-paper-line/70 bg-paper-raised/95 px-3 py-2.5 safe-top backdrop-blur-md">
      {onExit && (
        <button
          type="button"
          onClick={onExit}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-paper-line/70 bg-paper text-ink transition active:scale-[0.97]"
          aria-label="العودة"
        >
          <ArrowLeft size={18} weight="bold" />
        </button>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-ink">{branchName || "OmniSales"}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1">
            <Circle
              size={8}
              weight="fill"
              className={cn(shiftOpen ? "text-success" : "text-warning")}
            />
            <span
              className={cn(
                "text-[10px] font-semibold",
                shiftOpen ? "text-success" : "text-warning"
              )}
            >
              {shiftOpen ? "وردية مفتوحة" : "وردية مغلقة"}
            </span>
          </span>
          {printerConnected != null && (
            onPrinterClick ? (
              <button
                type="button"
                onClick={onPrinterClick}
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold transition active:scale-[0.97]",
                  printerConnected
                    ? "text-success hover:bg-success/10"
                    : "text-ink-mute hover:bg-paper"
                )}
              >
                <Printer size={11} weight="duotone" />
                {printerConnected ? "طابعة" : "بدون طابعة"}
              </button>
            ) : (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 text-[10px] font-semibold",
                  printerConnected ? "text-success" : "text-ink-mute"
                )}
              >
                <Printer size={11} weight="duotone" />
                {printerConnected ? "طابعة" : "بدون طابعة"}
              </span>
            )
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {onScan && (
          <button
            type="button"
            onClick={onScan}
            className="grid h-10 w-10 place-items-center rounded-xl bg-highlight text-white shadow-soft transition active:scale-[0.97]"
            aria-label="مسح باركود"
          >
            <Camera size={18} weight="duotone" />
          </button>
        )}
        {onOpenSales && (
          <button
            type="button"
            onClick={onOpenSales}
            className="grid h-10 w-10 place-items-center rounded-xl border border-paper-line/70 bg-paper text-ink transition active:scale-[0.97]"
            aria-label="المبيعات المنفذة"
          >
            <Receipt size={18} weight="duotone" />
          </button>
        )}
        <button
          type="button"
          onClick={onOpenHeld}
          className="relative grid h-10 w-10 place-items-center rounded-xl border border-paper-line/70 bg-paper text-ink transition active:scale-[0.97]"
          aria-label="الفواتير المعلقة"
        >
          <Clock size={18} weight="duotone" />
          {heldCount > 0 && (
            <span className="absolute -top-1 -end-1 grid h-4 min-w-4 place-items-center rounded-full bg-highlight px-1 text-[9px] font-bold text-white">
              {heldCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
