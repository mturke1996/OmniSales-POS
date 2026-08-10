import type { ReactElement } from "react";
import { detectRuntime } from "../native";
import { ensurePdfFontsLoaded } from "./pdfFonts";
import { downloadPdfNative } from "./pdfNative";
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
  const url = URL.createObjectURL(blob);

  if (showPdfPreview({ url, title, filename, blob })) return;

  try {
    const tab = window.open(url, "_blank", "noopener,noreferrer");
    if (!tab) window.location.href = url;
  } catch {
    window.location.href = url;
  }
  setTimeout(() => URL.revokeObjectURL(url), 120_000);
}
