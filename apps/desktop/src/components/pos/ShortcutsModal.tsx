import { Keyboard, X } from "@phosphor-icons/react";

const GLOBAL_SHORTCUTS = [
  { key: "⌘K / Ctrl+K", desc: "بحث سريع — أقسام، فواتير، توصيل، عملاء، أصناف" },
  { key: "Esc", desc: "إغلاق النوافذ المنبثقة" },
];

const POS_SHORTCUTS = [
  { key: "F1", desc: "تركيز البحث في نقطة البيع" },
  { key: "F2", desc: "اختيار العميل" },
  { key: "F4", desc: "تعليق السلة (Hold)" },
  { key: "F6", desc: "استرجاع سلة معلّقة" },
  { key: "F9", desc: "إتمام الدفع" },
  { key: "F10", desc: "إعادة طباعة آخر إيصال (حتى بعد إغلاق النافذة)" },
  { key: "?", desc: "عرض هذا الدليل (من POS)" },
];

export function ShortcutsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-paper-line bg-paper-raised p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-paper-line pb-3">
          <div className="flex items-center gap-2">
            <Keyboard size={20} className="text-highlight" />
            <h3 className="font-bold text-ink">اختصارات لوحة المفاتيح</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-ink-mute hover:bg-paper"
            aria-label="إغلاق"
          >
            <X size={18} />
          </button>
        </div>

        <section className="mt-4">
          <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-mute">
            عام — كل الشاشات
          </h4>
          <div className="space-y-2">
            {GLOBAL_SHORTCUTS.map((sc) => (
              <ShortcutRow key={sc.key} shortcut={sc.key} desc={sc.desc} />
            ))}
          </div>
        </section>

        <section className="mt-5">
          <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-mute">
            نقطة البيع (POS)
          </h4>
          <div className="space-y-2">
            {POS_SHORTCUTS.map((sc) => (
              <ShortcutRow key={sc.key} shortcut={sc.key} desc={sc.desc} />
            ))}
          </div>
        </section>

        <div className="mt-6 flex justify-end">
          <button type="button" onClick={onClose} className="btn-primary text-xs">
            فهمت ذلك
          </button>
        </div>
      </div>
    </div>
  );
}

function ShortcutRow({ shortcut, desc }: { shortcut: string; desc: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-paper-line bg-paper px-3 py-2 text-xs">
      <span className="shrink-0 rounded border border-paper-line bg-paper-raised px-2 py-1 font-mono text-[11px] font-bold text-ink shadow-xs">
        {shortcut}
      </span>
      <span className="text-end text-ink-mute">{desc}</span>
    </div>
  );
}
