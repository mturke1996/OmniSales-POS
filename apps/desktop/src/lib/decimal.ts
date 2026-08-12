/** Parse and sanitize decimal fields for RTL / Android WebView keyboards. */

const ALLOWED = /[0-9.\u0660-\u0669\u06F0-\u06F9,٫،-]/g;

function fromArabicDigit(ch: string): string {
  const code = ch.codePointAt(0);
  if (code == null) return ch;
  if (code >= 0x0660 && code <= 0x0669) return String(code - 0x0660);
  if (code >= 0x06f0 && code <= 0x06f9) return String(code - 0x06f0);
  return ch;
}

export function sanitizeDecimalInput(raw: string): string {
  const chars = raw.match(ALLOWED) ?? [];
  let out = "";
  let sep = false;
  let signed = false;
  for (const ch of chars) {
    if (ch === "-") {
      if (!out && !signed) {
        out = "-";
        signed = true;
      }
      continue;
    }
    if (ch === "." || ch === "," || ch === "٫" || ch === "،") {
      if (sep) continue;
      out += ".";
      sep = true;
      continue;
    }
    out += fromArabicDigit(ch);
  }
  return out;
}

export function parseDecimal(raw: string, fallback = 0): number {
  const cleaned = sanitizeDecimalInput(raw);
  if (!cleaned || cleaned === "-" || cleaned === "." || cleaned === "-.") {
    return fallback;
  }
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : fallback;
}

export function decimalFieldValue(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "";
  if (n === 0) return "0";
  return String(n);
}
