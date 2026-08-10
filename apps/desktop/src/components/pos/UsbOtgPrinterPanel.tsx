import { useCallback, useEffect, useState } from "react";
import { Usb, CircleNotch } from "@phosphor-icons/react";
import { cn } from "../../lib/cn";
import {
  connectUsbOtgPrinter,
  disconnectUsbOtgPrinter,
  listUsbOtgPrinters,
  canUseUsbOtgPrinter,
  type ListedUsbPrinter,
} from "../../lib/print/usb-otg-printer";
import { usePrinter } from "../../hooks/use-printer";

export function UsbOtgPrinterPanel({
  compact = false,
  onMessage,
}: {
  compact?: boolean;
  onMessage?: (msg: string) => void;
}) {
  const printer = usePrinter();
  const [devices, setDevices] = useState<ListedUsbPrinter[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const notify = useCallback(
    (msg: string) => onMessage?.(msg),
    [onMessage]
  );

  const refreshDevices = useCallback(async () => {
    if (!canUseUsbOtgPrinter()) return;
    setLoading(true);
    try {
      setDevices(await listUsbOtgPrinters());
    } catch (e) {
      notify(e instanceof Error ? e.message : "تعذر قراءة أجهزة USB");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    void refreshDevices();
  }, [refreshDevices]);

  if (!canUseUsbOtgPrinter()) return null;

  return (
    <div className={cn("space-y-3", compact && "space-y-2")}>
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-bold text-ink">
          <Usb size={16} weight="duotone" className="text-highlight" />
          طابعة USB (OTG)
        </p>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-bold",
            printer.connected && printer.transport === "usb_otg"
              ? "bg-success/15 text-success"
              : "bg-paper text-ink-mute"
          )}
        >
          {printer.connected && printer.transport === "usb_otg"
            ? `متصلة · ${printer.label || "USB"}`
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
        {printer.connected && printer.transport === "usb_otg" && (
          <button
            type="button"
            className="btn-ghost text-[11px] font-bold"
            onClick={() =>
              void disconnectUsbOtgPrinter().then(() => notify("تم فصل USB"))
            }
          >
            فصل
          </button>
        )}
      </div>

      {devices.length === 0 && !loading && (
        <p className="text-[11px] leading-relaxed text-ink-mute">
          وصّل الطابعة بكابل USB/OTG. إذا لم تظهر، جرّب فصلها وأعد توصيلها ثم
          حدّث القائمة.
        </p>
      )}

      <ul className="max-h-40 space-y-1.5 overflow-y-auto">
        {devices.map((d) => (
          <li key={d.id}>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setBusy(true);
                void connectUsbOtgPrinter(d.id, d.name)
                  .then(() => notify(`تم الربط: ${d.name}`))
                  .catch((e) =>
                    notify(e instanceof Error ? e.message : "فشل الربط")
                  )
                  .finally(() => setBusy(false));
              }}
              className="flex w-full flex-col gap-0.5 rounded-xl border border-paper-line/70 bg-paper px-3 py-2 text-start text-xs transition active:scale-[0.99] hover:border-highlight/35"
            >
              <span className="font-semibold text-ink">{d.name}</span>
              <span className="flex items-center justify-between gap-2 font-mono text-[10px] text-ink-mute">
                <span>{d.id}</span>
                {!d.hasPermission && (
                  <span className="rounded bg-warning/15 px-1.5 py-0.5 text-warning">
                    يحتاج إذن
                  </span>
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {busy && (
        <p className="inline-flex items-center gap-1.5 text-[11px] text-ink-mute">
          <CircleNotch size={12} className="animate-spin" />
          جاري الربط…
        </p>
      )}
    </div>
  );
}
