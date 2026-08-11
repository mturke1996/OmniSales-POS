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
  DeviceMobile,
  DownloadSimple,
  CloudArrowUp,
} from "@phosphor-icons/react";
import type { BranchSettings, Shift } from "../lib/types";
import type { CashierSession } from "../lib/session";
import { cn } from "../lib/cn";
import {
  APK_FILENAME,
  mainMenuApkDownloadUrl,
  shouldOfferApkDownload,
} from "../lib/app-download";
import { detectRuntime } from "../lib/native";

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

type NavTabItem = { kind: "tab"; id: SidebarTab; label: string; icon: ReactNode };
type NavExternalItem = {
  kind: "external";
  id: string;
  label: string;
  icon: ReactNode;
  href: string;
  download?: string;
  when?: () => boolean;
};
type NavItem = NavTabItem | NavExternalItem;

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "الرئيسية",
    items: [
      { kind: "tab", id: "dashboard", label: "لوحة التحكم", icon: <House size={18} weight="duotone" /> },
      { kind: "tab", id: "pos", label: "نقطة البيع", icon: <Storefront size={18} weight="duotone" /> },
      { kind: "tab", id: "shifts", label: "الورديات", icon: <ClockAfternoon size={18} weight="duotone" /> },
      {
        kind: "external",
        id: "android-apk",
        label: "تطبيق Android",
        icon: <DeviceMobile size={18} weight="duotone" />,
        href: mainMenuApkDownloadUrl(),
        download: APK_FILENAME,
        when: () => shouldOfferApkDownload(detectRuntime()),
      },
    ],
  },
  {
    title: "المبيعات",
    items: [
      { kind: "tab", id: "orders", label: "التوصيل", icon: <Truck size={18} weight="duotone" /> },
      { kind: "tab", id: "invoices", label: "المبيعات المنفذة", icon: <FileText size={18} weight="duotone" /> },
      { kind: "tab", id: "returns", label: "المرتجعات", icon: <ArrowUUpLeft size={18} weight="duotone" /> },
      { kind: "tab", id: "customers", label: "العملاء", icon: <Users size={18} weight="duotone" /> },
    ],
  },
  {
    title: "المخزون والمشتريات",
    items: [
      { kind: "tab", id: "inventory", label: "المخزون", icon: <Package size={18} weight="duotone" /> },
      { kind: "tab", id: "purchases", label: "المشتريات", icon: <Handshake size={18} weight="duotone" /> },
    ],
  },
  {
    title: "المالية والإدارة",
    items: [
      { kind: "tab", id: "expenses", label: "المصروفات", icon: <Receipt size={18} weight="duotone" /> },
      { kind: "tab", id: "ops", label: "عروض وتدقيق", icon: <ShieldCheck size={18} weight="duotone" /> },
      { kind: "tab", id: "reports", label: "التقارير", icon: <ChartBar size={18} weight="duotone" /> },
      { kind: "tab", id: "settings", label: "الإعدادات", icon: <GearSix size={18} weight="duotone" /> },
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
        items: g.items.filter((i) => {
          if (i.kind === "external" && i.when && !i.when()) return false;
          return i.label.toLowerCase().includes(q);
        }),
      })).filter((g) => g.items.length > 0)
    : NAV_GROUPS.map((g) => ({
        ...g,
        items: g.items.filter((i) => !(i.kind === "external" && i.when && !i.when())),
      }));

  return (
    <aside
      className={cn(
        "sidebar-shell flex h-full min-h-0 flex-col transition-[width] duration-300 ease-spring",
        !isDrawer && "sticky top-0 z-40 h-app shrink-0",
        !isDrawer && (slim ? "w-[76px]" : "w-[280px]"),
        isDrawer && "h-full w-full",
        className
      )}
    >
      <div className="flex h-[var(--topbar-height)] shrink-0 items-center gap-3 border-b border-white/10 px-3">
        <div className={cn("sidebar-brand-mark shrink-0", slim ? "h-9 w-9" : "h-10 w-10")}>
          <Sparkle size={slim ? 17 : 19} weight="fill" />
        </div>
        {!slim && (
          <div className="min-w-0 flex-1 animate-fade-up">
            <h1 className="truncate text-[13px] font-bold tracking-tight text-sidebar-text">
              {settings.name || "OmniSales"}
            </h1>
            <p className="truncate text-[10px] text-sidebar-mute">
              ERP · {settings.currency_symbol}
              {openShift ? " · وردية مفتوحة" : ""}
            </p>
          </div>
        )}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sidebar-mute transition hover:bg-white/10 hover:text-sidebar-text"
            aria-label="إغلاق القائمة"
          >
            <X size={18} weight="bold" />
          </button>
        )}
      </div>

      {!slim && currentTab !== "pos" && (
        <div className="shrink-0 px-3 pt-2">
          <button
            type="button"
            onClick={() => go("pos")}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-highlight/90 px-3 py-2.5 text-xs font-bold text-white shadow-soft transition duration-200 ease-spring hover:bg-highlight active:scale-[0.98]"
          >
            <Storefront size={16} weight="duotone" />
            فتح نقطة البيع
            {heldCartsCount > 0 && (
              <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">{heldCartsCount}</span>
            )}
          </button>
        </div>
      )}

      {!slim && (
        <div className="shrink-0 px-3 py-2">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-2 backdrop-blur-sm">
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
              <p className="mb-1.5 px-2 text-[10px] font-bold tracking-wide text-sidebar-mute/90">
                {group.title}
              </p>
            )}
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) =>
                item.kind === "external" ? (
                  <SidebarExternalItem
                    key={item.id}
                    href={item.href}
                    download={item.download}
                    icon={item.icon}
                    label={item.label}
                    collapsed={slim}
                  />
                ) : (
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
                )
              )}
            </div>
          </div>
        ))}
      </nav>

      <div className="shrink-0 space-y-2 border-t border-white/10 p-2">
        {!slim && (
          <div className="sidebar-status-card">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-sidebar-text">
                <CloudArrowUp size={13} weight="duotone" />
                المزامنة
              </span>
              {pendingSync > 0 ? (
                <span className="rounded-full bg-highlight px-2 py-0.5 text-[9px] font-bold text-white">
                  {pendingSync}
                </span>
              ) : (
                <span className="text-[9px] font-semibold text-success">
                  {settings.cloud_sync_enabled ? "جاهز" : "محلي"}
                </span>
              )}
            </div>
            <p className="mt-1 text-[10px] leading-relaxed text-sidebar-mute">
              {pendingSync > 0
                ? "عمليات بانتظار الرفع للسحابة"
                : settings.cloud_sync_enabled
                  ? "البيانات متزامنة"
                  : "العمل دون اتصال محفوظ محلياً"}
            </p>
          </div>
        )}

        {!slim && session && (
          <div className="flex items-center gap-2.5 rounded-xl px-2 py-1.5">
            <div className="sidebar-brand-mark grid h-9 w-9 shrink-0 place-items-center text-[11px] font-bold">
              {session.cashier_name.slice(0, 1)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-bold text-sidebar-text">
                {session.cashier_name}
              </p>
              <p className="truncate text-[9px] text-sidebar-mute">
                {openShift ? "وردية مفتوحة · جاهز للبيع" : "بدون وردية نشطة"}
              </p>
            </div>
          </div>
        )}

        {!isDrawer && (
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className={cn(
              "sidebar-nav-item sidebar-nav-item-idle",
              slim && "justify-center px-2"
            )}
            title={slim ? "توسيع" : "طي"}
          >
            <span className={cn("sidebar-nav-icon sidebar-nav-icon-idle", slim ? "h-8 w-8" : "h-8 w-8")}>
              <SidebarSimple size={16} weight="duotone" />
            </span>
            {!slim && <span className="text-xs">طي القائمة</span>}
          </button>
        )}
      </div>
    </aside>
  );
}

function SidebarExternalItem({
  href,
  download,
  icon,
  label,
  collapsed,
}: {
  href: string;
  download?: string;
  icon: ReactNode;
  label: string;
  collapsed: boolean;
}) {
  return (
    <a
      href={href}
      download={download}
      target="_blank"
      rel="noopener noreferrer"
      title={collapsed ? label : undefined}
      className={cn("sidebar-nav-item sidebar-nav-item-idle group", collapsed && "justify-center px-2")}
    >
      <span className={cn("sidebar-nav-icon sidebar-nav-icon-idle", collapsed ? "h-9 w-9" : "h-8 w-8")}>
        {icon}
      </span>
      {!collapsed && (
        <>
          <span className="min-w-0 flex-1 truncate">{label}</span>
          <DownloadSimple
            size={14}
            weight="duotone"
            className="shrink-0 opacity-50 transition group-hover:opacity-100"
          />
        </>
      )}
    </a>
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
        "sidebar-nav-item",
        active ? "sidebar-nav-item-active" : "sidebar-nav-item-idle",
        collapsed && "justify-center px-2"
      )}
    >
      <span
        className={cn(
          "sidebar-nav-icon",
          active ? "sidebar-nav-icon-active" : "sidebar-nav-icon-idle",
          collapsed ? "h-9 w-9" : "h-8 w-8"
        )}
      >
        {icon}
      </span>
      {!collapsed && <span className="min-w-0 flex-1 truncate text-start">{label}</span>}
      {badge !== undefined && (
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[9px] font-bold",
            active ? "bg-white/20 text-white" : "bg-highlight text-white",
            collapsed
              ? "absolute -top-0.5 end-0.5 min-w-[1rem] px-1 text-center"
              : "ms-auto shrink-0"
          )}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
