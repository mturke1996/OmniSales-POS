import type { KeyboardEvent, ReactNode } from "react";
import { cn } from "../../lib/cn";

/** Phone / tablet card list — pair with `hidden lg:block` table on desktop. */
export function MobileDataList({
  children,
  empty,
  emptyLabel = "لا توجد عناصر",
  className,
}: {
  children: ReactNode;
  empty?: boolean;
  emptyLabel?: string;
  className?: string;
}) {
  if (empty) {
    return (
      <div
        className={cn(
          "mobile-empty-state rounded-2xl border border-dashed border-paper-line px-4 py-12 text-center text-sm text-ink-mute lg:hidden",
          className
        )}
      >
        {emptyLabel}
      </div>
    );
  }
  return (
    <div className={cn("mobile-card-list space-y-2.5 lg:hidden", className)}>{children}</div>
  );
}

/**
 * Always a `div` root so action buttons never nest inside a button.
 * When `onClick` is set, the header block is the interactive target.
 */
export function MobileDataCard({
  title,
  subtitle,
  meta,
  badge,
  actions,
  onClick,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!onClick) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={cn(
        "mobile-data-card w-full overflow-hidden rounded-2xl border border-paper-line/75 bg-paper-raised text-start shadow-xs",
        className
      )}
    >
      <div
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onClick={onClick}
        onKeyDown={onKeyDown}
        className={cn(
          "w-full p-3.5 outline-none transition duration-150",
          onClick &&
            "cursor-pointer hover:bg-paper/60 focus-visible:ring-2 focus-visible:ring-highlight/35 active:bg-paper active:scale-[0.995]"
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-bold leading-snug text-ink">{title}</div>
            {subtitle && (
              <div className="mt-0.5 truncate text-xs text-ink-mute">{subtitle}</div>
            )}
          </div>
          {badge}
        </div>
        {meta && (
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] leading-relaxed text-ink-soft">
            {meta}
          </div>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-paper-line/70 bg-paper/50 px-3 py-2.5">
          {actions}
        </div>
      )}
    </div>
  );
}
