import type { ReactElement } from "react";
import { ensurePdfFontsLoaded } from "./pdfFonts";

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

export async function openPdf(component: ReactElement): Promise<void> {
  const blob = await generatePdfBlob(component);
  const url = URL.createObjectURL(blob);
  const tab = window.open(url, "_blank", "noopener,noreferrer");
  if (!tab) {
    // popup blocked — still revoke later
  }
  setTimeout(() => URL.revokeObjectURL(url), 120_000);
}
