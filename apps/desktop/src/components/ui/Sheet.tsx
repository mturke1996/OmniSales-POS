import type { ReactNode } from "react";
import { Drawer } from "vaul";
import { cn } from "../../lib/cn";

/** Mobile navigation drawer — Vaul + safe areas (RTL-aware) */
export function Sheet({
  open,
  onOpenChange,
  children,
  title = "القائمة",
  side = "start",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  title?: string;
  side?: "start" | "end";
}) {
  const isStart = side === "start";

  return (
    <div className="lg:hidden">
      <Drawer.Root open={open} onOpenChange={onOpenChange} direction={isStart ? "right" : "left"}>
        <Drawer.Portal>
          <Drawer.Overlay className="mobile-drawer-overlay fixed inset-0 z-[60]" />
          <Drawer.Content
            aria-label={title}
            className={cn(
              "mobile-drawer-panel fixed inset-y-0 z-[61] flex w-[min(21.5rem,94vw)] flex-col outline-none",
              "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
              isStart ? "end-0" : "start-0"
            )}
          >
            <Drawer.Title className="sr-only">{title}</Drawer.Title>
            <div className="flex shrink-0 justify-center py-2.5">
              <div className="h-1 w-10 rounded-full bg-white/20" aria-hidden />
            </div>
            {children}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
