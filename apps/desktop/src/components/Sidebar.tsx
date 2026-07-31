import { useState, type ReactNode } from "react";
import {
  House,
  Storefront,
  ClockAfternoon,
  Package,
  Users,
  Receipt,
  ChartBar,
  GearSix,
  SidebarSimple,
  FileText,
  ArrowUUpLeft,
  Sparkle,
  X,
  Truck,
  Handshake,
  ShieldCheck,
} from "@phosphor-icons/react";
import type { BranchSettings, Shift } from "../lib/types";
import type { CashierSession } from "../lib/session";
import { cn } from "../lib/cn";

export type SidebarTab =
  | "dashboard"
  | "pos"
  | "shifts"
  | "orders"
  | "invoices"
  | "returns"
  | "inventory"
  | "purchases"
  | "customers"
  | "expenses"
  | "ops"
  | "reports"
  | "settings";

interface SidebarProps {
  currentTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  openShift: Shift | null;
  settings: BranchSettings;
  heldCartsCount: number;
  session?: CashierSession | null;
  pendingSync?: number;
  /** Desktop collapse / width — forced expanded in drawer mode */
  className?: string;
  /** Mobile drawer: show close (X) and hide collapse toggle */
  onClose?: () => void;
}

const PRIMARY_NAV: { id: SidebarTab; label: string; icon: ReactNode }[] = [
  { id: "dashboard", label: "لوحة التحكم", icon: <House size={18} weight="duotone" /> },
  { id: "pos", label: "نقطة البيع", icon: <Storefront size={18} weight="duotone" /> },
  { id: "shifts", label: "الورديات", icon: <ClockAfternoon size={18} weight="duotone" /> },
  { id: "orders", label: "التوصيل", icon: <Truck size={18} weight="duotone" /> },
  { id: "invoices", label: "المبيعات المنفذة", icon: <FileText size={18} weight="duotone" /> },
  { id: "returns", label: "المرتجعات", icon: <ArrowUUpLeft size={18} weight="duotone" /> },
  { id: "inventory", label: "المخزون", icon: <Package size={18} weight="duotone" /> },
  { id: "purchases", label: "المشتريات", icon: <Handshake size={18} weight="duotone" /> },
  { id: "customers", label: "العملاء", icon: <Users size={18} weight="duotone" /> },
];

const SECONDARY_NAV: { id: SidebarTab; label: string; icon: ReactNode }[] = [
  { id: "expenses", label: "المصروفات", icon: <Receipt size={18} weight="duotone" /> },
  { id: "ops", label: "عروض وتدقيق", icon: <ShieldCheck size={18} weight="duotone" /> },
  { id: "reports", label: "التقارير", icon: <ChartBar size={18} weight="duotone" /> },
  { id: "settings", label: "الإعدادات", icon: <GearSix size={18} weight="duotone" /> },
];

export function Sidebar({
  currentTab,
  onTabChange,
  openShift,
  settings,
  heldCartsCount,
  session,
  pendingSync = 0,
  className,
  onClose,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const isDrawer = Boolean(onClose);
  const slim = !isDrawer && collapsed;

  const go = (tab: SidebarTab) => {
    onTabChange(tab);
    onClose?.();
  };

  return (
    <aside
      className={cn(
        "sidebar-shell flex h-full min-h-0 flex-col transition-[width] duration-300 ease-spring",
        !isDrawer && "sticky top-0 z-40 h-dvh",
        !isDrawer && (slim ? "w-[76px]" : "w-[260px]"),
        isDrawer && "h-full w-full border-e-0",
        className
      )}
    >
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-white/10 px-4">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-highlight text-white shadow-soft">
          <Sparkle size={20} weight="fill" />
        </div>
        {!slim && (
          <div className="min-w-0 flex-1 animate-fade-up">
            <h1 className="truncate text-sm font-bold tracking-tight text-sidebar-text">
              {settings.name || "OmniSales"}
            </h1>
            <p className="truncate text-[11px] text-sidebar-mute">
              POS · {settings.currency_symbol}
            </p>
          </div>
        )}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sidebar-mute transition hover:bg-white/10 hover:text-sidebar-text"
            aria-label="إغلاق القائمة"
          >
            <X size={20} weight="bold" />
          </button>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto overscroll-contain px-3 py-4 scrollbar-none">
        {PRIMARY_NAV.map((item) => (
          <SidebarItem
            key={item.id}
            active={currentTab === item.id}
            onClick={() => go(item.id)}
            icon={item.icon}
            label={item.label}
            collapsed={slim}
            badge={
              item.id === "pos" && heldCartsCount > 0
                ? heldCartsCount
                : item.id === "shifts" && openShift
                  ? "حية"
                  : undefined
            }
          />
        ))}

        <div className={cn("my-2 border-t border-white/10", slim ? "mx-1" : "mx-2")} />

        {SECONDARY_NAV.map((item) => (
          <SidebarItem
            key={item.id}
            active={currentTab === item.id}
            onClick={() => go(item.id)}
            icon={item.icon}
            label={item.label}
            collapsed={slim}
          />
        ))}
      </nav>

      <div className="shrink-0 space-y-2 border-t border-white/10 p-3">
        {!slim && (
          <div className="rounded-2xl bg-highlight/20 p-3">
            <p className="text-[11px] font-bold text-white">مزامنة سحابية</p>
            <p className="mt-1 text-[11px] text-sidebar-mute">
              {pendingSync > 0
                ? `${pendingSync} عملية بانتظار الرفع`
                : settings.cloud_sync_enabled
                  ? "الطابور فارغ"
                  : "المزامنة متوقفة"}
            </p>
            <button
              type="button"
              onClick={() => go("settings")}
              className="mt-2 w-full rounded-full bg-highlight px-3 py-1.5 text-[11px] font-bold text-white transition hover:opacity-95 active:scale-[0.98]"
            >
              إدارة السحابة
            </button>
          </div>
        )}

        {!slim && (
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-xs font-bold text-white">
              {(session?.cashier_name || "ك").slice(0, 1)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-sidebar-text">
                {session?.cashier_name || "كاشير"}
              </p>
              <p className="truncate text-[10px] text-sidebar-mute">
                {openShift ? "وردية مفتوحة" : "لا توجد وردية"}
              </p>
            </div>
          </div>
        )}

        {!isDrawer && (
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className={cn(
              "flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-mute transition hover:bg-white/5 hover:text-sidebar-text",
              slim && "justify-center"
            )}
            title={slim ? "توسيع" : "طي"}
          >
            <SidebarSimple size={18} weight="duotone" />
            {!slim && <span>طي الشريط</span>}
          </button>
        )}
      </div>
    </aside>
  );
}

function SidebarItem({
  active,
  onClick,
  icon,
  label,
  badge,
  collapsed,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  badge?: string | number;
  collapsed: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      title={collapsed ? label : undefined}
      className={cn(
        "group relative flex min-h-12 w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-[15px] font-medium transition duration-200",
        active
          ? "bg-highlight/90 text-white shadow-soft"
          : "text-sidebar-mute hover:bg-white/[0.06] hover:text-sidebar-text",
        collapsed && "min-h-11 justify-center px-2 text-sm"
      )}
    >
      <span className="shrink-0">{icon}</span>
      {!collapsed && <span className="truncate">{label}</span>}
      {badge !== undefined && (
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-bold",
            active ? "bg-white/20 text-white" : "bg-highlight text-white",
            collapsed
              ? "absolute -top-0.5 end-0.5 min-w-[1.1rem] px-1 text-center"
              : "ms-auto"
          )}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
