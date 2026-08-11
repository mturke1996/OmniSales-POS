import { useState } from "react";
import {
  WifiHigh,
  WarningCircle,
  Keyboard,
  Lock,
  CloudArrowUp,
  List,
  MagnifyingGlass,
  Sparkle,
  DotsThreeOutline,
  DownloadSimple,
  DeviceMobile,
} from "@phosphor-icons/react";
import { useOnline } from "../hooks/use-online";
import { cn } from "../lib/cn";
import { PwaInstallButton } from "./pwa/PwaInstallBanner";
import { usePwaInstall } from "../hooks/use-pwa-install";
import { APK_FILENAME, mainMenuApkDownloadUrl, shouldOfferApkDownload } from "../lib/app-download";

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
  const [menuOpen, setMenuOpen] = useState(false);
  const pwa = usePwaInstall();
  const showApk = shouldOfferApkDownload(runtime);

  return (
    <header className="mobile-top-bar sticky top-0 z-30 shrink-0 safe-top">
      <div className="flex h-[var(--topbar-inner)] items-center px-3 sm:px-4">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {onMenuOpen && (
              <button
                type="button"
                onClick={onMenuOpen}
                className="mobile-icon-btn lg:hidden"
                aria-label="فتح القائمة"
              >
                <List size={20} weight="bold" />
              </button>
            )}

            <div className="sidebar-brand-mark grid h-9 w-9 shrink-0 place-items-center lg:grid">
              <Sparkle size={17} weight="fill" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold tracking-tight text-ink">
                {branchName || "OmniSales"}
              </p>
              {cashierName && (
                <p className="truncate text-[10px] text-ink-mute">{cashierName}</p>
              )}
            </div>
          </div>

          {onOpenCommand && (
            <button
              type="button"
              onClick={onOpenCommand}
              className="mobile-icon-btn shrink-0 lg:hidden"
              aria-label="بحث سريع"
            >
              <MagnifyingGlass size={18} />
            </button>
          )}

          {onOpenCommand && (
            <button
              type="button"
              onClick={onOpenCommand}
              className="hidden max-w-sm flex-1 items-center gap-2 rounded-xl border border-paper-line/50 bg-paper/80 px-3 py-2.5 text-start shadow-sm transition hover:border-highlight/30 lg:flex"
            >
              <MagnifyingGlass size={16} className="text-ink-mute" />
              <span className="min-w-0 flex-1 text-xs text-ink-mute">بحث سريع في النظام…</span>
              <kbd className="rounded-md border border-paper-line/60 bg-paper-raised px-1.5 py-0.5 font-mono text-[10px] text-ink-mute">
                ⌘K
              </kbd>
            </button>
          )}

          <div className="flex shrink-0 items-center gap-1">
            {pendingSync > 0 && (
              <span
                className="inline-flex h-9 items-center gap-1 rounded-xl border border-highlight/20 bg-highlight/10 px-2 text-[11px] font-semibold text-highlight"
                title={`${pendingSync} عملية بانتظار الرفع`}
              >
                <CloudArrowUp size={14} weight="bold" />
                <span className="tabular-nums">{pendingSync}</span>
              </span>
            )}

            <div
              className={cn(
                "inline-flex h-9 items-center justify-center gap-1 rounded-xl border px-2",
                isOnline
                  ? "border-success/20 bg-success/10 text-success"
                  : "border-warning/25 bg-warning/10 text-warning"
              )}
              title={isOnline ? "متصل" : "دون اتصال"}
            >
              {isOnline ? (
                <WifiHigh size={15} weight="bold" />
              ) : (
                <WarningCircle size={15} weight="bold" />
              )}
            </div>

            {onLock && (
              <button
                type="button"
                onClick={onLock}
                className="mobile-icon-btn hidden sm:grid"
                title="قفل الجلسة"
                aria-label="قفل الجلسة"
              >
                <Lock size={15} weight="bold" />
              </button>
            )}

            <div className="relative lg:hidden">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="mobile-icon-btn"
                aria-label="المزيد"
                aria-expanded={menuOpen}
              >
                <DotsThreeOutline size={20} weight="fill" />
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
                    {onLock && (
                      <MenuRow
                        icon={<Lock size={16} />}
                        label="قفل الجلسة"
                        onClick={() => {
                          setMenuOpen(false);
                          onLock();
                        }}
                      />
                    )}
                    {onOpenShortcuts && (
                      <MenuRow
                        icon={<Keyboard size={16} />}
                        label="اختصارات"
                        onClick={() => {
                          setMenuOpen(false);
                          onOpenShortcuts();
                        }}
                      />
                    )}
                    {showApk && (
                      <a
                        href={mainMenuApkDownloadUrl()}
                        download={APK_FILENAME}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold text-ink transition hover:bg-paper"
                        onClick={() => setMenuOpen(false)}
                      >
                        <DeviceMobile size={16} className="text-highlight" />
                        تحميل APK
                      </a>
                    )}
                    {!pwa.installed && runtime === "pwa" && (
                      <div className="px-1 pt-1">
                        <PwaInstallButton className="btn-ghost w-full justify-start gap-2 px-3 py-2 text-xs font-bold" />
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="hidden items-center gap-1 lg:flex">
              <PwaInstallButton />
              {showApk && (
                <a
                  href={mainMenuApkDownloadUrl()}
                  download={APK_FILENAME}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-highlight/15 px-2.5 text-[11px] font-bold text-highlight"
                >
                  <DownloadSimple size={14} weight="duotone" />
                  APK
                </a>
              )}
              {onOpenShortcuts && (
                <button type="button" onClick={onOpenShortcuts} className="mobile-icon-btn !w-auto px-2.5">
                  <Keyboard size={14} />
                  <span className="text-[11px] font-semibold">اختصارات</span>
                </button>
              )}
              <span className="rounded-lg bg-paper px-2 py-1 font-mono text-[10px] uppercase text-ink-mute">
                {runtime}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function MenuRow({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold text-ink transition hover:bg-paper"
    >
      {icon}
      {label}
    </button>
  );
}
