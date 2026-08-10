import { MagnifyingGlass } from "@phosphor-icons/react";
import { cn } from "../../lib/cn";

export function SearchField({
  value,
  onChange,
  placeholder = "بحث…",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative w-full max-w-md", className)}>
      <MagnifyingGlass
        size={16}
        className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-mute"
      />
      <input
        className="input w-full ps-9"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
