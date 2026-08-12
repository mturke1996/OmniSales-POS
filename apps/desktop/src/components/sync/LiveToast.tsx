import { useEffect, useState } from "react";
import { X, Broadcast } from "@phosphor-icons/react";
import { useLiveState } from "../../hooks/use-live-sync";

export function LiveToastHost() {
  const live = useLiveState();
  const [seen, setSeen] = useState<string | null>(null);
  const latest = live.recentEvents[0];
  const show =
    latest &&
    latest.id !== seen &&
    live.status !== "disabled" &&
    Date.now() - Date.parse(latest.at) < 8_000;

  useEffect(() => {
    if (!show || !latest) return;
    const t = window.setTimeout(() => setSeen(latest.id), 5200);
    return () => window.clearTimeout(t);
  }, [show, latest]);

  if (!show || !latest) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[max(0.5rem,calc(env(safe-area-inset-top)+0.4rem))] z-[70] flex justify-center px-3">
      <div className="pointer-events-auto flex max-w-md items-start gap-2 rounded-2xl border border-highlight/25 bg-paper-raised px-3 py-2.5 shadow-lift">
        <Broadcast size={16} className="mt-0.5 shrink-0 text-highlight" weight="fill" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold text-highlight">تحديث فوري من جهاز آخر</p>
          <p className="truncate text-xs font-semibold text-ink">{latest.label}</p>
        </div>
        <button
          type="button"
          className="grid h-7 w-7 place-items-center rounded-lg text-ink-mute hover:bg-paper"
          onClick={() => setSeen(latest.id)}
          aria-label="إخفاء"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
