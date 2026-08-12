import { afterEach, describe, expect, it, vi } from "vitest";
import {
  APK_PUBLIC_PATH,
  GITHUB_APK_URL,
  isAndroidBrowser,
  mainMenuApkDownloadUrl,
  shouldOfferApkDownload,
} from "./app-download";

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubUserAgent(ua: string) {
  vi.stubGlobal("navigator", { userAgent: ua });
}

describe("app-download", () => {
  it("uses stable public APK path", () => {
    expect(APK_PUBLIC_PATH).toBe("/downloads/OmniSales.apk");
  });

  it("main menu links to GitHub main branch APK", () => {
    expect(mainMenuApkDownloadUrl()).toBe(GITHUB_APK_URL);
    expect(GITHUB_APK_URL).toContain("/main/");
  });

  it("offers APK on web/desktop but not inside Android APK shell", () => {
    stubUserAgent("Mozilla/5.0 (Windows NT 10.0)");
    expect(shouldOfferApkDownload("pwa")).toBe(true);
    expect(shouldOfferApkDownload("tauri")).toBe(true);
    expect(shouldOfferApkDownload("capacitor")).toBe(false);
  });

  it("detects Android user agent", () => {
    stubUserAgent("Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36");
    expect(isAndroidBrowser()).toBe(true);
    expect(shouldOfferApkDownload("pwa")).toBe(true);
  });
});
