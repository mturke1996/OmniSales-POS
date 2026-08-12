import type { ReactNode } from "react";
import { useEffect } from "react";
import { Drawer } from "vaul";
import { cn } from "../lib/cn";
import { pushOverlayCloser } from "../lib/overlay-back";

/** Full-width phone menu — swipe to dismiss, hardware back closes it. */
export function MobileNavDrawer({
  open,
  onClose,
  children,
  title = "القائمة الرئيسية",
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}) {
  useEffect(() => {
    if (!open) return;
    return pushOverlayCloser(() => {
      onClose();
      return true;
    });
  }, [open, onClose]);

  return (
    <div className="lg:hidden">
      <Drawer.Root open={open} onOpenChange={(v) => !v && onClose()} direction="right">
        <Drawer.Portal>
          <Drawer.Overlay className="mobile-drawer-overlay fixed inset-0 z-[60]" />
          <Drawer.Content
            aria-label={title}
            className={cn(
              "mobile-drawer-panel fixed inset-y-0 end-0 z-[61] flex w-full flex-col overflow-hidden outline-none",
              "max-w-[28rem] pt-[env(safe-area-inset-top)]",
              "sm:rounded-s-3xl"
            )}
          >
            <Drawer.Title className="sr-only">{title}</Drawer.Title>
            {children}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
