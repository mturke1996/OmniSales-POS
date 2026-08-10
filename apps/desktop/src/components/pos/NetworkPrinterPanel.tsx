import { useState } from "react";
import { Globe, CircleNotch } from "@phosphor-icons/react";
import { cn } from "../../lib/cn";
import {
  connectNetworkPrinter,
  disconnectNetworkPrinter,
  canUseNetworkPrinter,
  getStoredNetworkPref,
} from "../../lib/print/network-printer";
import { usePrinter } from "../../hooks/use-printer";

export function NetworkPrinterPanel({
  compact = false,
  onMessage,
}: {
  compact?: boolean;
  onMessage?: (msg: string) => void;
}) {
  const printer = usePrinter();
  const stored = getStoredNetworkPref();
  const [host, setHost] = useState(stored?.host ?? "");
  const [port, setPort] = useState(String(stored?.port ?? 9100));
  const [busy, setBusy] = useState(false);

  if (!canUseNetworkPrinter()) return null;

  return (
    <div className={cn("space-y-3", compact && "space-y-2")}>
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-bold text-ink">
          <Globe size={16} weight="duotone" className="text-highlight" />
          طابعة الشبكة (LAN)
        </p>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-bold",
            printer.connected && printer.transport === "network"
              ? "bg-success/15 text-success"
              : "bg-paper text-ink-mute"
          )}
        >
          {printer.connected && printer.transport === "network"
            ? `متصلة · ${printer.label || "LAN"}`
            : "غير متصلة"}
        </span>
      </div>

      <p className="text-[11px] leading-relaxed text-ink-mute">
        أدخل IP الطابعة على نفس شبكة Wi‑Fi (منفذ ESC/POS الافتراضي 9100).
      </p>

      <div className="grid grid-cols-[1fr_5rem] gap-2">
        <input
          type="text"
          inputMode="decimal"
          placeholder="192.168.1.100"
          value={host}
          onChange={(e) => setHost(e.target.value)}
          className="input-field h-10 text-xs font-mono"
        />
        <input
          type="number"
          min={1}
          max={65535}
          value={port}
          onChange={(e) => setPort(e.target.value)}
          className="input-field h-10 text-xs font-mono"
          aria-label="منفذ TCP"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || !host.trim()}
          onClick={() => {
            setBusy(true);
            const portNum = Math.max(1, Number(port) || 9100);
            void connectNetworkPrinter(host, portNum)
              .then(() => onMessage?.(`تم الربط: ${host}:${portNum}`))
              .catch((e) =>
                onMessage?.(e instanceof Error ? e.message : "فشل الربط")
              )
              .finally(() => setBusy(false));
          }}
          className="btn-primary text-[11px] font-bold"
        >
          {busy ? "جاري…" : "ربط"}
        </button>
        {printer.connected && printer.transport === "network" && (
          <button
            type="button"
            className="btn-ghost text-[11px] font-bold"
            onClick={() =>
              void disconnectNetworkPrinter().then(() => onMessage?.("تم فصل LAN"))
            }
          >
            فصل
          </button>
        )}
      </div>

      {busy && (
        <p className="inline-flex items-center gap-1.5 text-[11px] text-ink-mute">
          <CircleNotch size={12} className="animate-spin" />
          جاري الاتصال…
        </p>
      )}
    </div>
  );
}
