import { X, ArrowClockwise, Trash, Clock } from "@phosphor-icons/react";
import type { HeldCart } from "../../lib/types";

interface HoldCartsModalProps {
  carts: HeldCart[];
  onClose: () => void;
  onRecall: (cart: HeldCart) => void;
  onDelete: (id: string) => void;
}

export function HoldCartsModal({ carts, onClose, onRecall, onDelete }: HoldCartsModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl border border-paper-line bg-paper-raised p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-paper-line pb-4">
          <div className="flex items-center gap-2">
            <Clock size={20} className="text-amber-600" />
            <h2 className="text-lg font-bold text-ink">الفواتير المعلقة ({carts.length})</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-ink-mute hover:bg-paper hover:text-ink"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mt-4 max-h-[60vh] space-y-3 overflow-y-auto pr-1">
          {!carts.length ? (
            <div className="py-12 text-center text-sm text-ink-mute">
              لا توجد فواتير معلقة حالياً
            </div>
          ) : (
            carts.map((cart) => {
              const totalPrice = cart.items.reduce((s, i) => s + i.unit_price * i.quantity, 0);

              return (
                <div
                  key={cart.id}
                  className="flex flex-col gap-3 rounded-panel border border-paper-line p-4 transition hover:border-ink/30"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-ink">
                        {cart.customer_name || "فاتورة معلقة"}
                      </span>
                      <span className="mr-2 text-xs text-ink-mute">
                        {new Date(cart.created_at).toLocaleTimeString("ar-LY", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-ink">{totalPrice.toFixed(2)} د.ل</div>
                  </div>

                  {cart.note && (
                    <p className="text-xs text-ink-mute bg-paper p-2 rounded">{cart.note}</p>
                  )}

                  <div className="text-xs text-ink-mute">
                    العناصر:{" "}
                    {cart.items.map((i) => `${i.name} (${i.quantity})`).join(" ، ")}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-paper-line">
                    <button
                      type="button"
                      onClick={() => onDelete(cart.id)}
                      className="inline-flex items-center gap-1 rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      <Trash size={14} />
                      حذف
                    </button>
                    <button
                      type="button"
                      onClick={() => onRecall(cart)}
                      className="inline-flex items-center gap-1 rounded-full bg-ink px-4 py-1 text-xs font-semibold text-paper hover:bg-ink-soft"
                    >
                      <ArrowClockwise size={14} />
                      استرجاع السلة
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
