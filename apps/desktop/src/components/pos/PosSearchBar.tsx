import type { RefObject } from "react";
import { Camera, MagnifyingGlass } from "@phosphor-icons/react";
import { cn } from "../../lib/cn";

export function PosSearchBar({
  value,
  onChange,
  onEnter,
  onScan,
  inputRef,
  compact = false,
  showShortcut = false,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  onEnter: () => void;
  onScan?: () => void;
  inputRef?: RefObject<HTMLInputElement | null>;
  compact?: boolean;
  showShortcut?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("pos-search-bar flex min-w-0 items-stretch gap-2", className)}>
      <div className="relative min-w-0 flex-1">
        <MagnifyingGlass
          className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-ink-mute"
          size={compact ? 17 : 20}
        />
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onEnter();
            }
          }}
          placeholder={compact ? "بحث أو باركود…" : "ابحث بالاسم أو الباركود أو SKU…"}
          className={cn(
            "input-field w-full font-medium",
            compact ? "h-11 pe-10 ps-3 text-sm" : "pe-11 ps-14 text-sm",
            showShortcut && !compact && "ps-14"
          )}
          inputMode="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        {showShortcut && !compact && (
          <span className="pos-key-badge absolute start-3.5 top-1/2 -translate-y-1/2">F1</span>
        )}
      </div>
      {onScan && (
        <button
          type="button"
          onClick={onScan}
          className={cn(
            "pos-search-scan inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-paper-line/70 bg-paper-raised font-semibold text-ink shadow-soft transition duration-200 ease-spring hover:border-highlight/35 hover:bg-highlight/5 active:scale-[0.97]",
            compact ? "h-11 w-11 px-0" : "h-12 px-3.5 text-sm"
          )}
          title="مسح بالكاميرا"
          aria-label="مسح باركود"
        >
          <Camera size={compact ? 18 : 20} className="text-highlight" weight="duotone" />
          {!compact && <span className="hidden sm:inline">كاميرا</span>}
        </button>
      )}
    </div>
  );
}
