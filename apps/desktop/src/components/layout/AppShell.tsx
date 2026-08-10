import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

/** Full-viewport ERP shell — Odoo-style sidebar + top bar + scrollable content */
export function AppShell({
  sidebar,
  topBar,
  bottomNav,
  children,
  className,
  contentClassName,
  /** POS and other immersive screens skip outer scroll */
  immersive = false,
}: {
  sidebar?: ReactNode;
  topBar?: ReactNode;
  bottomNav?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  immersive?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex h-app max-h-app min-h-0 flex-col overflow-hidden bg-paper text-ink",
        className
      )}
    >
      {topBar}
      <div className="flex min-h-0 flex-1">
        {sidebar}
        <main
          className={cn(
            "relative min-h-0 min-w-0 flex-1",
            immersive
              ? "flex flex-col overflow-hidden"
              : "overflow-y-auto overscroll-contain",
            "pb-[var(--mobile-nav-offset,0px)] lg:pb-0",
            contentClassName
          )}
        >
          {children}
        </main>
      </div>
      {bottomNav}
    </div>
  );
}
