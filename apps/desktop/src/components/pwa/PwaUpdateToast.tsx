import { useEffect, useState } from "react";
import { ArrowsClockwise } from "@phosphor-icons/react";

type UpdateHandler = (() => void) | null;

let notifyUpdate: ((reload: () => void) => void) | null = null;

/** Called from main.tsx when a new service worker is waiting. */
export function signalPwaUpdate(reload: () => void) {
  notifyUpdate?.(reload);
}

export function PwaUpdateToast() {
  const [reload, setReload] = useState<UpdateHandler>(null);

  useEffect(() => {
    notifyUpdate = (fn) => setReload(() => fn);
    return () => {
      notifyUpdate = null;
    };
  }, []);

  if (!reload) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-50 flex justify-center px-3">
      <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-paper-line bg-paper-raised px-4 py-2.5 shadow-lift">
        <p className="text-xs font-semibold text-ink">يتوفر تحديث للتطبيق</p>
        <button
          type="button"
          className="btn-primary gap-1 px-3 py-1.5 text-[11px] font-bold"
          onClick={() => reload()}
        >
          <ArrowsClockwise size={14} weight="bold" />
          تحديث
        </button>
      </div>
    </div>
  );
}
