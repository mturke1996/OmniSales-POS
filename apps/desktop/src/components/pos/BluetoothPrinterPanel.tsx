import { useCallback, useEffect, useState } from "react";
import { Bluetooth, CircleNotch } from "@phosphor-icons/react";
import { cn } from "../../lib/cn";
import {
  connectBluetoothPrinter,
  disconnectBluetoothPrinter,
  listBluetoothPrinters,
  canUseBluetoothPrinter,
  type ListedBluetoothPrinter,
} from "../../lib/print/bluetooth-printer";
import { printTestSlip } from "../../lib/print/printer-hub";
import { usePrinter } from "../../hooks/use-printer";

export function BluetoothPrinterPanel({
  thermalWidthMm = 80,
  compact = false,
  onMessage,
}: {
  thermalWidthMm?: 58 | 80;
  compact?: boolean;
  onMessage?: (msg: string) => void;
}) {
  const printer = usePrinter();
  const [devices, setDevices] = useState<ListedBluetoothPrinter[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const notify = useCallback(
    (msg: string) => {
      onMessage?.(msg);
    },
    [onMessage]
  );

  const refreshDevices = useCallback(async () => {
    if (!canUseBluetoothPrinter()) return;
    setLoading(true);
    try {
      setDevices(await listBluetoothPrinters());
    } catch (e) {
      notify(e instanceof Error ? e.message : "تعذر قراءة أجهزة Bluetooth");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    void refreshDevices();
  }, [refreshDevices]);

  if (!canUseBluetoothPrinter()) return null;

  return (
    <div className={cn("space-y-3", compact && "space-y-2")}>
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-bold text-ink">
          <Bluetooth size={16} weight="duotone" className="text-highlight" />
          طابعة Bluetooth
        </p>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-bold",
            printer.connected && printer.transport === "bluetooth"
              ? "bg-success/15 text-success"
              : "bg-paper text-ink-mute"
          )}
        >
          {printer.connected && printer.transport === "bluetooth"
            ? `متصلة · ${printer.label || "BT"}`
            : "غير متصلة"}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => void refreshDevices()}
          className="btn-ghost text-[11px] font-bold"
        >
          {loading ? "جاري التحديث…" : "تحديث القائمة"}
        </button>
        {printer.connected && printer.transport === "bluetooth" && (
          <button
            type="button"
            className="btn-ghost text-[11px] font-bold"
            onClick={() =>
              void disconnectBluetoothPrinter().then(() => notify("تم فصل Bluetooth"))
            }
          >
            فصل
          </button>
        )}
      </div>

      {devices.length === 0 && !loading && (
        <p className="text-[11px] leading-relaxed text-ink-mute">
          لا توجد طابعات مقترنة. اقترن بالطابعة من إعدادات Bluetooth في الجهاز ثم حدّث
          القائمة.
        </p>
      )}

      <ul className="max-h-40 space-y-1.5 overflow-y-auto">
        {devices.map((d) => (
          <li key={d.address}>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setBusy(true);
                void connectBluetoothPrinter(d.address, d.name)
                  .then(() => notify(`تم الربط: ${d.name}`))
                  .catch((e) =>
                    notify(e instanceof Error ? e.message : "فشل الربط")
                  )
                  .finally(() => setBusy(false));
              }}
              className="flex w-full items-center justify-between rounded-xl border border-paper-line/70 bg-paper px-3 py-2 text-start text-xs transition active:scale-[0.99] hover:border-highlight/35"
            >
              <span className="font-semibold text-ink">{d.name}</span>
              <span className="font-mono text-[10px] text-ink-mute">{d.address}</span>
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        disabled={busy || !printer.connected}
        onClick={() => {
          setBusy(true);
          void printTestSlip(thermalWidthMm)
            .then(() => notify("نجحت طباعة الاختبار ✓"))
            .catch((e) => notify(e instanceof Error ? e.message : "فشلت الطباعة"))
            .finally(() => setBusy(false));
        }}
        className="btn-primary min-h-10 w-full text-xs font-bold"
      >
        {busy ? (
          <span className="inline-flex items-center gap-1.5">
            <CircleNotch size={14} className="animate-spin" />
            جاري…
          </span>
        ) : (
          "طباعة اختبار Bluetooth"
        )}
      </button>
    </div>
  );
}
