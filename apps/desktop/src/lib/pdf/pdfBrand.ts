/**
 * OmniSales PDF brand — Scout highlight geometry + Valentino/Rkeaz document craft.
 * Keep in sync with CSS --highlight / --ink tokens (scout theme).
 */
export const PDF_INK = {
  text: "#0f172a",
  soft: "#1e293b",
  muted: "#64748b",
  faint: "#94a3b8",
  line: "#e2e8f0",
  pale: "#eef2ff",
  wash: "#f8fafc",
  white: "#ffffff",
  brand: "#6366f1",
  brandDeep: "#4338ca",
  brandLine: "#c7d2fe",
  success: "#059669",
  danger: "#e11d48",
  warning: "#d97706",
} as const;

export const PDF_PAGINATION = {
  footerReserve: 78,
  totalBar: 44,
  tableHead: 36,
} as const;

export const STATUS_AR: Record<string, string> = {
  new: "جديدة",
  in_prep: "قيد التجهيز",
  ready: "جاهزة",
  delivering: "قيد التوصيل",
  completed: "مكتملة",
  cancelled: "ملغاة",
};

export const PAYMENT_AR: Record<string, string> = {
  cash: "نقداً",
  card: "بطاقة",
  transfer: "تحويل",
  debt: "آجل",
  mixed: "مختلط",
};
