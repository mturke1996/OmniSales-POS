import { Backspace } from "@phosphor-icons/react";
import { cn } from "../../lib/cn";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"] as const;

export function PosNumpad({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  className?: string;
}) {
  function press(key: (typeof KEYS)[number]) {
    if (key === "⌫") {
      onChange(value.slice(0, -1));
      return;
    }
    if (key === ".") {
      if (value.includes(".")) return;
      onChange(value ? `${value}.` : "0.");
      return;
    }
    if (value === "0") {
      onChange(key);
      return;
    }
    onChange(`${value}${key}`);
  }

  return (
    <div className={cn("grid grid-cols-3 gap-2", className)}>
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => press(key)}
          className={cn(
            "grid h-12 place-items-center rounded-xl text-base font-bold transition active:scale-[0.97]",
            key === "⌫"
              ? "border border-paper-line bg-paper text-ink-mute"
              : "border border-paper-line/80 bg-paper-raised text-ink shadow-soft"
          )}
          aria-label={key === "⌫" ? "مسح" : key}
        >
          {key === "⌫" ? <Backspace size={20} weight="bold" /> : key}
        </button>
      ))}
    </div>
  );
}
