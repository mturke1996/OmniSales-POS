/**
 * Production-grade ESC/POS helpers for Arabic POS receipts.
 * Strategy: rasterize RTL Arabic text via Canvas (reliable on cheap EPSON-compatible printers),
 * then emit GS v 0 bit-image commands. ASCII numbers stay crisp in the bitmap.
 */

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

export function concatBytes(...chunks: Uint8Array[]): Uint8Array {
  const len = chunks.reduce((s, c) => s + c.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}

export function escInit(): Uint8Array {
  return new Uint8Array([ESC, 0x40]); // ESC @
}

export function escAlign(mode: "left" | "center" | "right"): Uint8Array {
  const n = mode === "center" ? 1 : mode === "right" ? 2 : 0;
  return new Uint8Array([ESC, 0x61, n]);
}

export function escFeed(n = 2): Uint8Array {
  return new Uint8Array(Array.from({ length: n }, () => LF));
}

export function escCut(): Uint8Array {
  // GS V 0 — full cut (many printers ignore safely)
  return new Uint8Array([GS, 0x56, 0x00]);
}

export function escCashDrawer(): Uint8Array {
  // ESC p m t1 t2 — pulse pin 2
  return new Uint8Array([ESC, 0x70, 0x00, 0x19, 0xfa]);
}

/** Convert RGBA canvas pixels to 1-bit ESC/POS raster (GS v 0). */
export function canvasToRasterGsV0(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): Uint8Array {
  const image = ctx.getImageData(0, 0, width, height);
  const bytesPerRow = Math.ceil(width / 8);
  const data = new Uint8Array(bytesPerRow * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = image.data[i];
      const g = image.data[i + 1];
      const b = image.data[i + 2];
      const a = image.data[i + 3];
      // luma threshold — dark pixels print
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      const on = a > 128 && luma < 160;
      if (on) {
        data[y * bytesPerRow + (x >> 3)] |= 0x80 >> (x & 7);
      }
    }
  }

  const xL = bytesPerRow & 0xff;
  const xH = (bytesPerRow >> 8) & 0xff;
  const yL = height & 0xff;
  const yH = (height >> 8) & 0xff;
  const header = new Uint8Array([GS, 0x76, 0x30, 0x00, xL, xH, yL, yH]);
  return concatBytes(header, data);
}

export async function renderReceiptCanvas(opts: {
  lines: string[];
  widthDots: number;
  fontSize?: number;
  lineHeight?: number;
  padding?: number;
}): Promise<{ canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D }> {
  const width = opts.widthDots;
  const fontSize = opts.fontSize ?? 22;
  const lineHeight = opts.lineHeight ?? 28;
  const padding = opts.padding ?? 8;
  const height = padding * 2 + opts.lines.length * lineHeight + 8;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas غير متاح للطباعة");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#000000";
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.direction = "rtl";
  ctx.font = `700 ${fontSize}px "Tajawal","Cairo","Segoe UI",Tahoma,sans-serif`;

  let y = padding;
  for (const line of opts.lines) {
    // Slightly smaller for separators / muted
    if (line.startsWith("··") || line.startsWith("--")) {
      ctx.font = `600 ${Math.max(14, fontSize - 6)}px "Tajawal","Cairo","Segoe UI",Tahoma,sans-serif`;
    } else if (line.startsWith("##")) {
      ctx.font = `800 ${fontSize + 4}px "Tajawal","Cairo","Segoe UI",Tahoma,sans-serif`;
    } else {
      ctx.font = `700 ${fontSize}px "Tajawal","Cairo","Segoe UI",Tahoma,sans-serif`;
    }
    const text = line.replace(/^##/, "").replace(/^··/, "");
    ctx.fillText(text, width - padding, y);
    y += lineHeight;
  }

  return { canvas, ctx };
}

export async function buildEscPosReceiptBytes(opts: {
  lines: string[];
  widthMm: 58 | 80;
  openDrawer?: boolean;
}): Promise<Uint8Array> {
  // Typical thermal densities ~203 dpi → ~384 dots (58mm) / ~576 dots (80mm)
  const widthDots = opts.widthMm === 58 ? 384 : 576;
  const { canvas, ctx } = await renderReceiptCanvas({
    lines: opts.lines,
    widthDots,
    fontSize: opts.widthMm === 58 ? 20 : 22,
    lineHeight: opts.widthMm === 58 ? 26 : 28,
  });

  const raster = canvasToRasterGsV0(ctx, canvas.width, canvas.height);
  const parts = [escInit(), escAlign("center"), raster, escFeed(3)];
  if (opts.openDrawer) parts.push(escCashDrawer());
  parts.push(escCut());
  return concatBytes(...parts);
}

/** Web Serial capability probe */
export function canUseWebSerial(): boolean {
  return typeof navigator !== "undefined" && Boolean(navigator.serial);
}

const PORT_BAUD_KEY = "omni.printer.baud";

export function getStoredBaudRate(): number {
  const n = Number(localStorage.getItem(PORT_BAUD_KEY) || 9600);
  return [9600, 19200, 38400, 115200].includes(n) ? n : 9600;
}

export function setStoredBaudRate(baud: number) {
  localStorage.setItem(PORT_BAUD_KEY, String(baud));
}

let activePort: SerialPort | null = null;

export async function connectSerialPrinter(baudRate?: number): Promise<SerialPort> {
  if (!canUseWebSerial()) {
    throw new Error("Web Serial غير مدعوم — استخدم Chrome/Edge على جهاز الكمبيوتر");
  }
  const baud = baudRate ?? getStoredBaudRate();
  setStoredBaudRate(baud);

  // Reuse previously granted port when possible
  const serial = navigator.serial;
  if (!serial) throw new Error("Web Serial غير متاح");
  const ports = await serial.getPorts();
  const port = ports[0] || (await serial.requestPort());
  if (port.readable || port.writable) {
    try {
      await port.close();
    } catch {
      /* ignore */
    }
  }
  await port.open({ baudRate: baud, dataBits: 8, stopBits: 1, parity: "none" });
  activePort = port;
  return port;
}

export async function disconnectSerialPrinter() {
  if (activePort) {
    try {
      await activePort.close();
    } catch {
      /* ignore */
    }
    activePort = null;
  }
}

export function isSerialConnected(): boolean {
  return Boolean(activePort?.writable);
}

export async function writeToSerial(bytes: Uint8Array): Promise<void> {
  let port = activePort;
  if (!port?.writable) {
    port = await connectSerialPrinter();
  }
  const writer = port.writable!.getWriter();
  try {
    // Chunk to avoid buffer overruns on cheap USB-serial chips
    const chunk = 512;
    for (let i = 0; i < bytes.length; i += chunk) {
      await writer.write(bytes.subarray(i, i + chunk));
      await new Promise((r) => setTimeout(r, 15));
    }
  } finally {
    writer.releaseLock();
  }
}
