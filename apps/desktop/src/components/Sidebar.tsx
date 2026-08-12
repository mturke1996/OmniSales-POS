import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Storefront,
  SidebarSimple,
  Sparkle,
  X,
  DeviceMobile,
  DownloadSimple,
  CloudArrowUp,
  Broadcast,
  MagnifyingGlass,
  Star,
  ClockCounterClockwise,
  CaretDown,
  Lock,
  Plus,
  Lightning,
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
import { useLiveState } from "../hooks/use-live-sync";
import { liveStatusLabel } from "../lib/live-sync-core";
import { NAV_GROUPS, NAV_ITEMS, type NavItem } from "../lib/nav-config";
import {
  isPinned,
  pushRecentTab,
  readCollapsedGroups,
  readPinnedTabs,
  readRecentTabs,
  tapHaptic,
  toggleCollapsedGroup,
  togglePinnedTab,
} from "../lib/nav-pins";
import { formatShiftElapsed, nextNavNudge } from "../lib/nav-nudge";

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

export interface SidebarBadges {
  heldCarts: number;
  deliveryOpen: number;
  lowStock: number;
  pendingSync: number;
  shiftOpen: boolean;
}

interface SidebarProps {
  currentTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  openShift: Shift | null;
  settings: BranchSettings;
  heldCartsCount: number;
  session?: CashierSession | null;
  pendingSync?: number;
  deliveryOpen?: number;
  lowStockCount?: number;
  className?: string;
  onClose?: () => void;
  onLock?: () => void;
  onOpenCommand?: () => void;
}

function badgeFor(id: SidebarTab, b: SidebarBadges): string | number | undefined {
  if (id === "pos" && b.heldCarts > 0) return b.heldCarts;
  if (id === "shifts" && b.shiftOpen) return "●";
  if (id === "orders" && b.deliveryOpen > 0) return b.deliveryOpen;
  if (id === "inventory" && b.lowStock > 0) return b.lowStock;
  if (id === "settings" && b.pendingSync > 0) return b.pendingSync;
  return undefined;
}

export function Sidebar({
  currentTab,
  onTabChange,
  openShift,
  settings,
  heldCartsCount,
  session,
  pendingSync = 0,
  deliveryOpen = 0,
  lowStockCount = 0,
  className,
  onClose,
  onLock,
  onOpenCommand,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [filter, setFilter] = useState("");
  const [pins, setPins] = useState<SidebarTab[]>(readPinnedTabs);
  const [recent, setRecent] = useState<SidebarTab[]>(() => readRecentTabs(currentTab));
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>(readCollapsedGroups);
  const [now, setNow] = useState(() => Date.now());
  const isDrawer = Boolean(onClose);
  const slim = !isDrawer && collapsed;
  const live = useLiveState();

  const badges: SidebarBadges = {
    heldCarts: heldCartsCount,
    deliveryOpen,
    lowStock: lowStockCount,
    pendingSync,
    shiftOpen: openShift?.status === "open",
  };

  useEffect(() => {
    setRecent(pushRecentTab(currentTab));
  }, [currentTab]);

  useEffect(() => {
    if (openShift?.status !== "open") return;
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, [openShift?.id, openShift?.status]);

  const go = (tab: SidebarTab) => {
    tapHaptic(8);
    onTabChange(tab);
    onClose?.();
  };

  const pin = (id: SidebarTab) => {
    tapHaptic(12);
    setPins(togglePinnedTab(id));
  };

  const byId = useMemo(() => {
    const map = new Map<SidebarTab, NavItem>();
    for (const item of NAV_ITEMS) map.set(item.id, item);
    return map;
  }, []);

  const q = filter.trim().toLowerCase();
  const matches = (item: NavItem) =>
    !q ||
    item.label.toLowerCase().includes(q) ||
    item.keywords.toLowerCase().includes(q) ||
    item.group.toLowerCase().includes(q);

  const showApk = shouldOfferApkDownload(detectRuntime());
  const apkHit =
    showApk &&
    (!q || "android apk تطبيق تحميل".includes(q) || "android".includes(q));

  const pinnedItems = pins.map((id) => byId.get(id)).filter(Boolean) as NavItem[];
  const recentItems = recent
    .filter((id) => !pins.includes(id) && id !== currentTab)
    .map((id) => byId.get(id))
    .filter(Boolean) as NavItem[];

  const grouped = NAV_GROUPS.map((title) => ({
    title,
    items: NAV_ITEMS.filter(
      (i) => i.group === title && matches(i) && (q || !pins.includes(i.id)),
    ),
  })).filter((g) => g.items.length > 0);

  const nudge = !q && !slim ? nextNavNudge(badges, currentTab) : null;
  const elapsed =
    openShift?.status === "open" ? formatShiftElapsed(openShift.opened_at, now) : "";

  return (
    <aside
      className={cn(
        "sidebar-shell flex h-full min-h-0 flex-col transition-[width] duration-300 ease-spring",
        isDrawer && "mobile-drawer-sidebar bg-transparent shadow-none",
        !isDrawer && "sticky top-0 z-40 h-app shrink-0",
        !isDrawer && (slim ? "w-[76px]" : "w-[288px]"),
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
              {openShift
                ? elapsed
                  ? `وردية · ${elapsed}`
                  : "وردية مفتوحة"
                : "بدون وردية"}{" "}
              · {settings.currency_symbol}
            </p>
          </div>
        )}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-sidebar-mute transition hover:bg-white/10 hover:text-sidebar-text"
            aria-label="إغلاق القائمة"
          >
            <X size={18} weight="bold" />
          </button>
        )}
      </div>

      {isDrawer && (
        <div className="grid shrink-0 grid-cols-3 gap-2 px-3 pt-3">
          <QuickAction
            icon={<Storefront size={18} weight="duotone" />}
            label="بيع"
            accent
            onClick={() => go("pos")}
          />
          <QuickAction
            icon={<MagnifyingGlass size={18} weight="bold" />}
            label="بحث"
            onClick={() => {
              onClose?.();
              onOpenCommand?.();
            }}
          />
          <QuickAction
            icon={<Lock size={18} weight="duotone" />}
            label="قفل"
            onClick={() => {
              onClose?.();
              onLock?.();
            }}
          />
        </div>
      )}

      {!slim && currentTab !== "pos" && !isDrawer && (
        <div className="shrink-0 px-3 pt-3">
          <button
            type="button"
            onClick={() => go("pos")}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-highlight px-3 py-3 text-sm font-bold text-white shadow-soft transition duration-200 ease-spring hover:brightness-110 active:scale-[0.98]"
          >
            <Plus size={16} weight="bold" />
            بيع جديد
            {heldCartsCount > 0 && (
              <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">
                {heldCartsCount} معلّق
              </span>
            )}
          </button>
        </div>
      )}

      {!slim && (
        <div className="shrink-0 px-3 py-2.5">
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-2.5">
            <MagnifyingGlass size={16} className="shrink-0 text-sidebar-mute" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                const hits = NAV_ITEMS.filter(matches);
                if (hits.length === 1) {
                  go(hits[0].id);
                  return;
                }
                onOpenCommand?.();
                onClose?.();
              }}
              placeholder="ابحث عن قسم…"
              className="min-w-0 flex-1 bg-transparent text-sm text-sidebar-text outline-none placeholder:text-sidebar-mute"
              enterKeyHint="search"
            />
          </div>
        </div>
      )}

      {nudge && (
        <div className="shrink-0 px-3 pb-1">
          <button
            type="button"
            onClick={() => go(nudge.tab)}
            className="sidebar-nudge flex w-full items-center gap-2.5 rounded-2xl px-3 py-2.5 text-start transition active:scale-[0.98]"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-highlight/25 text-white">
              <Lightning size={16} weight="fill" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-bold text-sidebar-text">
                {nudge.title}
              </span>
              <span className="block truncate text-[10px] text-sidebar-mute">{nudge.hint}</span>
            </span>
          </button>
        </div>
      )}

      <nav className="flex flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-2 pb-2 scrollbar-none">
        {!slim && !q && pinnedItems.length > 0 && (
          <NavSection title="مثبّتة" icon={<Star size={11} weight="fill" />}>
            {pinnedItems.map((item) => (
              <SidebarItem
                key={`pin-${item.id}`}
                active={currentTab === item.id}
                onClick={() => go(item.id)}
                icon={item.icon}
                label={item.label}
                collapsed={slim}
                badge={badgeFor(item.id, badges)}
                pinned
                onPin={() => pin(item.id)}
                showPin={!slim}
                roomy={isDrawer}
              />
            ))}
          </NavSection>
        )}

        {!slim && !q && recentItems.length > 0 && (
          <NavSection title="الأخيرة" icon={<ClockCounterClockwise size={11} />}>
            {recentItems.map((item) => (
              <SidebarItem
                key={`recent-${item.id}`}
                active={false}
                onClick={() => go(item.id)}
                icon={item.icon}
                label={item.label}
                collapsed={slim}
                badge={badgeFor(item.id, badges)}
                onPin={() => pin(item.id)}
                showPin={!slim}
                roomy={isDrawer}
              />
            ))}
          </NavSection>
        )}

        {grouped.map((group) => {
          const folded = !q && collapsedGroups.includes(group.title);
          return (
            <div key={group.title}>
              {!slim && (
                <button
                  type="button"
                  onClick={() => setCollapsedGroups(toggleCollapsedGroup(group.title))}
                  className="mb-1 flex w-full items-center justify-between px-2 py-1 text-[10px] font-bold tracking-wide text-sidebar-mute/90"
                >
                  <span>{group.title}</span>
                  <CaretDown
                    size={12}
                    className={cn("transition", folded && "-rotate-90")}
                  />
                </button>
              )}
              {!folded && (
                <div className="flex flex-col gap-0.5">
                  {group.items.map((item) => (
                    <SidebarItem
                      key={item.id}
                      active={currentTab === item.id}
                      onClick={() => go(item.id)}
                      icon={item.icon}
                      label={item.label}
                      collapsed={slim}
                      badge={badgeFor(item.id, badges)}
                      pinned={isPinned(item.id, pins)}
                      onPin={() => pin(item.id)}
                      showPin={!slim}
                      roomy={isDrawer}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {q && grouped.length === 0 && !apkHit && (
          <p className="px-3 py-10 text-center text-xs leading-relaxed text-sidebar-mute">
            لا نتائج لـ «{filter.trim()}»
            <br />
            اضغط Enter للبحث الشامل
          </p>
        )}

        {apkHit && (
          <a
            href={mainMenuApkDownloadUrl()}
            download={APK_FILENAME}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "sidebar-nav-item sidebar-nav-item-idle group min-h-12",
              slim && "justify-center px-2"
            )}
          >
            <span className={cn("sidebar-nav-icon sidebar-nav-icon-idle", slim ? "h-9 w-9" : "h-9 w-9")}>
              <DeviceMobile size={18} weight="duotone" />
            </span>
            {!slim && (
              <>
                <span className="min-w-0 flex-1 truncate">تطبيق Android</span>
                <DownloadSimple size={14} className="shrink-0 opacity-50" />
              </>
            )}
          </a>
        )}
      </nav>

      <div className="shrink-0 space-y-2 border-t border-white/10 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {!slim && (
          <div className="sidebar-status-card">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-sidebar-text">
                {live.status === "live" ? (
                  <>
                    <span className="sidebar-live-dot" aria-hidden />
                    <Broadcast size={13} weight="fill" className="text-success" />
                  </>
                ) : (
                  <CloudArrowUp size={13} weight="duotone" />
                )}
                {settings.cloud_sync_enabled
                  ? liveStatusLabel(live.status)
                  : "وضع محلي"}
              </span>
              {pendingSync > 0 && (
                <span className="rounded-full bg-highlight px-2 py-0.5 text-[9px] font-bold text-white">
                  {pendingSync}
                </span>
              )}
            </div>
            <p className="mt-1 text-[10px] leading-relaxed text-sidebar-mute">
              {pendingSync > 0
                ? `${pendingSync} بانتظار الرفع`
                : live.peers.length
                  ? `${live.peers.length} جهاز آخر متصل`
                  : openShift
                    ? "جاهز للبيع"
                    : "افتح وردية للبيع الفوري"}
            </p>
          </div>
        )}

        {!slim && session && (
          <div className="flex items-center gap-2.5 rounded-2xl bg-white/[0.04] px-2 py-2">
            <div className="sidebar-brand-mark grid h-10 w-10 shrink-0 place-items-center text-xs font-bold">
              {session.cashier_name.slice(0, 1)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-sidebar-text">
                {session.cashier_name}
              </p>
              <p className="truncate text-[10px] text-sidebar-mute">
                {session.role === "manager" ? "مدير" : "كاشير"}
                {openShift ? " · وردية حية" : ""}
              </p>
            </div>
            {onLock && (
              <button
                type="button"
                onClick={onLock}
                className="grid h-10 w-10 place-items-center rounded-xl text-sidebar-mute hover:bg-white/10 hover:text-sidebar-text"
                aria-label="قفل الجلسة"
              >
                <Lock size={16} />
              </button>
            )}
          </div>
        )}

        {!isDrawer && (
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className={cn(
              "sidebar-nav-item sidebar-nav-item-idle min-h-11",
              slim && "justify-center px-2"
            )}
            title={slim ? "توسيع" : "طي"}
          >
            <span className="sidebar-nav-icon sidebar-nav-icon-idle h-8 w-8">
              <SidebarSimple size={16} weight="duotone" />
            </span>
            {!slim && <span className="text-xs">طي القائمة</span>}
          </button>
        )}
      </div>
    </aside>
  );
}

function NavSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1.5 px-2 text-[10px] font-bold tracking-wide text-sidebar-mute/90">
        {icon}
        {title}
      </p>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

function QuickAction({
  icon,
  label,
  onClick,
  accent,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-[3.25rem] flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-bold transition active:scale-[0.97]",
        accent
          ? "bg-highlight text-white shadow-soft"
          : "border border-white/10 bg-white/[0.05] text-sidebar-text"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function SidebarItem({
  active,
  onClick,
  icon,
  label,
  badge,
  collapsed,
  pinned,
  onPin,
  showPin,
  roomy,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  badge?: string | number;
  collapsed: boolean;
  pinned?: boolean;
  onPin?: () => void;
  showPin?: boolean;
  roomy?: boolean;
}) {
  return (
    <div
      className={cn(
        "sidebar-nav-item min-h-12",
        active ? "sidebar-nav-item-active" : "sidebar-nav-item-idle",
        collapsed && "justify-center px-2"
      )}
    >
      <button
        type="button"
        onClick={onClick}
        aria-current={active ? "page" : undefined}
        title={collapsed ? label : undefined}
        className="flex min-w-0 flex-1 items-center gap-2.5 text-start"
      >
        <span
          className={cn(
            "sidebar-nav-icon",
            active ? "sidebar-nav-icon-active" : "sidebar-nav-icon-idle",
            collapsed ? "h-9 w-9" : "h-9 w-9"
          )}
        >
          {icon}
        </span>
        {!collapsed && <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{label}</span>}
      </button>
      {badge !== undefined && (
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[9px] font-bold",
            active ? "bg-white/20 text-white" : "bg-highlight text-white",
            collapsed && "absolute -top-0.5 end-0.5 min-w-[1rem] px-1 text-center"
          )}
        >
          {badge}
        </span>
      )}
      {showPin && onPin && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPin();
          }}
          className={cn(
            "grid shrink-0 place-items-center rounded-lg transition",
            roomy ? "h-10 w-10" : "h-8 w-8",
            pinned ? "text-warning" : "text-sidebar-mute/50 hover:text-sidebar-text"
          )}
          aria-label={pinned ? "إزالة التثبيت" : "تثبيت"}
        >
          <Star size={14} weight={pinned ? "fill" : "regular"} />
        </button>
      )}
    </div>
  );
}
