import type { ReactNode } from "react";
import {
  Storefront,
  ClockAfternoon,
  ShoppingBag,
  Package,
  Users,
  Receipt,
  ChartBar,
  GearSix,
} from "@phosphor-icons/react";
import { THEME_PRESETS } from "../lib/theme";
import type { BranchSettings, Shift } from "../lib/types";

export type ViewTab =
  | "pos"
  | "shifts"
  | "orders"
  | "inventory"
  | "customers"
  | "expenses"
  | "reports"
  | "settings";

interface NavbarProps {
  currentTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
  openShift: Shift | null;
  settings: BranchSettings;
  heldCartsCount: number;
}

export function Navbar({
  currentTab,
  onTabChange,
  openShift,
  settings,
  heldCartsCount,
}: NavbarProps) {
  const currentTheme = THEME_PRESETS.find((t) => t.key === settings.theme_key) || THEME_PRESETS[0];

  return (
    <header className="sticky top-0 z-30 border-b border-paper-line bg-paper-raised/95 backdrop-blur-md transition-colors">
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3 px-4 py-2.5">
        {/* Brand & Theme Tag */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-ink text-paper font-black shadow-sm">
              O
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight tracking-tight text-ink">
                {settings.name || "OmniSales"}
              </h1>
              <div className="flex items-center gap-1.5 text-xs text-ink-mute">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{settings.currency_symbol}</span>
                <span>•</span>
                <span className="font-medium text-ink-soft">{currentTheme.label_ar.split(" ")[0]}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-wrap items-center gap-1.5">
          <NavItem
            active={currentTab === "pos"}
            onClick={() => onTabChange("pos")}
            icon={<Storefront size={18} weight="bold" />}
            label="نقطة البيع"
            badge={heldCartsCount > 0 ? heldCartsCount : undefined}
          />
          <NavItem
            active={currentTab === "shifts"}
            onClick={() => onTabChange("shifts")}
            icon={<ClockAfternoon size={18} weight="bold" />}
            label="الورديات"
            badge={openShift ? "مفتوحة" : undefined}
            badgeColor={openShift ? "bg-emerald-100 text-emerald-800" : undefined}
          />
          <NavItem
            active={currentTab === "orders"}
            onClick={() => onTabChange("orders")}
            icon={<ShoppingBag size={18} weight="bold" />}
            label="الطلبات والتوصيل"
          />
          <NavItem
            active={currentTab === "inventory"}
            onClick={() => onTabChange("inventory")}
            icon={<Package size={18} weight="bold" />}
            label="المنتجات والمخزون"
          />
          <NavItem
            active={currentTab === "customers"}
            onClick={() => onTabChange("customers")}
            icon={<Users size={18} weight="bold" />}
            label="العملاء والآجل"
          />
          <NavItem
            active={currentTab === "expenses"}
            onClick={() => onTabChange("expenses")}
            icon={<Receipt size={18} weight="bold" />}
            label="المصروفات"
          />
          <NavItem
            active={currentTab === "reports"}
            onClick={() => onTabChange("reports")}
            icon={<ChartBar size={18} weight="bold" />}
            label="التقارير"
          />
          <NavItem
            active={currentTab === "settings"}
            onClick={() => onTabChange("settings")}
            icon={<GearSix size={18} weight="bold" />}
            label="الإعدادات"
          />
        </nav>
      </div>
    </header>
  );
}

function NavItem({
  active,
  onClick,
  icon,
  label,
  badge,
  badgeColor,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  badge?: string | number;
  badgeColor?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-95 ${
        active
          ? "bg-ink text-paper shadow-sm"
          : "border border-paper-line bg-paper-raised text-ink-soft hover:bg-paper hover:text-ink"
      }`}
    >
      {icon}
      <span>{label}</span>
      {badge !== undefined && (
        <span
          className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
            badgeColor || "bg-amber-100 text-amber-900"
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
