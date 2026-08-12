/** High-resolution barcode encode + PNG export for shelf labels. */

export type BarcodeFormatName = "ean13" | "ean8" | "upca" | "code128";

const EAN_L = [
  "0001101",
  "0011001",
  "0010011",
  "0111101",
  "0100011",
  "0110001",
  "0101111",
  "0111011",
  "0110111",
  "0001011",
];
const EAN_G = [
  "0100111",
  "0110011",
  "0011011",
  "0100001",
  "0011101",
  "0111001",
  "0000101",
  "0010001",
  "0001001",
  "0010111",
];
const EAN_R = [
  "1110010",
  "1100110",
  "1101100",
  "1000010",
  "1011100",
  "1001110",
  "1010000",
  "1000100",
  "1001000",
  "1110100",
];
const EAN13_PARITY = [
  "LLLLLL",
  "LLGLGG",
  "LLGGLG",
  "LLGGGL",
  "LGLLGG",
  "LGGLLG",
  "LGGGLL",
  "LGLGLG",
  "LGLGGL",
  "LGGLGL",
];

/** CODE128 patterns (values 0–106). Stop is 106. */
const CODE128: string[] = [
  "11011001100","11001101100","11001100110","10010011000","10010001100",
  "10001001100","10011001000","10011000100","10001100100","11001001000",
  "11001000100","11000100100","10110011100","10011011100","10011001110",
  "10111001100","10011101100","10011100110","11001110010","11001011100",
  "11001001110","11011100100","11001110100","11101101110","11101001100",
  "11100101100","11100100110","11101100100","11100110100","11100110010",
  "11011011000","11011000110","11000110110","10100011000","10001011000",
  "10001000110","10110001000","10001101000","10001100010","11010001000",
  "11000101000","11000100010","10110111000","10110001110","10001101110",
  "10111011000","10111000110","10001110110","11101110110","11010001110",
  "11000101110","11011101000","11011100010","11011101110","11101011000",
  "11101000110","11100010110","11101101000","11101100010","11100011010",
  "11101111010","11001000010","11110001010","10100110000","10100001100",
  "10010110000","10010000110","10000101100","10000100110","10110010000",
  "10110000100","10011010000","10011000010","10000110100","10000110010",
  "11000010010","11001010000","11110111010","11000010100","10001111010",
  "10100111100","10010111100","10010011110","10111100100","10011110100",
  "10011110010","11110100100","11110010100","11110010010","11011011110",
  "11011110110","11110110110","10101111000","10100011110","10001011110",
  "10111101000","10111100010","11110101000","11110100010","10111011110",
  "10111101110","11101011110","11110101110","11010000100","11010010000",
  "11010011100","11000111010",
];

const CODE128_STOP = "1100011101011";
const CODE128_START_B = 104;

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function ean13Checksum(d12: string): number {
  const raw = digitsOnly(d12).padStart(12, "0").slice(0, 12);
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const n = Number(raw[i]);
    sum += i % 2 === 0 ? n : n * 3;
  }
  return (10 - (sum % 10)) % 10;
}

export function ean8Checksum(d7: string): number {
  const raw = digitsOnly(d7).padStart(7, "0").slice(0, 7);
  let sum = 0;
  for (let i = 0; i < 7; i++) {
    const n = Number(raw[i]);
    sum += i % 2 === 0 ? n * 3 : n;
  }
  return (10 - (sum % 10)) % 10;
}

export function withEan13Check(d12: string): string {
  const raw = digitsOnly(d12).padStart(12, "0").slice(0, 12);
  return `${raw}${ean13Checksum(raw)}`;
}

/** In-store EAN-13 (prefix 200) with a valid check digit. */
export function generateEan13(): string {
  const body = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join("");
  return withEan13Check(`200${body}`);
}

export function isValidEan13(code: string): boolean {
  const d = digitsOnly(code);
  if (d.length !== 13) return false;
  return ean13Checksum(d.slice(0, 12)) === Number(d[12]);
}

export function isValidEan8(code: string): boolean {
  const d = digitsOnly(code);
  if (d.length !== 8) return false;
  return ean8Checksum(d.slice(0, 7)) === Number(d[7]);
}

export function detectBarcodeFormat(code: string): BarcodeFormatName {
  const trimmed = code.trim();
  const d = digitsOnly(trimmed);
  if (d.length === 13 && d === trimmed && isValidEan13(d)) return "ean13";
  if (d.length === 12 && d === trimmed && isValidEan13(`0${d}`)) return "upca";
  if (d.length === 8 && d === trimmed && isValidEan8(d)) return "ean8";
  return "code128";
}

export function barcodeModules(code: string): string {
  const format = detectBarcodeFormat(code);
  if (format === "ean13") return encodeEan13(digitsOnly(code));
  if (format === "upca") return encodeEan13(`0${digitsOnly(code)}`);
  if (format === "ean8") return encodeEan8(digitsOnly(code));
  return encodeCode128(code.trim() || "0");
}

function encodeEan13(d13: string): string {
  const first = Number(d13[0]);
  const parity = EAN13_PARITY[first];
  let bits = "101";
  for (let i = 0; i < 6; i++) {
    const n = Number(d13[i + 1]);
    bits += parity[i] === "L" ? EAN_L[n] : EAN_G[n];
  }
  bits += "01010";
  for (let i = 7; i < 13; i++) bits += EAN_R[Number(d13[i])];
  bits += "101";
  return bits;
}

function encodeEan8(d8: string): string {
  let bits = "101";
  for (let i = 0; i < 4; i++) bits += EAN_L[Number(d8[i])];
  bits += "01010";
  for (let i = 4; i < 8; i++) bits += EAN_R[Number(d8[i])];
  bits += "101";
  return bits;
}

function encodeCode128(text: string): string {
  const chars = Array.from(text);
  const values: number[] = [CODE128_START_B];
  for (const ch of chars) {
    const code = ch.charCodeAt(0);
    const value = code >= 32 && code <= 127 ? code - 32 : 16; // '?' fallback
    values.push(value);
  }
  let checksum = values[0];
  for (let i = 1; i < values.length; i++) checksum += values[i] * i;
  values.push(checksum % 103);
  return values.map((v) => CODE128[v]).join("") + CODE128_STOP;
}

export type BarcodeRenderOptions = {
  scale?: number;
  barHeight?: number;
  includeText?: boolean;
  quietModules?: number;
};

export function renderBarcodeCanvas(
  code: string,
  options: BarcodeRenderOptions = {},
): HTMLCanvasElement {
  const scale = Math.max(2, options.scale ?? 8);
  const barHeight = options.barHeight ?? 220;
  const quiet = options.quietModules ?? 10;
  const includeText = options.includeText !== false;
  const modules = barcodeModules(code);
  const text = code.trim();
  const width = (modules.length + quiet * 2) * scale;
  const textH = includeText ? Math.round(36 * (scale / 8)) : 0;
  const padY = Math.round(16 * (scale / 8));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = padY + barHeight + (includeText ? padY + textH : padY);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("تعذر رسم الباركود");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#111111";
  let x = quiet * scale;
  for (const bit of modules) {
    if (bit === "1") ctx.fillRect(x, padY, scale, barHeight);
    x += scale;
  }
  if (includeText) {
    ctx.fillStyle = "#111111";
    ctx.font = `600 ${textH}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(text, width / 2, padY + barHeight + Math.round(8 * (scale / 8)));
  }
  return canvas;
}

export function barcodePngBlob(
  code: string,
  options: BarcodeRenderOptions = {},
): Promise<Blob> {
  const canvas = renderBarcodeCanvas(code, options);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("تعذر إنشاء صورة الباركود"))),
      "image/png",
    );
  });
}

export function barcodeDataUrl(code: string, options: BarcodeRenderOptions = {}): string {
  return renderBarcodeCanvas(code, options).toDataURL("image/png");
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const data = reader.result;
      if (typeof data !== "string") {
        reject(new Error("تعذر تحويل الصورة"));
        return;
      }
      const comma = data.indexOf(",");
      resolve(comma >= 0 ? data.slice(comma + 1) : data);
    };
    reader.onerror = () => reject(reader.error ?? new Error("تعذر قراءة الصورة"));
    reader.readAsDataURL(blob);
  });
}

export async function saveBarcodePng(code: string, productName?: string): Promise<void> {
  const blob = await barcodePngBlob(code, { scale: 10, barHeight: 280 });
  const safe = (productName || code).replace(/[^\w\u0600-\u06FF.-]+/g, "_");
  const filename = `${safe}-${code}.png`;
  const { Capacitor } = await import("@capacitor/core");
  if (Capacitor.isNativePlatform()) {
    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    const { Share } = await import("@capacitor/share");
    const written = await Filesystem.writeFile({
      path: filename,
      data: await blobToBase64(blob),
      directory: Directory.Cache,
      recursive: true,
    });
    await Share.share({
      title: `باركود ${code}`,
      dialogTitle: "حفظ باركود الصنف",
      url: written.uri,
    });
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function formatLabel(format: BarcodeFormatName): string {
  if (format === "ean13") return "EAN-13";
  if (format === "ean8") return "EAN-8";
  if (format === "upca") return "UPC-A";
  return "CODE-128";
}
