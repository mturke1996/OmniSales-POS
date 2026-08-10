import { GridFour, ShoppingCart, Camera } from "@phosphor-icons/react";
import { cn } from "../../lib/cn";
import { formatMoney } from "../../lib/format";

export type MobilePosTab = "products" | "cart";

export function MobilePosTabBar({
  activeTab,
  onTabChange,
  itemCount,
  grandTotal,
  currencySymbol,
  onScan,
}: {
  activeTab: MobilePosTab;
  onTabChange: (tab: MobilePosTab) => void;
  itemCount: number;
  grandTotal: number;
  currencySymbol: string;
  onScan: () => void;
}) {
  return (
    <nav
      className="flex shrink-0 items-stretch gap-2 border-t border-paper-line/80 bg-paper-raised/98 px-3 py-2 safe-bottom backdrop-blur-lg"
      aria-label="تنقل نقطة البيع"
    >
      <TabButton
        active={activeTab === "products"}
        onClick={() => onTabChange("products")}
        icon={<GridFour size={22} weight={activeTab === "products" ? "fill" : "duotone"} />}
        label="المنتجات"
      />

      <button
        type="button"
        onClick={onScan}
        className="relative -mt-5 grid h-14 w-14 shrink-0 place-items-center self-center rounded-2xl bg-highlight text-white shadow-lift transition active:scale-[0.96]"
        aria-label="مسح باركود"
      >
        <Camera size={26} weight="duotone" />
      </button>

      <TabButton
        active={activeTab === "cart"}
        onClick={() => onTabChange("cart")}
        icon={<ShoppingCart size={22} weight={activeTab === "cart" ? "fill" : "duotone"} />}
        label="السلة"
        badge={itemCount > 0 ? itemCount : undefined}
        subtitle={itemCount > 0 ? formatMoney(grandTotal, currencySymbol) : undefined}
      />
    </nav>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  badge,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  subtitle?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex min-h-[3.25rem] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 transition active:scale-[0.97]",
        active ? "bg-highlight/12 text-highlight" : "text-ink-mute"
      )}
    >
      <span className="relative">
        {icon}
        {badge != null && badge > 0 && (
          <span className="absolute -top-1.5 -end-2 grid h-4 min-w-4 place-items-center rounded-full bg-ink px-0.5 text-[9px] font-bold text-white">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </span>
      <span className="text-[10px] font-bold leading-none">{label}</span>
      {subtitle && (
        <span className="money-big max-w-full truncate text-[9px] font-bold leading-none opacity-90">
          {subtitle}
        </span>
      )}
    </button>
  );
}
