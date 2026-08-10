import { Drawer } from "vaul";
import type { ReactNode } from "react";
import { X } from "@phosphor-icons/react";
import { cn } from "../../lib/cn";

/** Mobile bottom sheet — Vaul drawer with safe areas (RTL) */
export function BottomSheet({
  open,
  onOpenChange,
  title,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[60] bg-ink/45 backdrop-blur-[2px]" />
        <Drawer.Content
          className={cn(
            "fixed inset-x-0 bottom-0 z-[61] flex max-h-[min(92dvh,var(--app-height))] flex-col rounded-t-2xl bg-paper-raised outline-none",
            "pb-[env(safe-area-inset-bottom)]",
            className
          )}
        >
          <Drawer.Title className="sr-only">{title}</Drawer.Title>
          <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-paper-line" />
          <div className="flex shrink-0 items-center justify-between border-b border-paper-line/70 px-4 py-3">
            <h2 className="text-sm font-bold text-ink">{title}</h2>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="grid h-9 w-9 place-items-center rounded-xl text-ink-mute hover:bg-paper"
              aria-label="إغلاق"
            >
              <X size={18} />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
