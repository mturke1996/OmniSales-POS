import { describe, expect, it, afterEach } from "vitest";
import {
  APK_PUBLIC_PATH,
  isAndroidBrowser,
  shouldOfferApkDownload,
} from "./app-download";

const originalUa = globalThis.navigator?.userAgent;

afterEach(() => {
  if (originalUa !== undefined) {
    Object.defineProperty(globalThis.navigator, "userAgent", {
      value: originalUa,
      configurable: true,
    });
  }
});

describe("app-download", () => {
  it("uses stable public APK path", () => {
    expect(APK_PUBLIC_PATH).toBe("/downloads/OmniSales.apk");
  });

  it("offers APK on PWA desktop but not inside native shell", () => {
    Object.defineProperty(globalThis.navigator, "userAgent", {
      value: "Mozilla/5.0 (Windows NT 10.0)",
      configurable: true,
    });
    expect(shouldOfferApkDownload("pwa")).toBe(true);
    expect(shouldOfferApkDownload("capacitor")).toBe(false);
    expect(shouldOfferApkDownload("tauri")).toBe(false);
  });

  it("detects Android user agent", () => {
    const ua = "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36";
    Object.defineProperty(globalThis.navigator, "userAgent", {
      value: ua,
      configurable: true,
    });
    expect(isAndroidBrowser()).toBe(true);
    expect(shouldOfferApkDownload("pwa")).toBe(true);
  });
});
