import { Star, ClockCounterClockwise, TrendUp } from "@phosphor-icons/react";
import { formatMoney } from "../../lib/format";
import { cn } from "../../lib/cn";
import type { Product } from "../../lib/types";

export function PosProductStrip({
  title,
  icon,
  products,
  pinnedIds,
  currencySymbol,
  onAdd,
  onTogglePin,
  disabled,
  compact = false,
  autoPinnedIds,
}: {
  title: string;
  icon: "pinned" | "recent" | "bestseller";
  products: Product[];
  pinnedIds?: Set<string>;
  currencySymbol: string;
  onAdd: (p: Product) => void;
  onTogglePin?: (p: Product) => void;
  disabled?: boolean;
  compact?: boolean;
  autoPinnedIds?: Set<string>;
}) {
  if (!products.length) return null;

  return (
    <div className="mb-2 shrink-0">
      <p className="mb-1.5 flex items-center gap-1.5 px-0.5 text-[10px] font-bold text-ink-mute">
        {icon === "pinned" ? (
          <Star size={12} weight="fill" className="text-warning" />
        ) : icon === "bestseller" ? (
          <TrendUp size={12} weight="duotone" className="text-success" />
        ) : (
          <ClockCounterClockwise size={12} weight="duotone" />
        )}
        {title}
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {products.map((p) => {
          const pinned = pinnedIds?.has(p.id);
          const autoPinned = !pinned && autoPinnedIds?.has(p.id);
          return (
            <div key={p.id} className="relative shrink-0">
              <button
                type="button"
                disabled={disabled || !p.is_active}
                onClick={() => onAdd(p)}
                className={cn(
                  "flex flex-col rounded-xl border bg-paper-raised px-2 py-2 text-start shadow-soft transition active:scale-[0.97]",
                  compact ? "w-[4.5rem]" : "w-[5.5rem]",
                  pinned ? "border-warning/40" : autoPinned ? "border-success/35" : "border-paper-line/70",
                  (disabled || !p.is_active) && "opacity-45"
                )}
              >
                <span
                  className={cn(
                    "line-clamp-2 font-bold leading-tight text-ink",
                    compact ? "min-h-[1.75rem] text-[9px]" : "min-h-[2rem] text-[10px]"
                  )}
                >
                  {p.name}
                </span>
                <span
                  className={cn(
                    "money-big mt-1 font-bold text-highlight",
                    compact ? "text-[9px]" : "text-[10px]"
                  )}
                >
                  {formatMoney(p.retail_price, currencySymbol)}
                </span>
              </button>
              {onTogglePin && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePin(p);
                  }}
                  className="absolute -top-1.5 -start-1.5 grid h-6 w-6 place-items-center rounded-full border border-paper-line bg-paper-raised shadow-soft"
                  aria-label={pinned || autoPinned ? "إزالة من المفضلة" : "تثبيت في المفضلة"}
                >
                  <Star
                    size={12}
                    weight={pinned || autoPinned ? "fill" : "regular"}
                    className={pinned ? "text-warning" : autoPinned ? "text-success" : "text-ink-mute"}
                  />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
