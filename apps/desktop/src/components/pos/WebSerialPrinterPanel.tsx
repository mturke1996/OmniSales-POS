import { useState } from "react";
import {
  canUseWebSerial,
  connectSerialPrinter,
  disconnectSerialPrinter,
  getStoredBaudRate,
  setStoredBaudRate,
} from "../../lib/print/escpos";
import { printTestSlip } from "../../lib/print/printer-hub";
import { usePrinter } from "../../hooks/use-printer";
import { cn } from "../../lib/cn";

/** Desktop Web Serial USB printer connect / test (Chrome / Edge). */
export function WebSerialPrinterPanel({
  thermalWidthMm = 80,
  compact = false,
  onMessage,
}: {
  thermalWidthMm?: 58 | 80;
  compact?: boolean;
  onMessage?: (msg: string) => void;
}) {
  const printer = usePrinter();
  const [baud, setBaud] = useState(getStoredBaudRate);
  const [busy, setBusy] = useState(false);

  if (!canUseWebSerial()) return null;

  const run = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      onMessage?.(ok);
    } catch (e) {
      onMessage?.(e instanceof Error ? e.message : "فشلت العملية");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={cn(
        "space-y-3 rounded-2xl border border-paper-line/70 bg-paper-raised/80",
        compact ? "p-3" : "p-4"
      )}
    >
      <p className="text-xs font-bold text-ink">USB عبر Web Serial</p>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={baud}
          onChange={(e) => {
            const next = Number(e.target.value);
            setBaud(next);
            setStoredBaudRate(next);
          }}
          className="rounded-xl border border-paper-line bg-paper px-2.5 py-2 text-[11px] font-mono font-bold"
        >
          <option value={9600}>9600</option>
          <option value={19200}>19200</option>
          <option value={38400}>38400</option>
          <option value={115200}>115200</option>
        </select>
        <button
          type="button"
          disabled={busy}
          className="btn-primary text-xs font-bold"
          onClick={() =>
            void run(
              async () => {
                await connectSerialPrinter(baud, { forcePicker: true });
              },
              "تم ربط الطابعة USB"
            )
          }
        >
          ربط USB
        </button>
        <button
          type="button"
          disabled={busy || !printer.connected}
          className="btn-ghost text-xs font-bold"
          onClick={() =>
            void run(() => printTestSlip(thermalWidthMm), "نجحت طباعة الاختبار ✓")
          }
        >
          اختبار
        </button>
        {printer.connected && (
          <button
            type="button"
            disabled={busy}
            className="btn-ghost text-xs font-bold"
            onClick={() => void run(() => disconnectSerialPrinter(), "تم فصل الطابعة")}
          >
            فصل
          </button>
        )}
      </div>
      <p className="text-[10px] text-ink-mute">
        {printer.connected
          ? `متصلة${printer.label ? ` · ${printer.label}` : ""}`
          : "Chrome/Edge — وصّل الطابعة USB ثم اضغط «ربط USB»"}
      </p>
    </div>
  );
}
