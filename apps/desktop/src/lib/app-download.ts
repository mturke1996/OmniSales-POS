/** Stable public path for the shipped Android APK (served from /downloads/). */
export const APK_PUBLIC_PATH = "/downloads/OmniSales.apk";

export const APK_FILENAME = "OmniSales.apk";

export function resolveApkDownloadUrl(): string {
  if (typeof window === "undefined") return APK_PUBLIC_PATH;
  const base = import.meta.env.BASE_URL || "/";
  const path = `${base}${APK_PUBLIC_PATH.replace(/^\//, "")}`.replace(/\/+/g, "/");
  try {
    return new URL(path, window.location.href).href;
  } catch {
    return APK_PUBLIC_PATH;
  }
}

export function isAndroidBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

export function shouldOfferApkDownload(runtime: "tauri" | "capacitor" | "pwa"): boolean {
  if (runtime === "capacitor") return false;
  return isAndroidBrowser() || runtime === "pwa";
}
