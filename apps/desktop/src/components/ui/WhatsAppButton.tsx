import { WhatsappLogo } from "@phosphor-icons/react";
import { openWhatsApp } from "../../lib/whatsapp";
import { cn } from "../../lib/cn";

interface WhatsAppButtonProps {
  phone?: string | null;
  message?: string;
  label?: string;
  className?: string;
  size?: "sm" | "md";
  variant?: "solid" | "ghost";
  disabled?: boolean;
  title?: string;
}

export function WhatsAppButton({
  phone,
  message,
  label = "واتساب",
  className,
  size = "sm",
  variant = "solid",
  disabled,
  title,
}: WhatsAppButtonProps) {
  const canSend = Boolean(phone && !disabled);

  const handleClick = () => {
    if (!phone) {
      alert("لا يوجد رقم هاتف صالح لإرسال واتساب");
      return;
    }
    const ok = openWhatsApp(phone, message);
    if (!ok) {
      alert("رقم الهاتف غير صالح لواتساب. استخدم صيغة مثل 091xxxxxxx");
    }
  };

  return (
    <button
      type="button"
      disabled={!canSend}
      onClick={handleClick}
      title={title || (canSend ? "فتح واتساب" : "رقم الهاتف غير متوفر")}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 font-bold transition disabled:cursor-not-allowed disabled:opacity-40",
        size === "sm" && "rounded-full px-3 py-1.5 text-xs",
        size === "md" && "rounded-xl px-4 py-2.5 text-sm",
        variant === "solid" &&
          "bg-[#25D366] text-white shadow-xs hover:bg-[#1ebe57]",
        variant === "ghost" &&
          "border border-[#25D366]/40 bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366]/18",
        className
      )}
    >
      <WhatsappLogo size={size === "md" ? 18 : 16} weight="fill" />
      {label}
    </button>
  );
}
