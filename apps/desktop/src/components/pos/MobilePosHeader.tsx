import {
  ArrowLeft,
  Receipt,
  Clock,
  Circle,
} from "@phosphor-icons/react";
import { cn } from "../../lib/cn";

export function MobilePosHeader({
  branchName,
  shiftOpen,
  heldCount,
  onExit,
  onOpenSales,
  onOpenHeld,
}: {
  branchName: string;
  shiftOpen: boolean;
  heldCount: number;
  onExit?: () => void;
  onOpenSales?: () => void;
  onOpenHeld: () => void;
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
        <div className="mt-0.5 flex items-center gap-1.5">
          <Circle
            size={8}
            weight="fill"
            className={cn(shiftOpen ? "text-success" : "text-warning")}
          />
          <span className={cn("text-[10px] font-semibold", shiftOpen ? "text-success" : "text-warning")}>
            {shiftOpen ? "وردية مفتوحة" : "وردية مغلقة"}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
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
