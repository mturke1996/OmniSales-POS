import { Printer } from "@phosphor-icons/react";
import { BottomSheet } from "../ui/BottomSheet";

export function PosPrinterSheet({
  open,
  onClose,
  connected,
  printerLabel,
  onPrintBrowser,
  printing,
}: {
  open: boolean;
  onClose: () => void;
  connected: boolean;
  printerLabel?: string;
  onPrintBrowser?: () => void;
  printing?: boolean;
}) {
  return (
    <BottomSheet open={open} onOpenChange={(v) => !v && onClose()} title="الطباعة">
      <div className="space-y-4 p-4">
        <div className="flex items-center gap-3 rounded-2xl border border-paper-line bg-paper p-4">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-highlight/12 text-highlight">
            <Printer size={24} weight="duotone" />
          </div>
          <div>
            <p className="text-sm font-bold text-ink">
              {connected ? "طابعة حرارية متصلة" : "لا توجد طابعة حرارية"}
            </p>
            <p className="text-xs text-ink-mute">
              {connected
                ? printerLabel || "جاهزة للطباعة ESC/POS"
                : "يمكنك الطباعة عبر المتصفح أو ربط USB من الكمبيوتر"}
            </p>
          </div>
        </div>

        {!connected && (
          <ul className="space-y-2 text-xs text-ink-mute">
            <li>• iPhone/Android: استخدم «طباعة المتصفح» بعد كل بيع</li>
            <li>• Windows/Mac: اربط طابعة USB من الإعدادات</li>
            <li>• Bluetooth ESC/POS: قريباً — استخدم المتصفح مؤقتاً</li>
          </ul>
        )}

        {onPrintBrowser && (
          <button
            type="button"
            disabled={printing}
            onClick={onPrintBrowser}
            className="btn-primary min-h-12 w-full text-sm font-bold"
          >
            {printing ? "جاري الطباعة…" : "طباعة عبر المتصفح"}
          </button>
        )}

        <button type="button" onClick={onClose} className="btn-ghost w-full text-xs font-bold">
          إغلاق
        </button>
      </div>
    </BottomSheet>
  );
}
