/**
 * USB OTG ESC/POS transport for Capacitor Android.
 * Uses @fedejm/capacitor-esc-pos-printer UsbPrinter + permission flow.
 */

import { Capacitor } from "@capacitor/core";

const USB_PREF_KEY = "omni.printer.usb_otg";

export interface UsbOtgPrinterPref {
  id: string;
  name?: string;
}

export type UsbOtgPrinterState = {
  connected: boolean;
  supported: boolean;
  supportMessage: string;
  label: string | null;
  lastError: string | null;
};

type Listener = (state: UsbOtgPrinterState) => void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let activePrinter: any = null;
let portLabel: string | null = null;
let lastError: string | null = null;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l(getUsbOtgPrinterState()));
}

export function canUseUsbOtgPrinter(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

export function usbOtgSupportMessage(): string {
  if (!Capacitor.isNativePlatform()) {
    return "USB OTG متاح في تطبيق Android";
  }
  if (Capacitor.getPlatform() !== "android") {
    return "USB OTG غير متاح على iOS";
  }
  return "وصّل الطابعة بكابل OTG/USB واخترها من القائمة";
}

function readPref(): UsbOtgPrinterPref | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(USB_PREF_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UsbOtgPrinterPref;
  } catch {
    return null;
  }
}

function writePref(pref: UsbOtgPrinterPref | null) {
  if (typeof localStorage === "undefined") return;
  if (!pref) localStorage.removeItem(USB_PREF_KEY);
  else localStorage.setItem(USB_PREF_KEY, JSON.stringify(pref));
}

export function isUsbOtgConnected(): boolean {
  return Boolean(activePrinter);
}

export function getUsbOtgPrinterState(): UsbOtgPrinterState {
  return {
    connected: isUsbOtgConnected(),
    supported: canUseUsbOtgPrinter(),
    supportMessage: usbOtgSupportMessage(),
    label: portLabel,
    lastError,
  };
}

export function subscribeUsbOtgPrinterState(listener: Listener): () => void {
  listeners.add(listener);
  listener(getUsbOtgPrinterState());
  return () => listeners.delete(listener);
}

export type ListedUsbPrinter = {
  id: string;
  name: string;
  hasPermission: boolean;
  vendorId: number;
  productId: number;
};

export async function listUsbOtgPrinters(): Promise<ListedUsbPrinter[]> {
  if (!canUseUsbOtgPrinter()) return [];
  const { EscPosPrinter } = await import("@fedejm/capacitor-esc-pos-printer");
  const { devices } = await EscPosPrinter.getUsbPrinterDevices();
  return devices.map((d) => ({
    id: d.id,
    name: d.name || d.manufacturerName || `USB ${d.vendorId.toString(16)}:${d.productId.toString(16)}`,
    hasPermission: d.hasPermission,
    vendorId: d.vendorId,
    productId: d.productId,
  }));
}

async function ensureUsbPermission(deviceId: string): Promise<void> {
  const { EscPosPrinter } = await import("@fedejm/capacitor-esc-pos-printer");
  const { devices } = await EscPosPrinter.getUsbPrinterDevices();
  const device = devices.find((d) => d.id === deviceId);
  if (device?.hasPermission) return;
  const { value: granted } = await EscPosPrinter.requestUsbPermission({
    address: deviceId,
  });
  if (!granted) throw new Error("لم يُمنح إذن USB للطابعة");
}

export async function connectUsbOtgPrinter(id: string, name?: string): Promise<void> {
  if (!canUseUsbOtgPrinter()) {
    throw new Error(usbOtgSupportMessage());
  }
  await ensureUsbPermission(id);
  const { disconnectBluetoothPrinter } = await import("./bluetooth-printer");
  await disconnectBluetoothPrinter();
  await disconnectUsbOtgPrinter();

  const { UsbPrinter } = await import("@fedejm/capacitor-esc-pos-printer");
  const printer = new UsbPrinter(id);
  await printer.link();
  await printer.connect();
  activePrinter = printer;
  portLabel = name || id;
  writePref({ id, name: portLabel || undefined });
  lastError = null;
  emit();
}

export async function disconnectUsbOtgPrinter(): Promise<void> {
  if (!activePrinter) {
    portLabel = null;
    lastError = null;
    emit();
    return;
  }
  try {
    await activePrinter.disconnect();
  } catch {
    /* ignore */
  }
  try {
    await activePrinter.dispose();
  } catch {
    /* ignore */
  }
  activePrinter = null;
  portLabel = null;
  lastError = null;
  emit();
}

export async function tryAutoReconnectUsbOtgPrinter(): Promise<boolean> {
  if (!canUseUsbOtgPrinter() || isUsbOtgConnected()) return isUsbOtgConnected();
  const pref = readPref();
  if (!pref?.id) return false;
  try {
    await connectUsbOtgPrinter(pref.id, pref.name);
    return true;
  } catch (err) {
    lastError = err instanceof Error ? err.message : "فشل إعادة اتصال USB";
    activePrinter = null;
    emit();
    return false;
  }
}

export async function writeToUsbOtg(bytes: Uint8Array): Promise<void> {
  if (!activePrinter) {
    const ok = await tryAutoReconnectUsbOtgPrinter();
    if (!ok) throw new Error("طابعة USB غير متصلة");
  }

  const chunk = 512;
  try {
    for (let i = 0; i < bytes.length; i += chunk) {
      const slice = bytes.subarray(i, i + chunk);
      await activePrinter.send(Array.from(slice));
      if (i + chunk < bytes.length) {
        await new Promise((r) => setTimeout(r, 15));
      }
    }
    lastError = null;
    emit();
  } catch (err) {
    lastError = err instanceof Error ? err.message : "فشل الإرسال عبر USB";
    activePrinter = null;
    emit();
    throw new Error(lastError);
  }
}
