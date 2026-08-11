import type { ReactNode } from "react";
import { CaretLeft } from "@phosphor-icons/react";
import { cn } from "../../lib/cn";

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  onBack,
  className,
}: {
  title: string;
  description?: string;
  breadcrumbs?: { label: string; onClick?: () => void }[];
  actions?: ReactNode;
  onBack?: () => void;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "mobile-page-header",
        "max-lg:relative max-lg:top-auto max-lg:z-10",
        "lg:sticky lg:top-0 lg:z-20",
        className
      )}
    >
      <div className="mx-auto max-w-[1600px] px-4 py-2.5 sm:px-6 sm:py-4">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav
            aria-label="مسار التنقل"
            className="mb-1 hidden flex-wrap items-center gap-1 text-[11px] font-medium text-ink-mute sm:flex"
          >
            {breadcrumbs.map((crumb, i) => (
              <span key={`${crumb.label}-${i}`} className="inline-flex items-center gap-1">
                {i > 0 && <span className="text-paper-line">/</span>}
                {crumb.onClick ? (
                  <button
                    type="button"
                    onClick={crumb.onClick}
                    className="transition hover:text-highlight"
                  >
                    {crumb.label}
                  </button>
                ) : (
                  <span className="text-ink-soft">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}

        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <div className="flex min-w-0 items-start gap-2">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-paper-line/70 bg-paper text-ink shadow-sm transition hover:border-highlight/30 hover:bg-highlight/8 active:scale-[0.97]"
                aria-label="رجوع"
              >
                <CaretLeft size={18} weight="bold" className="rtl:rotate-180" />
              </button>
            )}
            <div className="min-w-0">
              <h1 className="truncate text-lg font-extrabold tracking-tight text-ink sm:text-2xl">
                {title}
              </h1>
              {description && (
                <p className="mt-0.5 line-clamp-2 text-xs text-ink-mute sm:text-sm">
                  {description}
                </p>
              )}
            </div>
          </div>
          {actions && (
            <div className="mobile-page-actions flex shrink-0 flex-wrap items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
