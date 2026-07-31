import {
  WifiHigh,
  WarningCircle,
  Keyboard,
  Lock,
  CloudArrowUp,
  List,
} from "@phosphor-icons/react";
import { useOnline } from "../hooks/use-online";
import { PwaInstallButton } from "./pwa/PwaInstallBanner";

export function StatusBar({
  runtime,
  branchName,
  cashierName,
  pendingSync = 0,
  onOpenShortcuts,
  onLock,
  onMenuOpen,
}: {
  runtime: "tauri" | "capacitor" | "pwa";
  branchName: string;
  cashierName?: string;
  pendingSync?: number;
  onOpenShortcuts?: () => void;
  onLock?: () => void;
  /** Phone / tablet — open nav drawer */
  onMenuOpen?: () => void;
}) {
  const isOnline = useOnline();

  return (
    <header className="sticky top-0 z-30 border-b border-paper-line/80 bg-paper-raised/95 pt-[env(safe-area-inset-top)] text-xs text-ink backdrop-blur-md">
      <div className="px-3 py-2 sm:px-4">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-2 sm:gap-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            {onMenuOpen && (
              <button
                type="button"
                onClick={onMenuOpen}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-paper-line/70 bg-paper text-ink transition hover:border-highlight/30 hover:bg-highlight/8 active:scale-[0.97] lg:hidden"
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
                <p className="truncate text-[11px] text-ink-mute lg:hidden">
                  {cashierName}
                  <span className="mx-1 text-paper-line">·</span>
                  <span className="font-mono uppercase">{runtime}</span>
                </p>
              )}
            </div>

            {cashierName && (
              <span className="hidden truncate text-ink-mute sm:inline">
                / {cashierName}
              </span>
            )}
            <span className="hidden font-mono uppercase text-ink-mute sm:inline">
              {runtime}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
            {pendingSync > 0 && (
              <span
                className="inline-flex min-h-8 items-center gap-1 rounded-full bg-highlight/10 px-2.5 py-1 font-semibold text-highlight"
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
                className="hidden min-h-9 items-center gap-1.5 rounded-xl bg-paper px-2.5 py-1.5 text-[11px] font-semibold transition hover:bg-highlight/10 sm:inline-flex"
              >
                <Keyboard size={14} />
                <span>اختصارات</span>
              </button>
            )}

            {onLock && (
              <button
                type="button"
                onClick={onLock}
                className="inline-flex min-h-10 min-w-10 items-center justify-center gap-1.5 rounded-xl bg-paper px-2.5 py-2 text-[11px] font-semibold transition hover:bg-danger/10 active:scale-[0.97]"
                title="قفل الجلسة"
                aria-label="قفل الجلسة"
              >
                <Lock size={15} weight="bold" />
                <span className="hidden sm:inline">قفل</span>
              </button>
            )}

            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-paper sm:w-auto sm:gap-1.5 sm:px-2.5"
              title={isOnline ? "متصل" : "دون اتصال"}
            >
              {isOnline ? (
                <span className="inline-flex items-center gap-1 font-medium text-success">
                  <WifiHigh size={15} weight="bold" />
                  <span className="hidden sm:inline">متصل</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-medium text-warning">
                  <WarningCircle size={15} weight="bold" />
                  <span className="hidden sm:inline">دون اتصال</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
