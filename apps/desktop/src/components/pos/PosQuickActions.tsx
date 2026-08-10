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
}: {
  customerName?: string | null;
  saleMode: "walk_in" | "delivery";
  priceMode: "retail" | "wholesale";
  onCustomer: () => void;
  onHold: () => void;
  onToggleSaleMode: () => void;
  onTogglePriceMode: () => void;
  holdDisabled?: boolean;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
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
      />
      <QuickChip
        icon={saleMode === "delivery" ? <Truck size={16} weight="fill" /> : <Storefront size={16} weight="duotone" />}
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
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  accent?: "highlight" | "success" | "warning";
}) {
  const activeClass =
    accent === "warning"
      ? "border-warning/30 bg-warning/10 text-warning"
      : accent === "success"
        ? "border-success/30 bg-success/10 text-success"
        : "border-highlight/30 bg-highlight/10 text-highlight";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-bold transition active:scale-[0.97]",
        active ? activeClass : "border-paper-line/70 bg-paper-raised text-ink shadow-soft",
        disabled && "pointer-events-none opacity-40"
      )}
    >
      {icon}
      <span className="max-w-[7rem] truncate">{label}</span>
    </button>
  );
}
