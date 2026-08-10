import { Printer } from "@phosphor-icons/react";
import { BottomSheet } from "../ui/BottomSheet";
import { NativePrinterPanel } from "./NativePrinterPanel";
import { detectRuntime } from "../../lib/native";

function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function PosPrinterSheet({
  open,
  onClose,
  connected,
  printerLabel,
  supportMessage,
  transport,
  thermalWidthMm = 80,
  onPrintBrowser,
  printing,
}: {
  open: boolean;
  onClose: () => void;
  connected: boolean;
  printerLabel?: string;
  supportMessage?: string;
  transport?: "usb_serial" | "usb_otg" | "network" | "bluetooth" | null;
  thermalWidthMm?: 58 | 80;
  onPrintBrowser?: () => void;
  printing?: boolean;
}) {
  const ios = isIos();
  const isNative = detectRuntime() === "capacitor";

  return (
    <BottomSheet open={open} onOpenChange={(v) => !v && onClose()} title="الطباعة">
      <div className="space-y-4 p-4">
        <div className="flex items-center gap-3 rounded-2xl border border-paper-line bg-paper p-4">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-highlight/12 text-highlight">
            <Printer size={24} weight="duotone" />
          </div>
          <div>
            <p className="text-sm font-bold text-ink">
              {connected ? "طابعة حرارية متصلة" : "لا توجد طابعة حرارية"}
            </p>
            <p className="text-xs text-ink-mute">
              {connected
                ? `${printerLabel || "جاهزة ESC/POS"}${
                    transport === "bluetooth"
                      ? " · Bluetooth"
                      : transport === "network"
                        ? " · LAN"
                        : transport === "usb_otg"
                        ? " · USB OTG"
                        : transport === "usb_serial"
                          ? " · USB"
                          : ""
                  }`
                : supportMessage || "يمكنك الطباعة عبر المتصفح بعد كل بيع"}
            </p>
          </div>
        </div>

        {isNative && (
          <NativePrinterPanel thermalWidthMm={thermalWidthMm} compact />
        )}

        {!connected && !isNative && (
          <ul className="space-y-2 text-xs text-ink-mute">
            {ios ? (
              <>
                <li>• iPhone/iPad: بعد البيع «طباعة الإيصال» → Share → Print (AirPrint)</li>
                <li>• أو احفظ PDF وأرسله للعميل عبر واتساب</li>
              </>
            ) : (
              <>
                <li>• Android PWA: «طباعة الإيصال» عبر Chrome</li>
                <li>• Windows/Mac: اربط USB من الإعدادات → الطابعة</li>
                <li>• Android APK: USB · LAN (IP) · Bluetooth من لوحة الطابعة</li>
              </>
            )}
          </ul>
        )}

        {onPrintBrowser && (
          <button
            type="button"
            disabled={printing}
            onClick={onPrintBrowser}
            className="btn-primary min-h-12 w-full text-sm font-bold"
          >
            {printing ? "جاري الطباعة…" : "طباعة آخر إيصال (متصفح)"}
          </button>
        )}

        <button type="button" onClick={onClose} className="btn-ghost w-full text-xs font-bold">
          إغلاق
        </button>
      </div>
    </BottomSheet>
  );
}
