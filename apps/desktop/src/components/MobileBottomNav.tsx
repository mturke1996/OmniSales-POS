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
      className="fixed inset-x-0 bottom-0 z-40 flex shrink-0 flex-col justify-end border-t border-paper-line/80 bg-paper-raised backdrop-blur-lg lg:hidden"
      style={{ paddingBottom: "var(--safe-bottom)" }}
      aria-label="التنقل السريع"
    >
      <div className="mx-auto flex h-[var(--mobile-nav-inner)] w-full max-w-lg items-stretch justify-around gap-0.5 px-1 pt-1">
        {PRIMARY.map(({ id, label, Icon }) => {
          const active = currentTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(id)}
              className={cn(
                "flex min-h-[2.75rem] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 text-[10px] font-bold transition active:scale-[0.97]",
                active
                  ? "bg-highlight/12 text-highlight"
                  : "text-ink-mute hover:bg-paper hover:text-ink"
              )}
            >
              <Icon size={21} weight={active ? "fill" : "duotone"} />
              <span className="truncate leading-none">{label}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={onOpenMenu}
          className={cn(
            "flex min-h-[2.75rem] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 text-[10px] font-bold transition active:scale-[0.97]",
            moreActive
              ? "bg-highlight/12 text-highlight"
              : "text-ink-mute hover:bg-paper hover:text-ink"
          )}
          aria-label="المزيد من الأقسام"
        >
          <SquaresFour size={21} weight={moreActive ? "fill" : "duotone"} />
          <span className="leading-none">المزيد</span>
        </button>
      </div>
    </nav>
  );
}
