/**
 * Unified printer I/O — Web Serial, USB OTG (Android), Bluetooth (native).
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
  canUseUsbOtgPrinter,
  disconnectUsbOtgPrinter,
  getUsbOtgPrinterState,
  isUsbOtgConnected,
  subscribeUsbOtgPrinterState,
  tryAutoReconnectUsbOtgPrinter,
  usbOtgSupportMessage,
  writeToUsbOtg,
} from "./usb-otg-printer";

export type PrinterTransport = "usb_serial" | "usb_otg" | "bluetooth" | null;

export type UnifiedPrinterState = PrinterConnectionState & {
  transport: PrinterTransport;
};

function mergeState(): UnifiedPrinterState {
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

  const serial = getSerialState();
  if (serial.connected) {
    return { ...serial, transport: "usb_serial" };
  }

  const supported =
    canUseWebSerial() || canUseBluetoothPrinter() || canUseUsbOtgPrinter();
  const parts: string[] = [];
  if (canUseWebSerial()) parts.push(serial.supportMessage);
  if (canUseUsbOtgPrinter()) parts.push(usbOtgSupportMessage());
  if (canUseBluetoothPrinter()) parts.push(bluetoothSupportMessage());

  return {
    connected: false,
    supported,
    supportMessage: parts.join(" · ") || serial.supportMessage,
    baud: serial.baud,
    label: null,
    lastError: usb.lastError || bt.lastError || serial.lastError,
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
  const unsubBt = subscribeBluetoothPrinterState(notify);
  const unsubUsb = subscribeUsbOtgPrinterState(notify);
  listener(mergeState());
  return () => {
    unsubSerial();
    unsubBt();
    unsubUsb();
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
  if (await tryAutoReconnectBluetoothPrinter()) {
    await writeToBluetooth(bytes);
    return;
  }

  if (canUseUsbOtgPrinter() || canUseBluetoothPrinter()) {
    throw new Error("اربط طابعة USB أو Bluetooth من الإعدادات أو نقطة البيع");
  }

  await writeToSerial(bytes);
}

function activeTransportLabel(): string {
  if (isUsbOtgConnected()) return "USB OTG";
  if (isBluetoothConnected()) return "Bluetooth";
  if (isSerialConnected()) return "USB Serial";
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

export { disconnectBluetoothPrinter, disconnectUsbOtgPrinter };

export async function disconnectAllPrinters(): Promise<void> {
  const { disconnectSerialPrinter } = await import("./escpos");
  await Promise.all([
    disconnectSerialPrinter(),
    disconnectBluetoothPrinter(),
    disconnectUsbOtgPrinter(),
  ]);
}

export async function bootReconnectPrinters(): Promise<void> {
  await Promise.all([
    tryAutoReconnectSerialPrinter(),
    tryAutoReconnectUsbOtgPrinter(),
    tryAutoReconnectBluetoothPrinter(),
  ]);
}
