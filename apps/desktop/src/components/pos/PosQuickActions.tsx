import {
  User,
  Pause,
  Storefront,
  Truck,
  Tag,
} from "@phosphor-icons/react";
import { cn } from "../../lib/cn";

export function PosQuickActions({
  customerName,
  saleMode,
  priceMode,
  onCustomer,
  onHold,
  onToggleSaleMode,
  onTogglePriceMode,
  holdDisabled,
  heldCount = 0,
}: {
  customerName?: string | null;
  saleMode: "walk_in" | "delivery";
  priceMode: "retail" | "wholesale";
  onCustomer: () => void;
  onHold: () => void;
  onToggleSaleMode: () => void;
  onTogglePriceMode: () => void;
  holdDisabled?: boolean;
  heldCount?: number;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
      <QuickChip
        icon={<User size={16} weight="duotone" />}
        label={customerName || "عميل"}
        active={Boolean(customerName)}
        onClick={onCustomer}
      />
      <QuickChip
        icon={<Pause size={16} weight="duotone" />}
        label="تعليق"
        onClick={onHold}
        disabled={holdDisabled}
        badge={heldCount > 0 ? heldCount : undefined}
      />
      <QuickChip
        icon={
          saleMode === "delivery" ? (
            <Truck size={16} weight="fill" />
          ) : (
            <Storefront size={16} weight="duotone" />
          )
        }
        label={saleMode === "delivery" ? "توصيل" : "مباشر"}
        active={saleMode === "delivery"}
        onClick={onToggleSaleMode}
      />
      <QuickChip
        icon={<Tag size={16} weight="duotone" />}
        label={priceMode === "wholesale" ? "جملة" : "تجزئة"}
        active={priceMode === "wholesale"}
        onClick={onTogglePriceMode}
        accent={priceMode === "wholesale" ? "warning" : "success"}
      />
    </div>
  );
}

function QuickChip({
  icon,
  label,
  onClick,
  active,
  disabled,
  accent = "highlight",
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  accent?: "highlight" | "success" | "warning";
  badge?: number;
}) {
  const activeClass =
    accent === "warning"
      ? "border-warning/35 bg-warning/12 text-warning shadow-sm"
      : accent === "success"
        ? "border-success/35 bg-success/12 text-success shadow-sm"
        : "border-highlight/35 bg-highlight/12 text-highlight shadow-sm";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition duration-200 ease-spring active:scale-[0.97]",
        active ? activeClass : "border-paper-line/60 bg-paper-raised text-ink shadow-sm hover:border-highlight/25",
        disabled && "pointer-events-none opacity-40"
      )}
    >
      {icon}
      <span className="max-w-[8rem] truncate">{label}</span>
      {badge !== undefined && (
        <span className="rounded-full bg-highlight px-1.5 py-0.5 text-[9px] font-bold text-white">
          {badge}
        </span>
      )}
    </button>
  );
}
