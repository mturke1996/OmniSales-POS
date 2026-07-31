import { Keyboard, X } from "@phosphor-icons/react";

export function ShortcutsModal({ onClose }: { onClose: () => void }) {
  const shortcuts = [
    { key: "F1", desc: "تركيز البحث في شاشة نقطة البيع" },
    { key: "F2", desc: "فتح نافذة اختيار وتعيين العميل" },
    { key: "F4", desc: "تعليق السلة الحالية (Hold Cart)" },
    { key: "F6", desc: "فتح قائمة الفواتير المعلقة لاسترجاعها" },
    { key: "F9", desc: "إتمام عملية الدفع والتأكيد السريع" },
    { key: "?", desc: "عرض دليل اختصارات لوحة المفاتيح" },
    { key: "Escape", desc: "إغلاق أي نافذة مبثوقة متفاعلة" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-paper-line bg-paper-raised p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-paper-line pb-3">
          <div className="flex items-center gap-2">
            <Keyboard size={20} className="text-amber-600" />
            <h3 className="font-bold text-ink">اختصارات لوحة المفاتيح</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1 text-ink-mute hover:bg-paper">
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {shortcuts.map((sc, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-xl border border-paper-line bg-paper px-3 py-2 text-xs"
            >
              <span className="font-mono font-bold text-ink bg-paper-raised px-2 py-1 rounded border border-paper-line shadow-xs">
                {sc.key}
              </span>
              <span className="text-ink-mute font-medium">{sc.desc}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <button type="button" onClick={onClose} className="btn-primary text-xs">
            فهمت ذلك
          </button>
        </div>
      </div>
    </div>
  );
}
