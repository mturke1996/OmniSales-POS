import { useEffect, type ReactNode } from "react";
import { cn } from "../lib/cn";

/**
 * Valentino-style mobile nav sheet — overlay + side drawer (< lg).
 * In RTL, `start` is the physical right edge (natural for Arabic chrome).
 */
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
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-[60] lg:hidden",
        open ? "pointer-events-auto" : "pointer-events-none"
      )}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label="إغلاق القائمة"
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-ink/50 backdrop-blur-[2px] transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0"
        )}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "absolute inset-y-0 start-0 flex w-[min(20rem,90vw)] max-w-full flex-col overflow-hidden shadow-lift transition-transform duration-300 ease-spring",
          "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
          open ? "translate-x-0" : "ltr:-translate-x-full rtl:translate-x-full"
        )}
      >
        {children}
      </div>
    </div>
  );
}
