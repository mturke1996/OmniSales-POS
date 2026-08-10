import { CloudArrowUp, WifiHigh, WifiSlash } from "@phosphor-icons/react";
import { cn } from "../../lib/cn";

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
  const showPending = pendingSync > 0;
  if (online && !showPending) return null;

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-between gap-2 border-b font-semibold",
        compact ? "px-2 py-1 text-[10px]" : "px-3 py-2 text-xs",
        online ? "border-highlight/20 bg-highlight/8 text-highlight" : "border-warning/25 bg-warning/10 text-warning",
        className
      )}
    >
      <span className="inline-flex items-center gap-1.5">
        {online ? (
          showPending ? (
            <CloudArrowUp size={14} weight="duotone" />
          ) : (
            <WifiHigh size={14} weight="duotone" />
          )
        ) : (
          <WifiSlash size={14} weight="duotone" />
        )}
        {!online
          ? "دون اتصال — البيع والتخزين محلي يعملان"
          : showPending
            ? `${pendingSync} عملية بانتظار الرفع للسحابة`
            : "متصل"}
      </span>

      {online && showPending && cloudEnabled && onSync && (
        <button
          type="button"
          onClick={onSync}
          disabled={syncing}
          className="rounded-full bg-highlight px-3 py-1 text-[10px] font-bold text-white transition active:scale-[0.97] disabled:opacity-50"
        >
          {syncing ? "جاري…" : "مزامنة الآن"}
        </button>
      )}

      {online && showPending && !cloudEnabled && (
        <span className="text-[10px] text-ink-mute">فعّل السحابة من الإعدادات</span>
      )}
    </div>
  );
}
