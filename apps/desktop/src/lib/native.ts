import { Capacitor } from "@capacitor/core";

export type Runtime = "tauri" | "capacitor" | "pwa";

export function detectRuntime(): Runtime {
  if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
    return "tauri";
  }
  if (Capacitor.isNativePlatform()) {
    return "capacitor";
  }
  return "pwa";
}

export async function initNativeChrome() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: "#0A0A0A" });
  } catch {
    // optional on web
  }
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide();
  } catch {
    // optional
  }
}
