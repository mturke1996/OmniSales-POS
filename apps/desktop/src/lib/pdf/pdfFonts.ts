import { Font } from "@react-pdf/renderer";

/** Same stack as rkeaz-group / ValentinoPOS — Tajawal for Arabic PDF. */
export const PDF_FONT_FAMILY = "OmniPdf";

let registered = false;
let loadPromise: Promise<void> | null = null;

function fontAssetUrl(file: string): string {
  const base = import.meta.env.BASE_URL || "/";
  const rel = `${base}fonts/${file}`.replace(/\/+/g, "/");
  if (typeof window === "undefined") return rel;
  try {
    return new URL(rel, window.location.href).href;
  } catch {
    return rel;
  }
}

export function registerPdfFonts(): void {
  if (registered || typeof window === "undefined") return;
  try {
    Font.register({
      family: PDF_FONT_FAMILY,
      fonts: [
        {
          src: fontAssetUrl("Tajawal-Regular.ttf"),
          fontWeight: 400,
          fontStyle: "normal",
        },
        {
          src: fontAssetUrl("Tajawal-Bold.ttf"),
          fontWeight: 700,
          fontStyle: "normal",
        },
      ],
    });
    Font.registerHyphenationCallback((word) => [word]);
    registered = true;
  } catch {
    /* duplicate registration */
  }
}

export async function ensurePdfFontsLoaded(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!loadPromise) {
    loadPromise = (async () => {
      registerPdfFonts();
      await Promise.all([
        Font.load({ fontFamily: PDF_FONT_FAMILY, fontWeight: 400, fontStyle: "normal" }),
        Font.load({ fontFamily: PDF_FONT_FAMILY, fontWeight: 700, fontStyle: "normal" }),
      ]);
    })().catch((err) => {
      loadPromise = null;
      throw err;
    });
  }
  return loadPromise;
}

if (typeof window !== "undefined") {
  registerPdfFonts();
}
