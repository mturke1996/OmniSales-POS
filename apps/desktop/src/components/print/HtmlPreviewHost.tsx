import { useCallback, useEffect, useRef, useState } from "react";
import { Printer, ShareNetwork, X } from "@phosphor-icons/react";
import {
  registerHtmlPreviewHandler,
  type HtmlPreviewPayload,
} from "../../lib/print/html-preview";
import { pushOverlayCloser } from "../../lib/overlay-back";
import { detectRuntime } from "../../lib/native";
import { cn } from "../../lib/cn";

async function shareHtmlNative(html: string, title: string): Promise<boolean> {
  if (detectRuntime() !== "capacitor") return false;
  const { Filesystem, Directory } = await import("@capacitor/filesystem");
  const { Share } = await import("@capacitor/share");
  const safe = title.replace(/[^\w\u0600-\u06FF.-]+/g, "_").slice(0, 40) || "receipt";
  const bytes = new TextEncoder().encode(html);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  const written = await Filesystem.writeFile({
    path: `${safe}.html`,
    data: btoa(binary),
    directory: Directory.Cache,
    recursive: true,
  });
  try {
    await Share.share({
      title,
      dialogTitle: title,
      url: written.uri,
    });
    return true;
  } catch (e) {
    if (e instanceof Error && /cancel/i.test(e.message)) return false;
    throw e;
  }
}

export function HtmlPreviewHost() {
  const [preview, setPreview] = useState<HtmlPreviewPayload | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = useCallback(() => {
    setPreview(null);
    setError(null);
    setBusy(false);
  }, []);

  useEffect(() => {
    registerHtmlPreviewHandler((payload) => {
      setError(null);
      setPreview(payload);
    });
    return () => registerHtmlPreviewHandler(null);
  }, []);

  useEffect(() => {
    if (!preview) return;
    return pushOverlayCloser(() => {
      close();
      return true;
    });
  }, [preview, close]);

  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [preview, close]);

  if (!preview) return null;

  const isNative = detectRuntime() === "capacitor";

  return (
    <div
      className="fixed inset-0 z-[110] flex flex-col bg-ink/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={preview.title}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-sidebar px-3 py-2.5 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <p className="min-w-0 truncate text-sm font-bold text-white">{preview.title}</p>
        <button
          type="button"
          className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/15 text-white"
          onClick={close}
          aria-label="إغلاق"
        >
          <X size={22} weight="bold" />
        </button>
      </div>

      <div className="min-h-0 flex-1 bg-paper p-2">
        <iframe
          ref={iframeRef}
          title={preview.title}
          srcDoc={preview.html}
          className="h-full w-full rounded-xl border border-paper-line bg-white shadow-soft"
        />
      </div>

      {error && (
        <p className="shrink-0 bg-danger/15 px-4 py-2 text-center text-xs font-bold text-danger">
          {error}
        </p>
      )}

      <div
        className={cn(
          "grid shrink-0 gap-2 border-t border-white/10 bg-sidebar px-3 py-3",
          "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
          isNative ? "grid-cols-3" : "grid-cols-2"
        )}
      >
        <button
          type="button"
          className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-2xl bg-highlight px-3 text-sm font-bold text-white"
          disabled={busy}
          onClick={() => {
            try {
              iframeRef.current?.contentWindow?.focus();
              iframeRef.current?.contentWindow?.print();
            } catch (e) {
              setError(e instanceof Error ? e.message : "تعذر فتح حوار الطباعة");
            }
          }}
        >
          <Printer size={18} weight="duotone" />
          طباعة
        </button>
        {isNative && (
          <button
            type="button"
            className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-2xl bg-white/15 px-3 text-sm font-bold text-white"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              setError(null);
              void shareHtmlNative(preview.html, preview.title)
                .catch((e) =>
                  setError(e instanceof Error ? e.message : "تعذر المشاركة")
                )
                .finally(() => setBusy(false));
            }}
          >
            <ShareNetwork size={18} weight="duotone" />
            مشاركة
          </button>
        )}
        <button
          type="button"
          className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-white/15 px-3 text-sm font-bold text-white"
          onClick={close}
        >
          إغلاق
        </button>
      </div>
    </div>
  );
}
