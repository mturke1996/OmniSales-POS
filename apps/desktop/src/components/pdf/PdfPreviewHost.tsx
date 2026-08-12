import { useCallback, useEffect, useState } from "react";
import { DownloadSimple, ShareNetwork, X } from "@phosphor-icons/react";
import {
  registerPdfPreviewHandler,
  type PdfPreviewPayload,
} from "../../lib/pdf/pdfPreview";
import { downloadPdfNative, sharePdfNative } from "../../lib/pdf/pdfNative";
import { detectRuntime } from "../../lib/native";
import { pushOverlayCloser } from "../../lib/overlay-back";
import { cn } from "../../lib/cn";

export function PdfPreviewHost() {
  const [preview, setPreview] = useState<PdfPreviewPayload | null>(null);

  const close = useCallback(() => {
    setPreview((current) => {
      if (current?.revokeOnClose !== false && current?.url.startsWith("blob:")) {
        URL.revokeObjectURL(current.url);
      }
      return null;
    });
  }, []);

  useEffect(() => {
    registerPdfPreviewHandler((payload) => setPreview(payload));
    return () => registerPdfPreviewHandler(null);
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
      className="fixed inset-0 z-[100] flex flex-col bg-ink/70 backdrop-blur-sm"
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
        {isNative && (
          <p className="mb-2 rounded-xl bg-highlight/10 px-3 py-2 text-center text-[11px] font-bold text-ink">
            إن لم تظهر الفاتورة في المعاينة اضغط مشاركة لفتحها في تطبيق PDF ثم ارجع وأغلق
          </p>
        )}
        <iframe
          title={preview.title}
          src={preview.url}
          className="h-full w-full rounded-xl border border-paper-line bg-white shadow-soft"
        />
      </div>
      <div
        className={cn(
          "grid shrink-0 gap-2 border-t border-white/10 bg-sidebar px-3 py-3",
          "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
          isNative ? "grid-cols-3" : "grid-cols-1"
        )}
      >
        {isNative && (
          <>
            <button
              type="button"
              className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-2xl bg-white/15 px-3 text-sm font-bold text-white"
              onClick={() =>
                void sharePdfNative(preview.blob, preview.filename, preview.title)
              }
            >
              <ShareNetwork size={18} weight="duotone" />
              مشاركة
            </button>
            <button
              type="button"
              className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-2xl bg-highlight px-3 text-sm font-bold text-white"
              onClick={() =>
                void downloadPdfNative(preview.blob, preview.filename, preview.title)
              }
            >
              <DownloadSimple size={18} weight="duotone" />
              حفظ
            </button>
          </>
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
