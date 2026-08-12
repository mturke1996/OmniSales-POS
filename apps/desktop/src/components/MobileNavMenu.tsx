import { useEffect, useState } from "react";
import {
  Storefront,
  X,
  Lock,
  MagnifyingGlass,
  DeviceMobile,
  DownloadSimple,
  CloudArrowUp,
  Broadcast,
  Lightning,
} from "@phosphor-icons/react";
import type { BranchSettings, Shift } from "../lib/types";
import type { CashierSession } from "../lib/session";
import type { SidebarTab } from "./Sidebar";
import { cn } from "../lib/cn";
import {
  APK_FILENAME,
  mainMenuApkDownloadUrl,
  shouldOfferApkDownload,
} from "../lib/app-download";
import { detectRuntime } from "../lib/native";
import { useLiveState } from "../hooks/use-live-sync";
import { liveStatusLabel } from "../lib/live-sync-core";
import { NAV_ITEMS } from "../lib/nav-config";
import { tapHaptic } from "../lib/nav-pins";
import { formatShiftElapsed, nextNavNudge } from "../lib/nav-nudge";
import type { ShopAlert } from "../lib/shop-health";

export function MobileNavMenu({
  currentTab,
  onTabChange,
  openShift,
  settings,
  heldCartsCount,
  session,
  pendingSync = 0,
  deliveryOpen = 0,
  lowStockCount = 0,
  onClose,
  onLock,
  onOpenCommand,
  alerts = [],
  onOpenAlert,
}: {
  currentTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  openShift: Shift | null;
  settings: BranchSettings;
  heldCartsCount: number;
  session?: CashierSession | null;
  pendingSync?: number;
  deliveryOpen?: number;
  lowStockCount?: number;
  onClose: () => void;
  onLock?: () => void;
  onOpenCommand?: () => void;
  alerts?: ShopAlert[];
  onOpenAlert?: (alert: ShopAlert) => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const live = useLiveState();
  const showApk = shouldOfferApkDownload(detectRuntime());

  useEffect(() => {
    if (openShift?.status !== "open") return;
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, [openShift?.id, openShift?.status]);

  const go = (tab: SidebarTab) => {
    tapHaptic(8);
    onTabChange(tab);
    onClose();
  };

  const badge = (id: SidebarTab): string | number | undefined => {
    if (id === "dashboard") {
      const n = alerts.filter((a) => a.severity === "critical").length;
      return n > 0 ? n : undefined;
    }
    if (id === "pos" && heldCartsCount > 0) return heldCartsCount;
    if (id === "shifts" && openShift?.status === "open") return "●";
    if (id === "orders" && deliveryOpen > 0) return deliveryOpen;
    if (id === "inventory" && lowStockCount > 0) return lowStockCount;
    if (id === "settings" && pendingSync > 0) return pendingSync;
    return undefined;
  };

  const nudge = nextNavNudge(
    {
      heldCarts: heldCartsCount,
      deliveryOpen,
      lowStock: lowStockCount,
      pendingSync,
      shiftOpen: openShift?.status === "open",
    },
    currentTab,
    alerts
  );
  const elapsed =
    openShift?.status === "open" ? formatShiftElapsed(openShift.opened_at, now) : "";

  const tiles = NAV_ITEMS.filter((item) => item.id !== "pos");

  return (
    <div className="flex h-full min-h-0 flex-col text-sidebar-text">
      <header className="flex shrink-0 items-center gap-3 px-4 pb-3 pt-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-extrabold tracking-tight">
            {settings.name || "OmniSales"}
          </p>
          <p className="truncate text-[11px] text-sidebar-mute">
            {openShift
              ? elapsed
                ? `وردية · ${elapsed}`
                : "وردية مفتوحة"
              : "بدون وردية"}{" "}
            · {settings.currency_symbol}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-sidebar-text"
          aria-label="إغلاق القائمة"
        >
          <X size={20} weight="bold" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-3">
        <button
          type="button"
          onClick={() => go("pos")}
          className="flex w-full items-center justify-center gap-2 rounded-3xl bg-highlight px-4 py-4 text-base font-extrabold text-white shadow-soft transition active:scale-[0.98]"
        >
          <Storefront size={22} weight="fill" />
          نقطة البيع
          {heldCartsCount > 0 && (
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px]">
              {heldCartsCount} معلّق
            </span>
          )}
        </button>

        {nudge && (
          <button
            type="button"
            onClick={() => {
              if (nudge.alert && onOpenAlert) {
                tapHaptic(8);
                onOpenAlert(nudge.alert);
                onClose();
                return;
              }
              go(nudge.tab);
            }}
            className="sidebar-nudge mt-3 flex w-full items-center gap-2.5 rounded-2xl px-3 py-2.5 text-start"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-highlight/25 text-white">
              <Lightning size={16} weight="fill" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-bold">{nudge.title}</span>
              <span className="block truncate text-[11px] text-sidebar-mute">
                {nudge.hint}
              </span>
            </span>
          </button>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2">
          {tiles.map((item) => {
            const active = currentTab === item.id;
            const mark = badge(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => go(item.id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-[4.5rem] flex-col items-start justify-center gap-1.5 rounded-2xl px-3 py-3 text-start transition active:scale-[0.98]",
                  active
                    ? "bg-highlight text-white shadow-soft"
                    : "border border-white/10 bg-white/[0.06] text-sidebar-text"
                )}
              >
                <span
                  className={cn(
                    "grid h-9 w-9 place-items-center rounded-xl",
                    active ? "bg-white/20" : "bg-white/10"
                  )}
                >
                  {item.icon}
                </span>
                <span className="text-[13px] font-bold leading-tight">{item.label}</span>
                {mark !== undefined && (
                  <span
                    className={cn(
                      "absolute end-2 top-2 min-w-[1.15rem] rounded-full px-1.5 text-center text-[10px] font-bold leading-[1.15rem]",
                      active ? "bg-white/25 text-white" : "bg-highlight text-white"
                    )}
                  >
                    {mark}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <footer className="shrink-0 space-y-2 border-t border-white/10 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenCommand?.();
            }}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] text-sm font-bold"
          >
            <MagnifyingGlass size={16} weight="bold" />
            بحث
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onLock?.();
            }}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] text-sm font-bold"
          >
            <Lock size={16} weight="duotone" />
            قفل
          </button>
        </div>

        <div className="flex items-center gap-2.5 rounded-2xl bg-white/[0.05] px-3 py-2.5">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-sm font-bold">
            {(session?.cashier_name || "?").slice(0, 1)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold">
              {session?.cashier_name || "كاشير"}
            </p>
            <p className="flex items-center gap-1 truncate text-[10px] text-sidebar-mute">
              {live.status === "live" ? (
                <Broadcast size={12} weight="fill" className="text-success" />
              ) : (
                <CloudArrowUp size={12} weight="duotone" />
              )}
              {settings.cloud_sync_enabled
                ? liveStatusLabel(live.status)
                : "وضع محلي"}
              {pendingSync > 0 ? ` · ${pendingSync} معلّق` : ""}
            </p>
          </div>
        </div>

        {showApk && (
          <a
            href={mainMenuApkDownloadUrl()}
            download={APK_FILENAME}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 text-xs font-bold text-sidebar-mute"
          >
            <DeviceMobile size={16} weight="duotone" />
            تطبيق Android
            <DownloadSimple size={14} />
          </a>
        )}
      </footer>
    </div>
  );
}
