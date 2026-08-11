import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

/** Consistent page body wrapper (below PageHeader) */
export function PageContent({
  children,
  className,
  size = "default",
}: {
  children: ReactNode;
  className?: string;
  size?: "default" | "wide" | "narrow";
}) {
  const max =
    size === "wide"
      ? "max-w-[1600px]"
      : size === "narrow"
        ? "max-w-5xl"
        : "max-w-6xl";

  return (
    <div
      className={cn(
        "mobile-page-body mx-auto space-y-4 px-4 py-4 sm:space-y-5 sm:px-6 sm:py-6 lg:pb-6",
        max,
        className
      )}
    >
      {children}
    </div>
  );
}
