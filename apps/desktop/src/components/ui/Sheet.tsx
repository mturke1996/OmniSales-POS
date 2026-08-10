import { Drawer } from "vaul";
import type { ReactNode } from "react";
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
    <Drawer.Root open={open} onOpenChange={onOpenChange} direction={isStart ? "right" : "left"}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[60] bg-ink/45 backdrop-blur-[2px]" />
        <Drawer.Content
          aria-label={title}
          className={cn(
            "fixed inset-y-0 z-[61] flex w-[min(20.5rem,92vw)] flex-col bg-sidebar text-sidebar-text outline-none",
            "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
            isStart ? "end-0" : "start-0"
          )}
        >
          <Drawer.Title className="sr-only">{title}</Drawer.Title>
          {children}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
