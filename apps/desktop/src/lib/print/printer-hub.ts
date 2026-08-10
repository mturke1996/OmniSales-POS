/**
 * Unified printer I/O — Web Serial (USB) + Bluetooth (Capacitor native).
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

export type PrinterTransport = "usb_serial" | "bluetooth" | null;

export type UnifiedPrinterState = PrinterConnectionState & {
  transport: PrinterTransport;
};

function mergeState(): UnifiedPrinterState {
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

  const supported = canUseWebSerial() || canUseBluetoothPrinter();
  let supportMessage = serial.supportMessage;
  if (canUseBluetoothPrinter() && !canUseWebSerial()) {
    supportMessage = bluetoothSupportMessage();
  } else if (canUseBluetoothPrinter() && canUseWebSerial()) {
    supportMessage = `${serial.supportMessage} · ${bluetoothSupportMessage()}`;
  }

  return {
    connected: false,
    supported,
    supportMessage,
    baud: serial.baud,
    label: null,
    lastError: bt.lastError || serial.lastError,
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
  listener(mergeState());
  return () => {
    unsubSerial();
    unsubBt();
  };
}

export async function writeToPrinter(bytes: Uint8Array): Promise<void> {
  if (isSerialConnected()) {
    await writeToSerial(bytes);
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
  if (await tryAutoReconnectBluetoothPrinter()) {
    await writeToBluetooth(bytes);
    return;
  }

  if (canUseBluetoothPrinter()) {
    throw new Error("اربط طابعة Bluetooth من الإعدادات أو نقطة البيع");
  }

  await writeToSerial(bytes);
}

export async function printTestSlip(widthMm: 58 | 80 = 80): Promise<void> {
  const via =
    isBluetoothConnected() ? "Bluetooth" : isSerialConnected() ? "USB" : "auto";
  const lines = [
    "##OmniSales",
    "··اختبار طابعة حرارية",
    "------------------------------",
    `العرض: ${widthMm} ملم · ${via}`,
    `Baud: ${getStoredBaudRate()}`,
    new Date().toLocaleString("ar-LY"),
    "------------------------------",
    "إذا ظهرت هذه الورقة فالاتصال ناجح",
    "Thermal printer OK",
  ];
  const bytes = await buildEscPosReceiptBytes({ lines, widthMm, openDrawer: false });
  await writeToPrinter(bytes);
}

export { disconnectBluetoothPrinter };

export async function disconnectAllPrinters(): Promise<void> {
  const { disconnectSerialPrinter } = await import("./escpos");
  await Promise.all([disconnectSerialPrinter(), disconnectBluetoothPrinter()]);
}

export async function bootReconnectPrinters(): Promise<void> {
  await Promise.all([
    tryAutoReconnectSerialPrinter(),
    tryAutoReconnectBluetoothPrinter(),
  ]);
}
