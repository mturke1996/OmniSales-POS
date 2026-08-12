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
              "mobile-drawer-panel fixed inset-y-0 z-[61] flex w-[min(22rem,92vw)] flex-col overflow-hidden outline-none",
              "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
              isStart ? "end-0 rounded-s-3xl" : "start-0 rounded-e-3xl"
            )}
          >
            <Drawer.Title className="sr-only">{title}</Drawer.Title>
            <div
              className={cn(
                "absolute top-1/2 h-14 w-1.5 -translate-y-1/2 rounded-full bg-white/25",
                isStart ? "start-1.5" : "end-1.5"
              )}
              aria-hidden
            />
            {children}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
