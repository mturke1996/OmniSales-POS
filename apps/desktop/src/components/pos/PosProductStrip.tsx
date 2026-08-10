import { Star, ClockCounterClockwise } from "@phosphor-icons/react";
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
}: {
  title: string;
  icon: "pinned" | "recent";
  products: Product[];
  pinnedIds?: Set<string>;
  currencySymbol: string;
  onAdd: (p: Product) => void;
  onTogglePin?: (p: Product) => void;
  disabled?: boolean;
}) {
  if (!products.length) return null;

  return (
    <div className="mb-2 shrink-0">
      <p className="mb-1.5 flex items-center gap-1.5 px-0.5 text-[10px] font-bold text-ink-mute">
        {icon === "pinned" ? (
          <Star size={12} weight="fill" className="text-warning" />
        ) : (
          <ClockCounterClockwise size={12} weight="duotone" />
        )}
        {title}
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {products.map((p) => {
          const pinned = pinnedIds?.has(p.id);
          return (
            <div key={p.id} className="relative shrink-0">
              <button
                type="button"
                disabled={disabled || !p.is_active}
                onClick={() => onAdd(p)}
                className={cn(
                  "flex w-[5.5rem] flex-col rounded-xl border bg-paper-raised px-2 py-2 text-start shadow-soft transition active:scale-[0.97]",
                  pinned ? "border-warning/40" : "border-paper-line/70",
                  (disabled || !p.is_active) && "opacity-45"
                )}
              >
                <span className="line-clamp-2 min-h-[2rem] text-[10px] font-bold leading-tight text-ink">
                  {p.name}
                </span>
                <span className="money-big mt-1 text-[10px] font-bold text-highlight">
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
                  aria-label={pinned ? "إزالة من المفضلة" : "تثبيت في المفضلة"}
                >
                  <Star
                    size={12}
                    weight={pinned ? "fill" : "regular"}
                    className={pinned ? "text-warning" : "text-ink-mute"}
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
