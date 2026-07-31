/**
 * Arabic helpers for @react-pdf/renderer + Tajawal
 * (rkeaz-group / ValentinoPOS pattern — logical Unicode only).
 */

const HAS_ARABIC = /[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

export function ar(text: string | number | null | undefined): string {
  if (text == null) return "";
  return String(text);
}

export function arMixed(text: string | number | null | undefined): string {
  return ar(text);
}

/** Isolate LTR runs (phones, refs, amounts) for stable Arabic PDF BiDi. */
export function ltr(text: string | number | null | undefined): string {
  if (text == null) return "";
  const s = String(text);
  if (!s) return "";
  return `\u200E${s}\u200E`;
}

function groupNumber(n: number, decimals = 2): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number.isFinite(n) ? Math.abs(n) : 0);
}

/** LTR money fragment: «د.ل 1,234.00» — render with flexDirection row-reverse. */
export function arMoney(amount: number, currency = "د.ل", decimals = 2): string {
  const sign = amount < 0 ? "-" : "";
  const curr = String(currency ?? "").trim();
  return `${sign}${curr}\u00A0${groupNumber(amount, decimals)}`;
}

export function arDate(d: string | Date): string {
  try {
    const dt =
      typeof d === "string"
        ? new Date(d.includes("T") ? d : `${d.slice(0, 10)}T12:00:00`)
        : d;
    if (Number.isNaN(dt.getTime())) return "—";
    return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()}`;
  } catch {
    return String(d ?? "");
  }
}

export function arDateTime(d: string | Date): string {
  try {
    const dt = typeof d === "string" ? new Date(d) : d;
    if (Number.isNaN(dt.getTime())) return "—";
    const date = arDate(dt);
    const time = dt.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return `${date} ${time}`;
  } catch {
    return String(d ?? "");
  }
}

export function pdfDisplayValue(text: string | number | null | undefined): string {
  if (text == null) return "";
  const str = String(text);
  if (!str) return "";
  if (!HAS_ARABIC.test(str)) return str;
  return ar(str);
}
