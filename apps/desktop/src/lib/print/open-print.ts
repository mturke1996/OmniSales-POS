import { detectRuntime, type Runtime } from "../native";
import { showHtmlPreview, stripDocumentScripts } from "./html-preview";

/**
 * Open an HTML document for print/preview.
 * Capacitor must never use window.open — an empty popup replaces the app WebView.
 */
export function shouldUseInAppHtmlPreview(runtime: Runtime = detectRuntime()): boolean {
  return runtime === "capacitor";
}

export function openHtmlDocument(
  html: string,
  title: string,
  opts?: { runtime?: Runtime }
): void {
  const runtime = opts?.runtime ?? detectRuntime();
  if (shouldUseInAppHtmlPreview(runtime)) {
    if (!showHtmlPreview({ html: stripDocumentScripts(html), title })) {
      throw new Error("تعذر فتح معاينة الطباعة داخل التطبيق");
    }
    return;
  }

  const win = tryOpenPrintPopup();
  if (!win) {
    if (showHtmlPreview({ html: stripDocumentScripts(html), title })) return;
    throw new Error("تعذر فتح نافذة الطباعة — اسمح بالنوافذ المنبثقة");
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}

function tryOpenPrintPopup(): Window | null {
  try {
    const open = (globalThis as { window?: Window }).window?.open;
    if (typeof open !== "function") return null;
    return open("", "_blank", "width=480,height=720");
  } catch {
    return null;
  }
}
