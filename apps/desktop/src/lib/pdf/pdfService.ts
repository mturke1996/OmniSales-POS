import type { ReactElement } from "react";
import { detectRuntime } from "../native";
import { ensurePdfFontsLoaded } from "./pdfFonts";
import { downloadPdfNative, nativePdfPreviewUrl, sharePdfNative } from "./pdfNative";
import { showPdfPreview } from "./pdfPreview";

export async function generatePdfBlob(component: ReactElement): Promise<Blob> {
  await ensurePdfFontsLoaded();
  const { pdf } = await import("@react-pdf/renderer");
  const asPdf = pdf();
  asPdf.updateContainer(component);
  return asPdf.toBlob();
}

export async function downloadPdf(
  component: ReactElement,
  filename: string
): Promise<void> {
  const blob = await generatePdfBlob(component);
  const name = filename.replace(/\.pdf$/i, "") + ".pdf";

  if (detectRuntime() === "capacitor") {
    const saved = await downloadPdfNative(blob, name, "فاتورة PDF");
    if (saved) return;
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export async function openPdf(
  component: ReactElement,
  opts?: { title?: string; filename?: string }
): Promise<void> {
  const blob = await generatePdfBlob(component);
  const filename = (opts?.filename ?? "invoice").replace(/\.pdf$/i, "") + ".pdf";
  const title = opts?.title ?? "معاينة فاتورة PDF";

  if (detectRuntime() === "capacitor") {
    try {
      const url = await nativePdfPreviewUrl(blob, filename);
      if (showPdfPreview({ url, title, filename, blob, revokeOnClose: false })) {
        return;
      }
    } catch {
      // Share sheet is the reliable native fallback when preview host is missing.
    }
    await sharePdfNative(blob, filename, title);
    return;
  }

  const url = URL.createObjectURL(blob);
  if (showPdfPreview({ url, title, filename, blob, revokeOnClose: true })) return;

  try {
    const tab = window.open(url, "_blank", "noopener,noreferrer");
    if (!tab) {
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    }
  } catch {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }
  setTimeout(() => URL.revokeObjectURL(url), 120_000);
}
