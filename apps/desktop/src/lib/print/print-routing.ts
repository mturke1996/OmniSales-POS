import {
  canUseWebSerial,
  isSerialConnected,
} from "./escpos";
import { isBluetoothConnected } from "./bluetooth-printer";
import { isNetworkConnected } from "./network-printer";
import { isUsbOtgConnected } from "./usb-otg-printer";

export type ThermalPrintMode = "escpos" | "html" | "auto";

/** Whether ESC/POS should be attempted before HTML fallback. */
export function shouldAttemptEscpos(mode: ThermalPrintMode): boolean {
  if (mode === "escpos") return true;
  if (mode === "html") return false;
  return (
    isSerialConnected() ||
    isUsbOtgConnected() ||
    isNetworkConnected() ||
    isBluetoothConnected() ||
    canUseWebSerial()
  );
}
