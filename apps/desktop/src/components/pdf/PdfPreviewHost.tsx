import { useCallback, useEffect, useState } from "react";
import { DownloadSimple, ShareNetwork, X } from "@phosphor-icons/react";
import {
  registerPdfPreviewHandler,
  type PdfPreviewPayload,
} from "../../lib/pdf/pdfPreview";
import { downloadPdfNative, sharePdfNative } from "../../lib/pdf/pdfNative";
import { detectRuntime } from "../../lib/native";

export function PdfPreviewHost() {
  const [preview, setPreview] = useState<PdfPreviewPayload | null>(null);

  const close = useCallback(() => {
    setPreview((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return null;
    });
  }, []);

  useEffect(() => {
    registerPdfPreviewHandler((payload) => setPreview(payload));
    return () => registerPdfPreviewHandler(null);
  }, []);

  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [preview, close]);

  if (!preview) return null;

  const isNative = detectRuntime() === "capacitor";

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-ink/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={preview.title}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-sidebar px-3 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))]">
        <p className="truncate text-sm font-bold text-white">{preview.title}</p>
        <div className="flex shrink-0 items-center gap-1.5">
          {isNative && (
            <>
              <button
                type="button"
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-white/10 px-2.5 text-xs font-bold text-white"
                onClick={() =>
                  void sharePdfNative(preview.blob, preview.filename, preview.title)
                }
              >
                <ShareNetwork size={16} weight="duotone" />
                مشاركة
              </button>
              <button
                type="button"
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-highlight px-2.5 text-xs font-bold text-white"
                onClick={() =>
                  void downloadPdfNative(preview.blob, preview.filename, preview.title)
                }
              >
                <DownloadSimple size={16} weight="duotone" />
                حفظ
              </button>
            </>
          )}
          <button
            type="button"
            className="grid min-h-9 min-w-9 place-items-center rounded-lg bg-white/10 text-white"
            onClick={close}
            aria-label="إغلاق"
          >
            <X size={18} weight="bold" />
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 bg-paper p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <iframe
          title={preview.title}
          src={preview.url}
          className="h-full w-full rounded-xl border border-paper-line bg-white shadow-soft"
        />
      </div>
    </div>
  );
}
