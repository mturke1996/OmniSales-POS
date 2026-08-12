import { CloudArrowUp, WifiHigh, WifiSlash, Broadcast } from "@phosphor-icons/react";
import { cn } from "../../lib/cn";
import { useLiveState } from "../../hooks/use-live-sync";
import { liveStatusLabel } from "../../lib/live-sync-core";

export function PosSyncBar({
  online,
  pendingSync,
  cloudEnabled,
  syncing,
  onSync,
  compact = false,
  className,
}: {
  online: boolean;
  pendingSync: number;
  cloudEnabled?: boolean;
  syncing?: boolean;
  onSync?: () => void;
  compact?: boolean;
  className?: string;
}) {
  const live = useLiveState();
  const showPending = pendingSync > 0;
  const showLiveWork =
    Boolean(cloudEnabled) &&
    (live.status === "syncing" || live.status === "error" || live.status === "connecting");
  if (online && !showPending && !showLiveWork) return null;

  const busy = syncing || live.status === "syncing";

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-between gap-2 border-b font-semibold backdrop-blur-sm",
        compact ? "px-2 py-1 text-[10px]" : "px-3 py-2 text-xs",
        !online
          ? "border-warning/20 bg-warning/8 text-warning"
          : live.status === "error"
            ? "border-danger/20 bg-danger/8 text-danger"
            : "border-highlight/15 bg-highlight/6 text-highlight",
        className
      )}
    >
      <span className="inline-flex items-center gap-1.5">
        {!online ? (
          <WifiSlash size={14} weight="duotone" />
        ) : showPending ? (
          <CloudArrowUp size={14} weight="duotone" />
        ) : live.status === "live" || live.status === "syncing" ? (
          <Broadcast size={14} weight="fill" />
        ) : (
          <WifiHigh size={14} weight="duotone" />
        )}
        {!online
          ? "دون اتصال — البيع والتخزين محلي يعملان"
          : showPending
            ? `${pendingSync} عملية بانتظار الرفع للسحابة`
            : live.status === "error"
              ? live.lastError || "تعذر البث الفوري"
              : liveStatusLabel(live.status)}
      </span>

      {online && cloudEnabled && onSync && (showPending || live.status === "error") && (
        <button
          type="button"
          onClick={onSync}
          disabled={busy}
          className="rounded-full bg-highlight px-3 py-1 text-[10px] font-bold text-white transition active:scale-[0.97] disabled:opacity-50"
        >
          {busy ? "جاري…" : "مزامنة الآن"}
        </button>
      )}

      {online && showPending && !cloudEnabled && (
        <span className="text-[10px] text-ink-mute">فعّل السحابة من الإعدادات</span>
      )}
    </div>
  );
}
