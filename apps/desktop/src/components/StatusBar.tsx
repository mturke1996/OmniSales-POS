import {
  WifiHigh,
  WarningCircle,
  Keyboard,
  Lock,
  CloudArrowUp,
  List,
  MagnifyingGlass,
  Sparkle,
} from "@phosphor-icons/react";
import { useOnline } from "../hooks/use-online";
import { cn } from "../lib/cn";
import { PwaInstallButton } from "./pwa/PwaInstallBanner";
import { AppDownloadLink } from "./AppDownloadLink";

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
    <header className="sticky top-0 z-30 shrink-0 border-b border-paper-line/70 bg-paper-raised/92 safe-top backdrop-blur-xl">
      <div className="flex h-[var(--topbar-inner)] items-center px-3 sm:px-4">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-2 sm:gap-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            {onMenuOpen && (
              <button
                type="button"
                onClick={onMenuOpen}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-paper-line/60 bg-paper text-ink shadow-sm transition duration-200 ease-spring hover:border-highlight/30 hover:bg-highlight/8 active:scale-[0.97] lg:hidden"
                aria-label="فتح القائمة"
              >
                <List size={20} weight="bold" />
              </button>
            )}

            <div className="sidebar-brand-mark hidden h-9 w-9 shrink-0 lg:grid">
              <Sparkle size={17} weight="fill" />
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-bold tracking-tight text-ink">
                {branchName || "OmniSales"}
              </p>
              {cashierName && (
                <p className="truncate text-[10px] text-ink-mute lg:hidden">{cashierName}</p>
              )}
            </div>

            {cashierName && (
              <span className="hidden truncate rounded-full bg-paper px-2.5 py-1 text-[11px] font-semibold text-ink-mute md:inline">
                {cashierName}
              </span>
            )}
          </div>

          {onOpenCommand && (
            <>
              <button
                type="button"
                onClick={onOpenCommand}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-paper-line/60 bg-paper text-ink shadow-sm transition hover:border-highlight/30 lg:hidden"
                aria-label="بحث سريع"
              >
                <MagnifyingGlass size={18} />
              </button>
              <button
                type="button"
                onClick={onOpenCommand}
                className="hidden max-w-sm flex-1 items-center gap-2 rounded-xl border border-paper-line/50 bg-paper/80 px-3 py-2.5 text-start shadow-sm transition duration-200 hover:border-highlight/30 hover:bg-paper lg:flex"
              >
                <MagnifyingGlass size={16} className="text-ink-mute" />
                <span className="min-w-0 flex-1 text-xs text-ink-mute">بحث سريع في النظام…</span>
                <kbd className="rounded-md border border-paper-line/60 bg-paper-raised px-1.5 py-0.5 font-mono text-[10px] text-ink-mute">
                  ⌘K
                </kbd>
              </button>
            </>
          )}

          <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
            {pendingSync > 0 && (
              <span
                className="inline-flex min-h-9 items-center gap-1 rounded-xl border border-highlight/20 bg-highlight/10 px-2.5 py-1 text-[11px] font-semibold text-highlight"
                title={`${pendingSync} عملية بانتظار الرفع`}
              >
                <CloudArrowUp size={14} weight="bold" />
                <span className="tabular-nums">{pendingSync}</span>
              </span>
            )}

            <PwaInstallButton />
            <AppDownloadLink compact />

            {onOpenShortcuts && (
              <button
                type="button"
                onClick={onOpenShortcuts}
                className="hidden min-h-9 items-center gap-1.5 rounded-xl border border-paper-line/60 bg-paper px-2.5 py-1.5 text-[11px] font-semibold transition hover:border-highlight/25 md:inline-flex"
              >
                <Keyboard size={14} />
                <span>اختصارات</span>
              </button>
            )}

            {onLock && (
              <button
                type="button"
                onClick={onLock}
                className="inline-flex min-h-9 min-w-9 items-center justify-center gap-1.5 rounded-xl border border-paper-line/60 bg-paper px-2.5 py-2 text-[11px] font-semibold transition hover:border-danger/30 hover:bg-danger/8 active:scale-[0.97]"
                title="قفل الجلسة"
                aria-label="قفل الجلسة"
              >
                <Lock size={15} weight="bold" />
                <span className="hidden sm:inline">قفل</span>
              </button>
            )}

            <div
              className={cn(
                "inline-flex h-9 items-center justify-center gap-1 rounded-xl border px-2.5",
                isOnline
                  ? "border-success/20 bg-success/10 text-success"
                  : "border-warning/25 bg-warning/10 text-warning"
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

            <span className="hidden rounded-lg bg-paper px-2 py-1 font-mono text-[10px] uppercase text-ink-mute xl:inline">
              {runtime}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
