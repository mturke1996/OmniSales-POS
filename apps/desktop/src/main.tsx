import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { signalPwaUpdate } from "./components/pwa/PwaUpdateToast";
import { detectRuntime, initNativeChrome } from "./lib/native";
import { applyTheme, getInitialTheme } from "./lib/theme";
import { initViewportHeight } from "./hooks/use-viewport-height";
import "./styles/index.css";

declare const __OMNI_NATIVE__: boolean;

const root = document.getElementById("root");
if (!root) {
  throw new Error("root element missing");
}

applyTheme(getInitialTheme());
void initNativeChrome();
initViewportHeight();

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

/** Browser/PWA only — Capacitor/Tauri skip the service worker. */
const runtime = detectRuntime();
if (!__OMNI_NATIVE__ && runtime === "pwa" && "serviceWorker" in navigator) {
  void import("virtual:pwa-register").then(({ registerSW }) => {
    const updateSW = registerSW({
      immediate: true,
      onOfflineReady() {
        console.info("[OmniSales] PWA ready offline");
      },
      onNeedRefresh() {
        signalPwaUpdate(() => {
          void updateSW(true);
        });
      },
    });
  });
}
