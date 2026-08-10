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
  MagnifyingGlass,
} from "@phosphor-icons/react";
import type { BranchSettings, Shift } from "../lib/types";
import type { CashierSession } from "../lib/session";
import { cn } from "../lib/cn";
import { AppDownloadLink } from "./AppDownloadLink";

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
  className?: string;
  onClose?: () => void;
}

type NavItem = { id: SidebarTab; label: string; icon: ReactNode };

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "الرئيسية",
    items: [
      { id: "dashboard", label: "لوحة التحكم", icon: <House size={17} weight="duotone" /> },
      { id: "pos", label: "نقطة البيع", icon: <Storefront size={17} weight="duotone" /> },
      { id: "shifts", label: "الورديات", icon: <ClockAfternoon size={17} weight="duotone" /> },
    ],
  },
  {
    title: "المبيعات",
    items: [
      { id: "orders", label: "التوصيل", icon: <Truck size={17} weight="duotone" /> },
      { id: "invoices", label: "المبيعات المنفذة", icon: <FileText size={17} weight="duotone" /> },
      { id: "returns", label: "المرتجعات", icon: <ArrowUUpLeft size={17} weight="duotone" /> },
      { id: "customers", label: "العملاء", icon: <Users size={17} weight="duotone" /> },
    ],
  },
  {
    title: "المخزون والمشتريات",
    items: [
      { id: "inventory", label: "المخزون", icon: <Package size={17} weight="duotone" /> },
      { id: "purchases", label: "المشتريات", icon: <Handshake size={17} weight="duotone" /> },
    ],
  },
  {
    title: "المالية والإدارة",
    items: [
      { id: "expenses", label: "المصروفات", icon: <Receipt size={17} weight="duotone" /> },
      { id: "ops", label: "عروض وتدقيق", icon: <ShieldCheck size={17} weight="duotone" /> },
      { id: "reports", label: "التقارير", icon: <ChartBar size={17} weight="duotone" /> },
      { id: "settings", label: "الإعدادات", icon: <GearSix size={17} weight="duotone" /> },
    ],
  },
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
  const [filter, setFilter] = useState("");
  const isDrawer = Boolean(onClose);
  const slim = !isDrawer && collapsed;

  const go = (tab: SidebarTab) => {
    onTabChange(tab);
    onClose?.();
  };

  const q = filter.trim().toLowerCase();
  const groups = q
    ? NAV_GROUPS.map((g) => ({
        ...g,
        items: g.items.filter((i) => i.label.toLowerCase().includes(q)),
      })).filter((g) => g.items.length > 0)
    : NAV_GROUPS;

  return (
    <aside
      className={cn(
        "sidebar-shell flex h-full min-h-0 flex-col border-e border-white/5 transition-[width] duration-300 ease-spring",
        !isDrawer && "sticky top-0 z-40 h-app shrink-0",
        !isDrawer && (slim ? "w-[72px]" : "w-[272px]"),
        isDrawer && "h-full w-full",
        className
      )}
    >
      <div className="flex h-[var(--topbar-height)] shrink-0 items-center gap-3 border-b border-white/10 px-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-highlight text-white shadow-soft">
          <Sparkle size={18} weight="fill" />
        </div>
        {!slim && (
          <div className="min-w-0 flex-1 animate-fade-up">
            <h1 className="truncate text-[13px] font-bold tracking-tight text-sidebar-text">
              {settings.name || "OmniSales"}
            </h1>
            <p className="truncate text-[10px] text-sidebar-mute">
              ERP · {settings.currency_symbol}
            </p>
          </div>
        )}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-sidebar-mute transition hover:bg-white/10 hover:text-sidebar-text"
            aria-label="إغلاق القائمة"
          >
            <X size={18} weight="bold" />
          </button>
        )}
      </div>

      {!slim && (
        <div className="shrink-0 px-3 py-2">
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-2">
            <MagnifyingGlass size={15} className="shrink-0 text-sidebar-mute" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="بحث في القائمة…"
              className="min-w-0 flex-1 bg-transparent text-xs text-sidebar-text outline-none placeholder:text-sidebar-mute"
            />
          </div>
        </div>
      )}

      <nav className="flex flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-2 py-2 scrollbar-none">
        {groups.map((group) => (
          <div key={group.title}>
            {!slim && (
              <p className="mb-1 px-2 text-[10px] font-bold uppercase tracking-wider text-sidebar-mute/80">
                {group.title}
              </p>
            )}
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => (
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
                        ? "●"
                        : undefined
                  }
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="shrink-0 space-y-2 border-t border-white/10 p-2">
        {!slim && <AppDownloadLink />}

        {!slim && (
          <div className="rounded-xl bg-white/5 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold text-sidebar-text">المزامنة</p>
              {pendingSync > 0 && (
                <span className="rounded-full bg-highlight px-1.5 py-0.5 text-[9px] font-bold text-white">
                  {pendingSync}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[10px] text-sidebar-mute">
              {pendingSync > 0
                ? "عمليات بانتظار الرفع"
                : settings.cloud_sync_enabled
                  ? "متزامن"
                  : "متوقف"}
            </p>
          </div>
        )}

        {!slim && session && (
          <div className="flex items-center gap-2 rounded-lg px-2 py-1.5">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-highlight/30 text-[11px] font-bold text-white">
              {session.cashier_name.slice(0, 1)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-bold text-sidebar-text">
                {session.cashier_name}
              </p>
              <p className="truncate text-[9px] text-sidebar-mute">
                {openShift ? "وردية مفتوحة" : "بدون وردية"}
              </p>
            </div>
          </div>
        )}

        {!isDrawer && (
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className={cn(
              "flex min-h-10 w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-sidebar-mute transition hover:bg-white/5 hover:text-sidebar-text",
              slim && "justify-center"
            )}
            title={slim ? "توسيع" : "طي"}
          >
            <SidebarSimple size={16} weight="duotone" />
            {!slim && <span>طي القائمة</span>}
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
        "group relative flex min-h-10 w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition duration-150",
        active
          ? "bg-sidebar-active/20 text-white before:absolute before:inset-y-1 before:start-0 before:w-0.5 before:rounded-full before:bg-sidebar-active"
          : "text-sidebar-mute hover:bg-white/[0.06] hover:text-sidebar-text",
        collapsed && "min-h-10 justify-center px-2"
      )}
    >
      <span className="shrink-0">{icon}</span>
      {!collapsed && <span className="truncate">{label}</span>}
      {badge !== undefined && (
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[9px] font-bold",
            active ? "bg-white/20 text-white" : "bg-highlight text-white",
            collapsed
              ? "absolute -top-0.5 end-0.5 min-w-[1rem] px-1 text-center"
              : "ms-auto"
          )}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
