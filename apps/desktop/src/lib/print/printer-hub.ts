/**
 * Unified printer I/O — Web Serial, USB OTG, Network TCP, Bluetooth.
 */

import {
  buildEscPosReceiptBytes,
  canUseWebSerial,
  getPrinterConnectionState as getSerialState,
  getStoredBaudRate,
  isSerialConnected,
  subscribePrinterState as subscribeSerialState,
  tryAutoReconnectSerialPrinter,
  writeToSerial,
  type PrinterConnectionState,
} from "./escpos";
import {
  bluetoothSupportMessage,
  canUseBluetoothPrinter,
  disconnectBluetoothPrinter,
  getBluetoothPrinterState,
  isBluetoothConnected,
  subscribeBluetoothPrinterState,
  tryAutoReconnectBluetoothPrinter,
  writeToBluetooth,
} from "./bluetooth-printer";
import {
  canUseNetworkPrinter,
  disconnectNetworkPrinter,
  getNetworkPrinterState,
  isNetworkConnected,
  networkSupportMessage,
  subscribeNetworkPrinterState,
  tryAutoReconnectNetworkPrinter,
  writeToNetwork,
} from "./network-printer";
import {
  canUseUsbOtgPrinter,
  disconnectUsbOtgPrinter,
  getUsbOtgPrinterState,
  isUsbOtgConnected,
  subscribeUsbOtgPrinterState,
  tryAutoReconnectUsbOtgPrinter,
  usbOtgSupportMessage,
  writeToUsbOtg,
} from "./usb-otg-printer";

export type PrinterTransport =
  | "usb_serial"
  | "usb_otg"
  | "network"
  | "bluetooth"
  | null;

export type UnifiedPrinterState = PrinterConnectionState & {
  transport: PrinterTransport;
};

function mergeState(): UnifiedPrinterState {
  const serial = getSerialState();
  if (serial.connected) {
    return { ...serial, transport: "usb_serial" };
  }

  const usb = getUsbOtgPrinterState();
  if (usb.connected) {
    return {
      connected: true,
      supported: true,
      supportMessage: usb.supportMessage,
      baud: getStoredBaudRate(),
      label: usb.label,
      lastError: usb.lastError,
      transport: "usb_otg",
    };
  }

  const net = getNetworkPrinterState();
  if (net.connected) {
    return {
      connected: true,
      supported: true,
      supportMessage: net.supportMessage,
      baud: getStoredBaudRate(),
      label: net.label,
      lastError: net.lastError,
      transport: "network",
    };
  }

  const bt = getBluetoothPrinterState();
  if (bt.connected) {
    return {
      connected: true,
      supported: true,
      supportMessage: bt.supportMessage,
      baud: getStoredBaudRate(),
      label: bt.label,
      lastError: bt.lastError,
      transport: "bluetooth",
    };
  }

  const supported =
    canUseWebSerial() ||
    canUseUsbOtgPrinter() ||
    canUseNetworkPrinter() ||
    canUseBluetoothPrinter();
  const parts: string[] = [];
  if (canUseWebSerial()) parts.push(serial.supportMessage);
  if (canUseUsbOtgPrinter()) parts.push(usbOtgSupportMessage());
  if (canUseNetworkPrinter()) parts.push(networkSupportMessage());
  if (canUseBluetoothPrinter()) parts.push(bluetoothSupportMessage());

  return {
    connected: false,
    supported,
    supportMessage: parts.join(" · ") || serial.supportMessage,
    baud: serial.baud,
    label: null,
    lastError: net.lastError || usb.lastError || bt.lastError || serial.lastError,
    transport: null,
  };
}

export function getUnifiedPrinterState(): UnifiedPrinterState {
  return mergeState();
}

export function subscribeUnifiedPrinterState(
  listener: (state: UnifiedPrinterState) => void
): () => void {
  const notify = () => listener(mergeState());
  const unsubSerial = subscribeSerialState(notify);
  const unsubUsb = subscribeUsbOtgPrinterState(notify);
  const unsubNet = subscribeNetworkPrinterState(notify);
  const unsubBt = subscribeBluetoothPrinterState(notify);
  listener(mergeState());
  return () => {
    unsubSerial();
    unsubUsb();
    unsubNet();
    unsubBt();
  };
}

export async function writeToPrinter(bytes: Uint8Array): Promise<void> {
  if (isSerialConnected()) {
    await writeToSerial(bytes);
    return;
  }
  if (isUsbOtgConnected()) {
    await writeToUsbOtg(bytes);
    return;
  }
  if (isNetworkConnected()) {
    await writeToNetwork(bytes);
    return;
  }
  if (isBluetoothConnected()) {
    await writeToBluetooth(bytes);
    return;
  }

  if (await tryAutoReconnectSerialPrinter()) {
    await writeToSerial(bytes);
    return;
  }
  if (await tryAutoReconnectUsbOtgPrinter()) {
    await writeToUsbOtg(bytes);
    return;
  }
  if (await tryAutoReconnectNetworkPrinter()) {
    await writeToNetwork(bytes);
    return;
  }
  if (await tryAutoReconnectBluetoothPrinter()) {
    await writeToBluetooth(bytes);
    return;
  }

  if (canUseNetworkPrinter() || canUseUsbOtgPrinter() || canUseBluetoothPrinter()) {
    throw new Error("اربط طابعة من الإعدادات أو نقطة البيع (USB / LAN / Bluetooth)");
  }

  await writeToSerial(bytes);
}

function activeTransportLabel(): string {
  if (isSerialConnected()) return "USB Serial";
  if (isUsbOtgConnected()) return "USB OTG";
  if (isNetworkConnected()) return "LAN";
  if (isBluetoothConnected()) return "Bluetooth";
  return "auto";
}

export async function printTestSlip(widthMm: 58 | 80 = 80): Promise<void> {
  const lines = [
    "##OmniSales",
    "··اختبار طابعة حرارية",
    "------------------------------",
    `العرض: ${widthMm} ملم · ${activeTransportLabel()}`,
    `Baud: ${getStoredBaudRate()}`,
    new Date().toLocaleString("ar-LY"),
    "------------------------------",
    "إذا ظهرت هذه الورقة فالاتصال ناجح",
    "Thermal printer OK",
  ];
  const bytes = await buildEscPosReceiptBytes({ lines, widthMm, openDrawer: false });
  await writeToPrinter(bytes);
}

export {
  disconnectBluetoothPrinter,
  disconnectUsbOtgPrinter,
  disconnectNetworkPrinter,
};

export async function disconnectAllPrinters(): Promise<void> {
  const { disconnectSerialPrinter } = await import("./escpos");
  await Promise.all([
    disconnectSerialPrinter(),
    disconnectUsbOtgPrinter(),
    disconnectBluetoothPrinter(),
    disconnectNetworkPrinter(),
  ]);
}

export async function bootReconnectPrinters(): Promise<void> {
  await Promise.all([
    tryAutoReconnectSerialPrinter(),
    tryAutoReconnectUsbOtgPrinter(),
    tryAutoReconnectNetworkPrinter(),
    tryAutoReconnectBluetoothPrinter(),
  ]);
}
