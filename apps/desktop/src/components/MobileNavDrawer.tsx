import type { ReactNode } from "react";
import { Sheet } from "./ui/Sheet";

/** Mobile nav drawer — Vaul sheet with safe areas (RTL) */
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
  return (
    <div className="lg:hidden">
      <Sheet open={open} onOpenChange={(v) => !v && onClose()} title={title}>
        {children}
      </Sheet>
    </div>
  );
}
