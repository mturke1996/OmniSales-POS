/**
 * Bluetooth ESC/POS transport for Capacitor native (Android/iOS).
 * Uses @fedejm/capacitor-esc-pos-printer for paired-device printing.
 */

import { Capacitor } from "@capacitor/core";

const BT_PREF_KEY = "omni.printer.bluetooth";

export interface BluetoothPrinterPref {
  address: string;
  name?: string;
}

export type BluetoothPrinterState = {
  connected: boolean;
  supported: boolean;
  supportMessage: string;
  label: string | null;
  lastError: string | null;
};

type Listener = (state: BluetoothPrinterState) => void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let activePrinter: any = null;
let portLabel: string | null = null;
let lastError: string | null = null;
const listeners = new Set<Listener>();

function emit() {
  const state = getBluetoothPrinterState();
  listeners.forEach((l) => l(state));
}

export function canUseBluetoothPrinter(): boolean {
  return Capacitor.isNativePlatform();
}

export function bluetoothSupportMessage(): string {
  if (!Capacitor.isNativePlatform()) {
    return "Bluetooth ESC/POS متاح في تطبيق Android/iOS";
  }
  return "اربط طابعة Bluetooth مقترنة من الإعدادات";
}

function readPref(): BluetoothPrinterPref | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(BT_PREF_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BluetoothPrinterPref;
  } catch {
    return null;
  }
}

function writePref(pref: BluetoothPrinterPref | null) {
  if (typeof localStorage === "undefined") return;
  if (!pref) localStorage.removeItem(BT_PREF_KEY);
  else localStorage.setItem(BT_PREF_KEY, JSON.stringify(pref));
}

export function getStoredBluetoothPref(): BluetoothPrinterPref | null {
  return readPref();
}

export function isBluetoothConnected(): boolean {
  return Boolean(activePrinter);
}

export function getBluetoothPrinterState(): BluetoothPrinterState {
  return {
    connected: isBluetoothConnected(),
    supported: canUseBluetoothPrinter(),
    supportMessage: bluetoothSupportMessage(),
    label: portLabel,
    lastError,
  };
}

export function subscribeBluetoothPrinterState(listener: Listener): () => void {
  listeners.add(listener);
  listener(getBluetoothPrinterState());
  return () => listeners.delete(listener);
}

export type ListedBluetoothPrinter = {
  address: string;
  name: string;
  alias?: string;
};

export async function listBluetoothPrinters(): Promise<ListedBluetoothPrinter[]> {
  if (!canUseBluetoothPrinter()) return [];
  const { EscPosPrinter } = await import("@fedejm/capacitor-esc-pos-printer");
  await EscPosPrinter.requestBluetoothEnable();
  const { devices } = await EscPosPrinter.getBluetoothPrinterDevices();
  return devices.map((d) => ({
    address: d.address,
    name: d.alias || d.name || d.address,
    alias: d.alias,
  }));
}

export async function connectBluetoothPrinter(
  address: string,
  name?: string
): Promise<void> {
  if (!canUseBluetoothPrinter()) {
    throw new Error(bluetoothSupportMessage());
  }
  const { EscPosPrinter, BluetoothPrinter } = await import(
    "@fedejm/capacitor-esc-pos-printer"
  );
  await EscPosPrinter.requestBluetoothEnable();
  const { disconnectUsbOtgPrinter } = await import("./usb-otg-printer");
  const { disconnectNetworkPrinter } = await import("./network-printer");
  await disconnectUsbOtgPrinter();
  await disconnectNetworkPrinter();
  await disconnectBluetoothPrinter();

  const printer = new BluetoothPrinter(address);
  await printer.link();
  await printer.connect();
  activePrinter = printer;
  portLabel = name || address;
  writePref({ address, name: portLabel || undefined });
  lastError = null;
  emit();
}

export async function disconnectBluetoothPrinter(): Promise<void> {
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

export async function tryAutoReconnectBluetoothPrinter(): Promise<boolean> {
  if (!canUseBluetoothPrinter() || isBluetoothConnected()) return isBluetoothConnected();
  const pref = readPref();
  if (!pref?.address) return false;
  try {
    await connectBluetoothPrinter(pref.address, pref.name);
    return true;
  } catch (err) {
    lastError = err instanceof Error ? err.message : "فشل إعادة اتصال Bluetooth";
    activePrinter = null;
    emit();
    return false;
  }
}

export async function writeToBluetooth(bytes: Uint8Array): Promise<void> {
  if (!activePrinter) {
    const ok = await tryAutoReconnectBluetoothPrinter();
    if (!ok) throw new Error("الطابعة Bluetooth غير متصلة");
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
    lastError = err instanceof Error ? err.message : "فشل الإرسال عبر Bluetooth";
    activePrinter = null;
    emit();
    throw new Error(lastError);
  }
}
