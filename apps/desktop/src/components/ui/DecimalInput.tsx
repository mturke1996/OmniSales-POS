import { cn } from "../../lib/cn";
import { sanitizeDecimalInput } from "../../lib/decimal";

/** Text field that keeps a trailing `.` — `type=number` swallows decimals on Android RTL. */
export function DecimalInput({
  value,
  onChange,
  className,
  required,
  placeholder = "0",
  id,
  name,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  required?: boolean;
  placeholder?: string;
  id?: string;
  name?: string;
  autoFocus?: boolean;
}) {
  return (
    <input
      id={id}
      name={name}
      type="text"
      inputMode="decimal"
      dir="ltr"
      lang="en"
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      required={required}
      autoFocus={autoFocus}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(sanitizeDecimalInput(e.target.value))}
      className={cn(
        "mt-1 w-full rounded-xl border border-paper-line bg-paper px-3 py-2 text-start font-mono text-xs",
        className
      )}
    />
  );
}
