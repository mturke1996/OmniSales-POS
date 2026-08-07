/**
 * Production-grade ESC/POS helpers for Arabic POS receipts.
 * Strategy: rasterize RTL Arabic text via Canvas, then emit GS v 0 bit-image.
 * Web Serial connection layer: persist preferred port, auto-reconnect, test print.
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
  return new Uint8Array([ESC, 0x40]);
}

export function escAlign(mode: "left" | "center" | "right"): Uint8Array {
  const n = mode === "center" ? 1 : mode === "right" ? 2 : 0;
  return new Uint8Array([ESC, 0x61, n]);
}

export function escFeed(n = 2): Uint8Array {
  return new Uint8Array(Array.from({ length: n }, () => LF));
}

export function escCut(): Uint8Array {
  return new Uint8Array([GS, 0x56, 0x00]);
}

export function escCashDrawer(): Uint8Array {
  return new Uint8Array([ESC, 0x70, 0x00, 0x19, 0xfa]);
}

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
  return (
    typeof navigator !== "undefined" &&
    Boolean(navigator.serial) &&
    Boolean(window.isSecureContext)
  );
}

export function serialSupportMessage(): string {
  if (typeof window === "undefined") return "غير متاح";
  if (!window.isSecureContext) {
    return "الطباعة الحرارية تتطلب HTTPS أو localhost";
  }
  if (!navigator.serial) {
    return "استخدم Chrome أو Edge على الكمبيوتر لربط USB Serial";
  }
  return "مدعوم";
}

const PORT_BAUD_KEY = "omni.printer.baud";
const PORT_PREF_KEY = "omni.printer.port";

export interface PrinterPortPref {
  usbVendorId?: number;
  usbProductId?: number;
  label?: string;
}

export function getStoredBaudRate(): number {
  const n = Number(localStorage.getItem(PORT_BAUD_KEY) || 9600);
  return [9600, 19200, 38400, 115200].includes(n) ? n : 9600;
}

export function setStoredBaudRate(baud: number) {
  localStorage.setItem(PORT_BAUD_KEY, String(baud));
}

export function getStoredPortPref(): PrinterPortPref | null {
  try {
    const raw = localStorage.getItem(PORT_PREF_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PrinterPortPref;
  } catch {
    return null;
  }
}

export function setStoredPortPref(pref: PrinterPortPref | null) {
  if (!pref) localStorage.removeItem(PORT_PREF_KEY);
  else localStorage.setItem(PORT_PREF_KEY, JSON.stringify(pref));
}

export type PrinterConnectionState = {
  connected: boolean;
  supported: boolean;
  supportMessage: string;
  baud: number;
  label: string | null;
  lastError: string | null;
};

type Listener = (state: PrinterConnectionState) => void;

let activePort: SerialPort | null = null;
let lastError: string | null = null;
let portLabel: string | null = null;
const listeners = new Set<Listener>();
let listenersBound = false;

function emit() {
  const state = getPrinterConnectionState();
  listeners.forEach((l) => l(state));
}

export function getPrinterConnectionState(): PrinterConnectionState {
  return {
    connected: Boolean(activePort?.writable),
    supported: canUseWebSerial(),
    supportMessage: serialSupportMessage(),
    baud: getStoredBaudRate(),
    label: portLabel,
    lastError,
  };
}

export function subscribePrinterState(listener: Listener): () => void {
  listeners.add(listener);
  listener(getPrinterConnectionState());
  ensureSerialEventListeners();
  return () => listeners.delete(listener);
}

function ensureSerialEventListeners() {
  if (listenersBound || !canUseWebSerial() || !navigator.serial) return;
  listenersBound = true;
  const serial = navigator.serial as Serial & {
    addEventListener?: (
      type: string,
      listener: (ev: { target: SerialPort }) => void
    ) => void;
  };
  serial.addEventListener?.("disconnect", (ev) => {
    if (ev.target === activePort) {
      activePort = null;
      portLabel = null;
      lastError = "انقطع اتصال الطابعة";
      emit();
    }
  });
  serial.addEventListener?.("connect", () => {
    // Opportunistic reconnect of preferred device
    void tryAutoReconnectSerialPrinter().then(emit);
  });
}

async function readPortInfo(port: SerialPort): Promise<PrinterPortPref> {
  try {
    const info = await (
      port as SerialPort & {
        getInfo?: () => { usbVendorId?: number; usbProductId?: number };
      }
    ).getInfo?.();
    if (info?.usbVendorId != null) {
      return {
        usbVendorId: info.usbVendorId,
        usbProductId: info.usbProductId,
        label: `USB ${info.usbVendorId.toString(16)}:${(info.usbProductId ?? 0).toString(16)}`,
      };
    }
  } catch {
    /* older browsers */
  }
  return { label: "طابعة Serial" };
}

function matchPreferred(
  ports: SerialPort[],
  pref: PrinterPortPref | null
): SerialPort | null {
  if (!ports.length) return null;
  if (!pref?.usbVendorId) return ports[0] || null;
  for (const p of ports) {
    try {
      const info = (
        p as SerialPort & {
          getInfo?: () => { usbVendorId?: number; usbProductId?: number };
        }
      ).getInfo?.();
      if (
        info?.usbVendorId === pref.usbVendorId &&
        (pref.usbProductId == null ||
          info?.usbProductId === pref.usbProductId)
      ) {
        return p;
      }
    } catch {
      /* continue */
    }
  }
  return ports[0] || null;
}

async function openPort(port: SerialPort, baud: number): Promise<void> {
  if (port.readable || port.writable) {
    try {
      await port.close();
    } catch {
      /* ignore */
    }
  }
  await port.open({
    baudRate: baud,
    dataBits: 8,
    stopBits: 1,
    parity: "none",
  });
  activePort = port;
  const pref = await readPortInfo(port);
  portLabel = pref.label || "طابعة متصلة";
  setStoredPortPref(pref);
  lastError = null;
  emit();
}

/** Reopen a previously granted port without showing the picker. */
export async function tryAutoReconnectSerialPrinter(
  baudRate?: number
): Promise<boolean> {
  if (!canUseWebSerial()) return false;
  ensureSerialEventListeners();
  if (activePort?.writable) return true;
  const serial = navigator.serial;
  if (!serial) return false;
  const baud = baudRate ?? getStoredBaudRate();
  const ports = await serial.getPorts();
  const port = matchPreferred(ports, getStoredPortPref());
  if (!port) return false;
  try {
    await openPort(port, baud);
    return true;
  } catch (err) {
    lastError = err instanceof Error ? err.message : "فشل إعادة الاتصال";
    activePort = null;
    emit();
    return false;
  }
}

/** Ask user to pick a printer (or reuse granted port). */
export async function connectSerialPrinter(
  baudRate?: number,
  opts?: { forcePicker?: boolean }
): Promise<SerialPort> {
  if (!canUseWebSerial()) {
    throw new Error(serialSupportMessage());
  }
  ensureSerialEventListeners();
  const baud = baudRate ?? getStoredBaudRate();
  setStoredBaudRate(baud);

  const serial = navigator.serial;
  if (!serial) throw new Error("Web Serial غير متاح");

  let port: SerialPort | null = null;
  if (!opts?.forcePicker) {
    const ports = await serial.getPorts();
    port = matchPreferred(ports, getStoredPortPref());
  }
  if (!port) {
    port = await serial.requestPort();
  }

  await openPort(port, baud);
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
  portLabel = null;
  lastError = null;
  emit();
}

export function isSerialConnected(): boolean {
  return Boolean(activePort?.writable);
}

export async function writeToSerial(bytes: Uint8Array): Promise<void> {
  let port = activePort;
  if (!port?.writable) {
    const ok = await tryAutoReconnectSerialPrinter();
    if (!ok) {
      port = await connectSerialPrinter();
    } else {
      port = activePort;
    }
  }
  if (!port?.writable) {
    throw new Error("الطابعة غير متصلة");
  }

  const writeOnce = async () => {
    const writer = port!.writable!.getWriter();
    try {
      const chunk = 512;
      for (let i = 0; i < bytes.length; i += chunk) {
        await writer.write(bytes.subarray(i, i + chunk));
        await new Promise((r) => setTimeout(r, 15));
      }
    } finally {
      writer.releaseLock();
    }
  };

  try {
    await writeOnce();
    lastError = null;
    emit();
  } catch (err) {
    // One reconnect retry
    try {
      await disconnectSerialPrinter();
      await tryAutoReconnectSerialPrinter();
      if (!activePort?.writable) await connectSerialPrinter();
      port = activePort;
      if (!port?.writable) throw err;
      await writeOnce();
      lastError = null;
      emit();
    } catch (err2) {
      lastError = err2 instanceof Error ? err2.message : "فشل الإرسال للطابعة";
      activePort = null;
      emit();
      throw new Error(lastError);
    }
  }
}

/** Short bilingual test slip to verify cable + baud. */
export async function printTestSlip(widthMm: 58 | 80 = 80): Promise<void> {
  const lines = [
    "##OmniSales",
    "··اختبار طابعة حرارية",
    "------------------------------",
    `العرض: ${widthMm} ملم`,
    `Baud: ${getStoredBaudRate()}`,
    new Date().toLocaleString("ar-LY"),
    "------------------------------",
    "إذا ظهرت هذه الورقة فالاتصال ناجح",
    "Thermal printer OK",
  ];
  const bytes = await buildEscPosReceiptBytes({
    lines,
    widthMm,
    openDrawer: false,
  });
  await writeToSerial(bytes);
}
