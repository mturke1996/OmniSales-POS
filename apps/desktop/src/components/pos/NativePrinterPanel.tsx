import { CircleNotch } from "@phosphor-icons/react";
import { detectRuntime } from "../../lib/native";
import { printTestSlip } from "../../lib/print/printer-hub";
import { usePrinter } from "../../hooks/use-printer";
import { BluetoothPrinterPanel } from "./BluetoothPrinterPanel";
import { UsbOtgPrinterPanel } from "./UsbOtgPrinterPanel";
import { NetworkPrinterPanel } from "./NetworkPrinterPanel";
import { useState } from "react";

/** Native (Capacitor) printer setup: USB OTG + Bluetooth + test print. */
export function NativePrinterPanel({
  thermalWidthMm = 80,
  compact = false,
  onMessage,
}: {
  thermalWidthMm?: 58 | 80;
  compact?: boolean;
  onMessage?: (msg: string) => void;
}) {
  const printer = usePrinter();
  const [busy, setBusy] = useState(false);
  const isNative = detectRuntime() === "capacitor";

  if (!isNative) return null;

  return (
    <div className="space-y-4 rounded-2xl border border-paper-line/70 bg-paper-raised/80 p-3">
      <UsbOtgPrinterPanel compact={compact} onMessage={onMessage} />
      <div className="border-t border-paper-line/60 pt-3">
        <NetworkPrinterPanel compact={compact} onMessage={onMessage} />
      </div>
      <div className="border-t border-paper-line/60 pt-3">
        <BluetoothPrinterPanel
          compact={compact}
          onMessage={onMessage}
          showTestButton={false}
        />
      </div>
      <button
        type="button"
        disabled={busy || !printer.connected}
        onClick={() => {
          setBusy(true);
          void printTestSlip(thermalWidthMm)
            .then(() => onMessage?.("نجحت طباعة الاختبار ✓"))
            .catch((e) =>
              onMessage?.(e instanceof Error ? e.message : "فشلت الطباعة")
            )
            .finally(() => setBusy(false));
        }}
        className="btn-primary min-h-10 w-full text-xs font-bold"
      >
        {busy ? (
          <span className="inline-flex items-center justify-center gap-1.5">
            <CircleNotch size={14} className="animate-spin" />
            جاري الطباعة…
          </span>
        ) : (
          "طباعة اختبار حرارية"
        )}
      </button>
    </div>
  );
}
