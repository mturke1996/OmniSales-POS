import { cn } from "../../lib/cn";

export function PosCategoryBar({
  activeId,
  onSelect,
  items,
  phoneLayout = false,
}: {
  activeId: string;
  onSelect: (id: string) => void;
  items: { id: string; label: string; count: number }[];
  phoneLayout?: boolean;
}) {
  if (!items.length) return null;

  return (
    <div
      className={cn(
        "flex gap-2 overflow-x-auto pb-2 scrollbar-none",
        phoneLayout && "-mx-1 px-1"
      )}
    >
      {items.map(({ id, label, count }) => {
        const active = activeId === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            className={cn(
              "shrink-0 rounded-2xl font-bold transition active:scale-[0.97]",
              phoneLayout
                ? "min-h-11 px-4 py-2.5 text-sm"
                : "rounded-lg px-3.5 py-1.5 text-xs",
              active
                ? "bg-highlight text-white shadow-soft"
                : "border border-paper-line/70 bg-paper-raised text-ink shadow-soft"
            )}
          >
            <span className="block leading-tight">{label}</span>
            <span
              className={cn(
                "mt-0.5 block text-[10px] font-semibold",
                active ? "text-white/85" : "text-ink-mute"
              )}
            >
              {count} صنف
            </span>
          </button>
        );
      })}
    </div>
  );
}
