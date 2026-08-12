import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { openHtmlDocument, shouldUseInAppHtmlPreview } from "./open-print";
import { registerHtmlPreviewHandler, stripDocumentScripts } from "./html-preview";

describe("shouldUseInAppHtmlPreview", () => {
  it("is required on Capacitor so window.open cannot hijack the WebView", () => {
    expect(shouldUseInAppHtmlPreview("capacitor")).toBe(true);
    expect(shouldUseInAppHtmlPreview("pwa")).toBe(false);
    expect(shouldUseInAppHtmlPreview("tauri")).toBe(false);
  });
});

describe("stripDocumentScripts", () => {
  it("removes auto-print scripts before in-app iframe preview", () => {
    const html = `<html><body>ok<script>window.print()</script></body></html>`;
    expect(stripDocumentScripts(html)).toBe("<html><body>ok</body></html>");
  });
});

describe("openHtmlDocument", () => {
  const open = vi.fn();

  beforeEach(() => {
    open.mockReset();
    vi.stubGlobal("window", { open });
    registerHtmlPreviewHandler(null);
  });

  afterEach(() => {
    registerHtmlPreviewHandler(null);
    vi.unstubAllGlobals();
  });

  it("never calls window.open on Capacitor", () => {
    const seen: string[] = [];
    registerHtmlPreviewHandler((p) => seen.push(p.title));
    openHtmlDocument("<html></html>", "فاتورة", { runtime: "capacitor" });
    expect(open).not.toHaveBeenCalled();
    expect(seen).toEqual(["فاتورة"]);
  });

  it("writes into a popup on desktop when available", () => {
    const doc = { open: vi.fn(), write: vi.fn(), close: vi.fn() };
    open.mockReturnValue({ document: doc });
    openHtmlDocument("<html>x</html>", "Z", { runtime: "pwa" });
    expect(open).toHaveBeenCalled();
    expect(doc.write).toHaveBeenCalledWith("<html>x</html>");
  });

  it("falls back to in-app preview when the popup is blocked", () => {
    open.mockReturnValue(null);
    const seen: string[] = [];
    registerHtmlPreviewHandler((p) => seen.push(p.title));
    openHtmlDocument("<html></html>", "ملخص", { runtime: "pwa" });
    expect(seen).toEqual(["ملخص"]);
  });
});
