import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const host = process.env.TAURI_DEV_HOST;
const isCapacitor = process.env.CAPACITOR === "1";
const isTauri = Boolean(process.env.TAURI_ENV_PLATFORM);
const isNativeShell = isCapacitor || isTauri;

export default defineConfig({
  base: isNativeShell ? "./" : "/",
  define: {
    __OMNI_NATIVE__: JSON.stringify(isNativeShell),
  },
  plugins: [
    react(),
    VitePWA({
      // Prompt so the in-app update toast can confirm reload (native shells skip register).
      registerType: "prompt",
      injectRegister: null,
      includeAssets: [
        "favicon.svg",
        "icons/*.png",
        "icons/*.svg",
        "splash/*.png",
      ],
      manifest: {
        id: "/",
        name: "OmniSales — منظومة مبيعات متكاملة",
        short_name: "OmniSales",
        description:
          "نقطة بيع سريعة متعددة المجالات مع وضع دون اتصال وورديات وتحليلات",
        lang: "ar",
        dir: "rtl",
        start_url: "/?source=pwa",
        scope: "/",
        display: "standalone",
        orientation: "any",
        background_color: "#F4F6FB",
        theme_color: "#F4F6FB",
        categories: ["business", "finance", "productivity"],
        icons: [
          {
            src: "icons/apple-touch-icon.png",
            sizes: "180x180",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icons/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "icons/icon-192.svg",
            sizes: "192x192",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "icons/icon-512.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
        display_override: ["standalone", "minimal-ui", "browser"],
        prefer_related_applications: false,
      },
      workbox: {
        // Main bundle includes PDF renderer (~2.8MB); raise precache ceiling.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        globPatterns: [
          "**/*.{js,css,html,ico,png,svg,woff2,ttf,json,webmanifest}",
        ],
        navigateFallback: "index.html",
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
        // Avoid SW fighting Capacitor/Tauri asset loading
        disableDevLogs: true,
      },
      devOptions: {
        enabled: !isNativeShell,
        type: "module",
      },
    }),
  ],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || true,
    hmr: host ? { protocol: "ws", host, port: 1421 } : undefined,
    watch: { ignored: ["**/src-tauri/**", "**/android/**"] },
  },
  build: {
    target: "esnext",
    sourcemap: !isNativeShell,
    cssCodeSplit: true,
    minify: "esbuild",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("@react-pdf") || id.includes("yoga-layout")) return "vendor-pdf";
          if (id.includes("recharts") || id.includes("d3-")) return "vendor-charts";
          if (id.includes("@tanstack")) return "vendor-table";
          if (id.includes("@phosphor-icons")) return "vendor-icons";
          if (
            id.includes("react-dom") ||
            id.includes("/react/") ||
            id.includes("scheduler")
          ) {
            return "vendor-react";
          }
        },
      },
    },
  },
});
