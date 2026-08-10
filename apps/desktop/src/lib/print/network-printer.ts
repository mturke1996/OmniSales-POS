/**
 * Network ESC/POS (TCP port 9100) for Capacitor native via TCP socket plugin.
 * Sends binary ESC/POS as Base64 (required by @deedarb/capacitor-tcp-socket).
 */

import { Capacitor } from "@capacitor/core";

const NET_PREF_KEY = "omni.printer.network";
const DEFAULT_PORT = 9100;

export interface NetworkPrinterPref {
  host: string;
  port: number;
  label?: string;
}

export type NetworkPrinterState = {
  connected: boolean;
  supported: boolean;
  supportMessage: string;
  label: string | null;
  lastError: string | null;
};

type Listener = (state: NetworkPrinterState) => void;

let tcpClient: number | null = null;
let portLabel: string | null = null;
let lastError: string | null = null;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l(getNetworkPrinterState()));
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

export function canUseNetworkPrinter(): boolean {
  return Capacitor.isNativePlatform();
}

export function networkSupportMessage(): string {
  if (!Capacitor.isNativePlatform()) {
    return "طباعة LAN (TCP) متاحة في تطبيق Android/iOS";
  }
  return "أدخل IP الطابعة على الشبكة (منفذ 9100)";
}

function readPref(): NetworkPrinterPref | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(NET_PREF_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as NetworkPrinterPref;
    if (!parsed.host?.trim()) return null;
    return {
      host: parsed.host.trim(),
      port: parsed.port > 0 ? parsed.port : DEFAULT_PORT,
      label: parsed.label,
    };
  } catch {
    return null;
  }
}

function writePref(pref: NetworkPrinterPref | null) {
  if (typeof localStorage === "undefined") return;
  if (!pref) localStorage.removeItem(NET_PREF_KEY);
  else localStorage.setItem(NET_PREF_KEY, JSON.stringify(pref));
}

export function getStoredNetworkPref(): NetworkPrinterPref | null {
  return readPref();
}

export function isNetworkConnected(): boolean {
  return tcpClient != null;
}

export function getNetworkPrinterState(): NetworkPrinterState {
  return {
    connected: isNetworkConnected(),
    supported: canUseNetworkPrinter(),
    supportMessage: networkSupportMessage(),
    label: portLabel,
    lastError,
  };
}

export function subscribeNetworkPrinterState(listener: Listener): () => void {
  listeners.add(listener);
  listener(getNetworkPrinterState());
  return () => listeners.delete(listener);
}

async function disconnectOtherNativePrinters() {
  const { disconnectBluetoothPrinter } = await import("./bluetooth-printer");
  const { disconnectUsbOtgPrinter } = await import("./usb-otg-printer");
  await disconnectBluetoothPrinter();
  await disconnectUsbOtgPrinter();
}

export async function connectNetworkPrinter(
  host: string,
  port = DEFAULT_PORT,
  label?: string
): Promise<void> {
  if (!canUseNetworkPrinter()) {
    throw new Error(networkSupportMessage());
  }
  const trimmed = host.trim();
  if (!trimmed) throw new Error("عنوان IP مطلوب");

  await disconnectOtherNativePrinters();
  await disconnectNetworkPrinter();

  const { TcpSocket } = await import("@deedarb/capacitor-tcp-socket");
  const result = await TcpSocket.connect({
    ipAddress: trimmed,
    port,
    timeout: 8,
  });
  tcpClient = result.client;
  portLabel = label || `${trimmed}:${port}`;
  writePref({ host: trimmed, port, label: portLabel || undefined });
  lastError = null;
  emit();
}

export async function disconnectNetworkPrinter(): Promise<void> {
  if (tcpClient == null) {
    portLabel = null;
    lastError = null;
    emit();
    return;
  }
  try {
    const { TcpSocket } = await import("@deedarb/capacitor-tcp-socket");
    await TcpSocket.disconnect({ client: tcpClient });
  } catch {
    /* ignore */
  }
  tcpClient = null;
  portLabel = null;
  lastError = null;
  emit();
}

export async function tryAutoReconnectNetworkPrinter(): Promise<boolean> {
  if (!canUseNetworkPrinter() || isNetworkConnected()) return isNetworkConnected();
  const pref = readPref();
  if (!pref) return false;
  try {
    await connectNetworkPrinter(pref.host, pref.port, pref.label);
    return true;
  } catch (err) {
    lastError = err instanceof Error ? err.message : "فشل إعادة اتصال الشبكة";
    tcpClient = null;
    emit();
    return false;
  }
}

export async function writeToNetwork(bytes: Uint8Array): Promise<void> {
  if (tcpClient == null) {
    const ok = await tryAutoReconnectNetworkPrinter();
    if (!ok) throw new Error("طابعة الشبكة غير متصلة");
  }

  const { TcpSocket } = await import("@deedarb/capacitor-tcp-socket");
  const chunk = 4096;
  try {
    for (let i = 0; i < bytes.length; i += chunk) {
      const slice = bytes.subarray(i, i + chunk);
      await TcpSocket.send({
        client: tcpClient!,
        data: bytesToBase64(slice),
      });
      if (i + chunk < bytes.length) {
        await new Promise((r) => setTimeout(r, 10));
      }
    }
    lastError = null;
    emit();
  } catch (err) {
    lastError = err instanceof Error ? err.message : "فشل الإرسال عبر الشبكة";
    tcpClient = null;
    emit();
    throw new Error(lastError);
  }
}
