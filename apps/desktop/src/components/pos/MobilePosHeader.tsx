import { useState } from "react";
import {
  ArrowLeft,
  Receipt,
  Clock,
  Circle,
  Camera,
  Printer,
  ShoppingCart,
  DotsThreeOutline,
  MagnifyingGlass,
  Lock,
  Keyboard,
} from "@phosphor-icons/react";
import { cn } from "../../lib/cn";

export function MobilePosHeader({
  branchName,
  shiftOpen,
  heldCount,
  cartCount = 0,
  cartTotal,
  currencySymbol,
  printerConnected,
  onExit,
  onOpenSales,
  onOpenHeld,
  onScan,
  onOpenCart,
  onPrinterClick,
  onOpenCommand,
  onLock,
  onOpenShortcuts,
}: {
  branchName: string;
  shiftOpen: boolean;
  heldCount: number;
  cartCount?: number;
  cartTotal?: string;
  currencySymbol?: string;
  printerConnected?: boolean;
  onExit?: () => void;
  onOpenSales?: () => void;
  onOpenHeld: () => void;
  onScan?: () => void;
  onOpenCart?: () => void;
  onPrinterClick?: () => void;
  onOpenCommand?: () => void;
  onLock?: () => void;
  onOpenShortcuts?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const hasMenu = Boolean(onOpenCommand || onLock || onOpenShortcuts);
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
        {onOpenCart && cartCount > 0 && (
          <button
            type="button"
            onClick={onOpenCart}
            className="relative inline-flex h-10 items-center gap-1.5 rounded-xl border border-highlight/25 bg-highlight/10 px-2.5 text-highlight transition active:scale-[0.97]"
            aria-label="السلة"
          >
            <ShoppingCart size={18} weight="duotone" />
            <span className="money-pos tabular-nums">{cartCount}</span>
            {cartTotal && currencySymbol && (
              <span className="hidden text-[10px] font-bold sm:inline">{cartTotal}</span>
            )}
          </button>
        )}
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
        {hasMenu && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="grid h-10 w-10 place-items-center rounded-xl border border-paper-line/70 bg-paper text-ink transition active:scale-[0.97]"
              aria-label="المزيد"
              aria-expanded={menuOpen}
            >
              <DotsThreeOutline size={18} weight="fill" />
            </button>
            {menuOpen && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-40"
                  aria-label="إغلاق"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute end-0 top-[calc(100%+0.35rem)] z-50 min-w-[11rem] overflow-hidden rounded-2xl border border-paper-line/70 bg-paper-raised p-1.5 shadow-lift">
                  {onOpenCommand && (
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold text-ink hover:bg-paper"
                      onClick={() => {
                        setMenuOpen(false);
                        onOpenCommand();
                      }}
                    >
                      <MagnifyingGlass size={16} />
                      بحث سريع
                    </button>
                  )}
                  {onLock && (
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold text-ink hover:bg-paper"
                      onClick={() => {
                        setMenuOpen(false);
                        onLock();
                      }}
                    >
                      <Lock size={16} />
                      قفل الجلسة
                    </button>
                  )}
                  {onOpenShortcuts && (
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold text-ink hover:bg-paper"
                      onClick={() => {
                        setMenuOpen(false);
                        onOpenShortcuts();
                      }}
                    >
                      <Keyboard size={16} />
                      اختصارات
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
