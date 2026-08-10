import {
  WifiHigh,
  WarningCircle,
  Keyboard,
  Lock,
  CloudArrowUp,
  List,
  MagnifyingGlass,
} from "@phosphor-icons/react";
import { useOnline } from "../hooks/use-online";
import { cn } from "../lib/cn";
import { PwaInstallButton } from "./pwa/PwaInstallBanner";

export function StatusBar({
  runtime,
  branchName,
  cashierName,
  pendingSync = 0,
  onOpenShortcuts,
  onOpenCommand,
  onLock,
  onMenuOpen,
}: {
  runtime: "tauri" | "capacitor" | "pwa";
  branchName: string;
  cashierName?: string;
  pendingSync?: number;
  onOpenShortcuts?: () => void;
  onOpenCommand?: () => void;
  onLock?: () => void;
  onMenuOpen?: () => void;
}) {
  const isOnline = useOnline();

  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-paper-line/80 bg-paper-raised/95 safe-top backdrop-blur-md">
      <div className="flex h-[var(--topbar-height)] items-center px-3 sm:px-4">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-2 sm:gap-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            {onMenuOpen && (
              <button
                type="button"
                onClick={onMenuOpen}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-paper-line/70 bg-paper text-ink transition hover:border-highlight/30 hover:bg-highlight/8 active:scale-[0.97] lg:hidden"
                aria-label="فتح القائمة"
              >
                <List size={20} weight="bold" />
              </button>
            )}

            <div className="min-w-0">
              <p className="truncate text-sm font-bold tracking-tight text-ink">
                {branchName || "OmniSales"}
              </p>
              {cashierName && (
                <p className="truncate text-[10px] text-ink-mute lg:hidden">
                  {cashierName}
                </p>
              )}
            </div>

            {cashierName && (
              <span className="hidden truncate text-xs text-ink-mute md:inline">
                / {cashierName}
              </span>
            )}
          </div>

          {onOpenCommand && (
            <>
              <button
                type="button"
                onClick={onOpenCommand}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-paper-line/70 bg-paper text-ink transition hover:border-highlight/30 hover:bg-highlight/8 lg:hidden"
                aria-label="بحث سريع"
              >
                <MagnifyingGlass size={18} />
              </button>
              <button
                type="button"
                onClick={onOpenCommand}
                className="hidden max-w-xs flex-1 items-center gap-2 rounded-xl border border-paper-line/60 bg-paper px-3 py-2 text-start transition hover:border-highlight/30 lg:flex"
              >
                <MagnifyingGlass size={16} className="text-ink-mute" />
                <span className="min-w-0 flex-1 text-xs text-ink-mute">بحث سريع…</span>
                <kbd className="rounded-md bg-paper-raised px-1.5 py-0.5 font-mono text-[10px] text-ink-mute">
                  ⌘K
                </kbd>
              </button>
            </>
          )}

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            {pendingSync > 0 && (
              <span
                className="inline-flex min-h-8 items-center gap-1 rounded-lg bg-highlight/10 px-2 py-1 text-[11px] font-semibold text-highlight"
                title={`${pendingSync} عملية بانتظار الرفع`}
              >
                <CloudArrowUp size={14} weight="bold" />
                <span className="tabular-nums">{pendingSync}</span>
              </span>
            )}

            <PwaInstallButton />

            {onOpenShortcuts && (
              <button
                type="button"
                onClick={onOpenShortcuts}
                className="hidden min-h-9 items-center gap-1.5 rounded-xl bg-paper px-2.5 py-1.5 text-[11px] font-semibold transition hover:bg-highlight/10 md:inline-flex"
              >
                <Keyboard size={14} />
                <span>اختصارات</span>
              </button>
            )}

            {onLock && (
              <button
                type="button"
                onClick={onLock}
                className="inline-flex min-h-9 min-w-9 items-center justify-center gap-1.5 rounded-xl bg-paper px-2.5 py-2 text-[11px] font-semibold transition hover:bg-danger/10 active:scale-[0.97]"
                title="قفل الجلسة"
                aria-label="قفل الجلسة"
              >
                <Lock size={15} weight="bold" />
                <span className="hidden sm:inline">قفل</span>
              </button>
            )}

            <div
              className={cn(
                "flex h-9 items-center justify-center rounded-xl px-2.5 sm:gap-1.5",
                isOnline ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
              )}
              title={isOnline ? "متصل" : "دون اتصال"}
            >
              {isOnline ? (
                <>
                  <WifiHigh size={15} weight="bold" />
                  <span className="hidden text-[11px] font-semibold sm:inline">متصل</span>
                </>
              ) : (
                <>
                  <WarningCircle size={15} weight="bold" />
                  <span className="hidden text-[11px] font-semibold sm:inline">دون اتصال</span>
                </>
              )}
            </div>

            <span className="hidden font-mono text-[10px] uppercase text-ink-mute xl:inline">
              {runtime}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
