/** Stable public path for the shipped Android APK (served from /downloads/). */
export const APK_PUBLIC_PATH = "/downloads/OmniSales.apk";

export const APK_FILENAME = "OmniSales.apk";

/** Direct download from GitHub main branch (works from README / anywhere). */
export const GITHUB_APK_URL =
  "https://github.com/mturke1996/OmniSales-POS/raw/main/apps/desktop/public/downloads/OmniSales.apk";

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
  // Already running inside the Android APK — hide download entry.
  if (runtime === "capacitor") return false;
  return true;
}

/** Main-menu download always points at GitHub main (stable even before Vercel deploy). */
export function mainMenuApkDownloadUrl(): string {
  return GITHUB_APK_URL;
}
