import {
  House,
  Storefront,
  Truck,
  FileText,
  SquaresFour,
} from "@phosphor-icons/react";
import type { SidebarTab } from "./Sidebar";
import { cn } from "../lib/cn";

const PRIMARY: {
  id: SidebarTab;
  label: string;
  Icon: typeof House;
}[] = [
  { id: "dashboard", label: "الرئيسية", Icon: House },
  { id: "pos", label: "بيع", Icon: Storefront },
  { id: "orders", label: "توصيل", Icon: Truck },
  { id: "invoices", label: "فواتير", Icon: FileText },
];

const PRIMARY_IDS = new Set<SidebarTab>(PRIMARY.map((t) => t.id));

export function MobileBottomNav({
  currentTab,
  onNavigate,
  onOpenMenu,
}: {
  currentTab: SidebarTab;
  onNavigate: (tab: SidebarTab) => void;
  onOpenMenu: () => void;
}) {
  const moreActive = !PRIMARY_IDS.has(currentTab);

  return (
    <nav
      className="mobile-bottom-nav z-40 shrink-0 safe-bottom lg:hidden"
      style={{ height: "var(--mobile-nav-offset)" }}
      aria-label="التنقل السريع"
    >
      <div className="mx-auto flex h-[var(--mobile-nav-inner)] w-full max-w-lg items-stretch justify-around gap-1 px-2 pt-1.5">
        {PRIMARY.map(({ id, label, Icon }) => {
          const active = currentTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(id)}
              className={cn(
                "mobile-tab-btn relative flex min-h-[2.85rem] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1 text-[10px] font-bold transition duration-200 ease-spring active:scale-[0.96]",
                active ? "mobile-tab-btn-active text-highlight" : "text-ink-mute"
              )}
            >
              {active && (
                <span className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-highlight" aria-hidden />
              )}
              <Icon size={22} weight={active ? "fill" : "duotone"} />
              <span className="truncate leading-none">{label}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={onOpenMenu}
          className={cn(
            "mobile-tab-btn relative flex min-h-[2.85rem] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1 text-[10px] font-bold transition duration-200 ease-spring active:scale-[0.96]",
            moreActive ? "mobile-tab-btn-active text-highlight" : "text-ink-mute"
          )}
          aria-label="المزيد من الأقسام"
        >
          {moreActive && (
            <span className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-highlight" aria-hidden />
          )}
          <SquaresFour size={22} weight={moreActive ? "fill" : "duotone"} />
          <span className="leading-none">المزيد</span>
        </button>
      </div>
    </nav>
  );
}
