import { useEffect, useState } from "react";
import { DownloadSimple, DeviceMobile, X, ShareNetwork } from "@phosphor-icons/react";
import { usePwaInstall } from "../../hooks/use-pwa-install";
import { detectRuntime } from "../../lib/native";
import { isAndroidBrowser, resolveApkDownloadUrl, APK_FILENAME } from "../../lib/app-download";

const DISMISS_KEY = "omni.pwa-install-dismissed";

export function PwaInstallBanner() {
  const { canPrompt, installed, showIosTip, promptInstall, ios } = usePwaInstall();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [iosOpen, setIosOpen] = useState(false);

  const runtime = detectRuntime();
  const isBrowserPwa = runtime === "pwa";

  useEffect(() => {
    if (installed) setDismissed(true);
  }, [installed]);

  if (!isBrowserPwa || installed || dismissed) return null;
  if (!canPrompt && !showIosTip && !isAndroidBrowser()) return null;

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
    setIosOpen(false);
  };

  return (
    <>
      <div
        className="pointer-events-none fixed inset-x-0 z-50 px-3 lg:bottom-0 lg:px-4 lg:pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        style={{ bottom: "var(--mobile-nav-offset)" }}
      >
        <div className="pointer-events-auto mx-auto flex max-w-lg animate-fade-up items-center gap-3 rounded-2xl border border-paper-line bg-paper-raised p-3 shadow-lift">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-highlight/12 text-highlight">
            <DeviceMobile size={22} weight="duotone" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-ink">
              {ios ? "ثبّت OmniSales على iPhone" : "ثبّت OmniSales على الهاتف"}
            </p>
            <p className="truncate text-[11px] text-ink-mute">
              {ios
                ? "يعمل كتطبيق · دون اتصال · شاشة كاملة"
                : "PWA · دون اتصال · شاشة كاملة"}
            </p>
          </div>
          {canPrompt ? (
            <button
              type="button"
              className="btn-primary shrink-0 gap-1 px-3 py-2 text-[11px] font-bold"
              onClick={() => void promptInstall().then((ok) => ok && dismiss())}
            >
              <DownloadSimple size={14} weight="bold" />
              تثبيت
            </button>
          ) : isAndroidBrowser() ? (
            <a
              href={resolveApkDownloadUrl()}
              download={APK_FILENAME}
              className="btn-primary shrink-0 gap-1 px-3 py-2 text-[11px] font-bold"
              onClick={dismiss}
            >
              <DownloadSimple size={14} weight="bold" />
              APK
            </a>
          ) : (
            <button
              type="button"
              className="btn-primary shrink-0 px-3 py-2 text-[11px] font-bold"
              onClick={() => setIosOpen(true)}
            >
              كيف؟
            </button>
          )}
          <button
            type="button"
            onClick={dismiss}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-mute hover:bg-paper"
            aria-label="إخفاء"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {iosOpen && (
        <div
          className="fixed inset-0 z-[70] flex animate-fade-up items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
          onClick={dismiss}
        >
          <div
            className="w-full max-w-sm animate-slide-up rounded-2xl border border-paper-line bg-paper-raised p-5 shadow-lift safe-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-highlight/12 text-highlight">
                <ShareNetwork size={26} weight="duotone" className="animate-bounce-soft" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-ink">إضافة للشاشة الرئيسية</h3>
                <p className="text-[11px] text-ink-mute">Safari على iPhone / iPad</p>
              </div>
            </div>
            <ol className="mt-4 list-decimal space-y-2.5 pe-4 text-xs leading-relaxed text-ink-soft">
              <li>
                اضغط زر <strong>المشاركة</strong> أسفل Safari (المربع مع السهم للأعلى).
              </li>
              <li>
                مرّر للأسفل واختر <strong>«إضافة إلى الشاشة الرئيسية»</strong>.
              </li>
              <li>
                اضغط <strong>«إضافة»</strong> — يفتح OmniSales كتطبيق مستقل بملء الشاشة.
              </li>
            </ol>
            <p className="mt-3 rounded-xl bg-paper px-3 py-2 text-[10px] text-ink-mute">
              ملاحظة: التثبيت يعمل من Safari فقط. Chrome على iOS لا يدعم PWA كاملاً.
            </p>
            <button
              type="button"
              className="btn-primary mt-4 w-full text-xs font-bold"
              onClick={dismiss}
            >
              حسناً
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/** Compact install control for StatusBar / Settings */
export function PwaInstallButton({ className }: { className?: string }) {
  const { canPrompt, installed, showIosTip, promptInstall } = usePwaInstall();
  const [iosOpen, setIosOpen] = useState(false);
  const runtime = detectRuntime();

  if (runtime !== "pwa" || installed) return null;
  if (!canPrompt && !showIosTip) return null;

  return (
    <>
      <button
        type="button"
        className={
          className ??
          "inline-flex items-center gap-1.5 rounded-lg bg-highlight/12 px-2 py-1 text-[11px] font-bold text-highlight transition hover:bg-highlight/20"
        }
        onClick={() => {
          if (canPrompt) void promptInstall();
          else setIosOpen(true);
        }}
        title="تثبيت التطبيق"
      >
        <DownloadSimple size={13} weight="bold" />
        <span className="hidden sm:inline">تثبيت</span>
      </button>
      {iosOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
          onClick={() => setIosOpen(false)}
        >
          <div
            className="w-full max-w-sm animate-slide-up rounded-2xl border border-paper-line bg-paper-raised p-5 shadow-lift"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-bold text-ink">إضافة للشاشة الرئيسية</h3>
            <ol className="mt-3 list-decimal space-y-2 pe-4 text-xs leading-relaxed text-ink-soft">
              <li>Safari → زر المشاركة.</li>
              <li>«إضافة إلى الشاشة الرئيسية».</li>
              <li>«إضافة».</li>
            </ol>
            <button
              type="button"
              className="btn-primary mt-4 w-full text-xs font-bold"
              onClick={() => setIosOpen(false)}
            >
              حسناً
            </button>
          </div>
        </div>
      )}
    </>
  );
}
