import {
  House,
  Storefront,
  Truck,
  FileText,
  SquaresFour,
} from "@phosphor-icons/react";
import type { SidebarTab } from "./Sidebar";
import { cn } from "../lib/cn";
import { tapHaptic } from "../lib/nav-pins";

export function MobileBottomNav({
  currentTab,
  onNavigate,
  onOpenMenu,
  deliveryOpen = 0,
  heldCartsCount = 0,
}: {
  currentTab: SidebarTab;
  onNavigate: (tab: SidebarTab) => void;
  onOpenMenu: () => void;
  deliveryOpen?: number;
  heldCartsCount?: number;
}) {
  const moreActive = !["dashboard", "pos", "orders", "invoices"].includes(currentTab);

  const go = (tab: SidebarTab) => {
    tapHaptic(8);
    onNavigate(tab);
  };

  return (
    <nav
      className="mobile-bottom-nav z-40 shrink-0 overflow-visible safe-bottom lg:hidden"
      style={{ height: "var(--mobile-nav-offset)" }}
      aria-label="التنقل السريع"
    >
      <div className="relative mx-auto flex h-[var(--mobile-nav-inner)] w-full max-w-lg items-end justify-around gap-0.5 px-1.5 pb-1.5 pt-1">
        <TabBtn
          label="الرئيسية"
          active={currentTab === "dashboard"}
          onClick={() => go("dashboard")}
          icon={<House size={22} weight={currentTab === "dashboard" ? "fill" : "duotone"} />}
        />
        <TabBtn
          label="توصيل"
          active={currentTab === "orders"}
          onClick={() => go("orders")}
          icon={<Truck size={22} weight={currentTab === "orders" ? "fill" : "duotone"} />}
          badge={deliveryOpen > 0 ? deliveryOpen : undefined}
        />
        <button
          type="button"
          onClick={() => go("pos")}
          className="relative flex w-[4.5rem] shrink-0 flex-col items-center justify-end"
          aria-label="نقطة البيع"
          aria-current={currentTab === "pos" ? "page" : undefined}
        >
          <span
            className={cn(
              "mobile-pos-fab grid h-14 w-14 -translate-y-3.5 place-items-center rounded-full text-white transition active:scale-95",
              currentTab === "pos" && "mobile-pos-fab-active"
            )}
          >
            <Storefront size={24} weight="fill" />
            {heldCartsCount > 0 && (
              <span className="absolute -end-0.5 -top-0.5 min-w-[1.15rem] rounded-full bg-danger px-1 text-center text-[9px] font-bold leading-[1.15rem] text-white shadow-sm">
                {heldCartsCount > 9 ? "9+" : heldCartsCount}
              </span>
            )}
          </span>
          <span
            className={cn(
              "-mt-2.5 text-[10px] font-bold",
              currentTab === "pos" ? "text-highlight" : "text-ink-mute"
            )}
          >
            بيع
          </span>
        </button>
        <TabBtn
          label="فواتير"
          active={currentTab === "invoices"}
          onClick={() => go("invoices")}
          icon={<FileText size={22} weight={currentTab === "invoices" ? "fill" : "duotone"} />}
        />
        <TabBtn
          label="المزيد"
          active={moreActive}
          onClick={() => {
            tapHaptic(8);
            onOpenMenu();
          }}
          icon={<SquaresFour size={22} weight={moreActive ? "fill" : "duotone"} />}
        />
      </div>
    </nav>
  );
}

function TabBtn({
  label,
  active,
  onClick,
  icon,
  badge,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "mobile-tab-btn relative flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1 text-[10px] font-bold transition duration-200 ease-spring active:scale-[0.96]",
        active ? "mobile-tab-btn-active text-highlight" : "text-ink-mute"
      )}
    >
      {active && (
        <span className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-highlight" aria-hidden />
      )}
      <span className="relative">
        {icon}
        {badge != null && (
          <span className="absolute -end-2.5 -top-1 min-w-[1.05rem] rounded-full bg-danger px-1 text-center text-[8px] font-bold leading-4 text-white">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </span>
      <span className="truncate leading-none">{label}</span>
    </button>
  );
}
