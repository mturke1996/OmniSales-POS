export type ThemePresetKey = "scout" | "slate" | "forest" | "coral" | "mono";

export interface ThemePreset {
  key: ThemePresetKey;
  label_ar: string;
  description_ar: string;
  accent: string;
  highlight: string;
  paper: string;
  sidebar: string;
  previewClass: string;
}

/** DomainScout-clean SaaS themes — violet brand is intentional (reference override). */
export const THEME_PRESETS: ThemePreset[] = [
  {
    key: "scout",
    label_ar: "Scout",
    description_ar: "سايدبار داكن + بنفسجي كهربائي — أسلوب DomainScout",
    accent: "#0f172a",
    highlight: "#6366f1",
    paper: "#f4f6fb",
    sidebar: "#0b1220",
    previewClass: "bg-[#0b1220] text-white",
  },
  {
    key: "slate",
    label_ar: "Slate",
    description_ar: "رمادي بارد مع أزرق كهربائي",
    accent: "#0f172a",
    highlight: "#0ea5e9",
    paper: "#f1f5f9",
    sidebar: "#0f172a",
    previewClass: "bg-[#0f172a] text-white",
  },
  {
    key: "forest",
    label_ar: "Forest",
    description_ar: "زمردي تشغيلي هادئ",
    accent: "#052e1c",
    highlight: "#10b981",
    paper: "#f3faf6",
    sidebar: "#0b1f17",
    previewClass: "bg-[#0b1f17] text-white",
  },
  {
    key: "coral",
    label_ar: "Coral",
    description_ar: "مرجاني دافئ للنقاط البيع السريعة",
    accent: "#1c1917",
    highlight: "#f97316",
    paper: "#faf7f5",
    sidebar: "#1c1917",
    previewClass: "bg-[#1c1917] text-white",
  },
  {
    key: "mono",
    label_ar: "Mono",
    description_ar: "مونوكروم زنك عالي التباين",
    accent: "#18181b",
    highlight: "#71717a",
    paper: "#fafafa",
    sidebar: "#18181b",
    previewClass: "bg-[#18181b] text-white",
  },
];

export function applyTheme(key: ThemePresetKey) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", key);
  localStorage.setItem("omni_theme_key", key);

  const preset = THEME_PRESETS.find((t) => t.key === key);
  if (preset) {
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", preset.highlight);
  }
}

export function getInitialTheme(): ThemePresetKey {
  if (typeof localStorage === "undefined") return "scout";
  const saved = localStorage.getItem("omni_theme_key") as ThemePresetKey | null;
  if (saved && THEME_PRESETS.some((t) => t.key === saved)) {
    return saved;
  }
  return "scout";
}

export function isThemeKey(value: string): value is ThemePresetKey {
  return THEME_PRESETS.some((t) => t.key === value);
}
