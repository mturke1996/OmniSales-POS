import { ArrowClockwise, Trash, Clock } from "@phosphor-icons/react";
import type { HeldCart } from "../../lib/types";
import { BottomSheet } from "../ui/BottomSheet";

interface HoldCartsModalProps {
  carts: HeldCart[];
  onClose: () => void;
  onRecall: (cart: HeldCart) => void;
  onDelete: (id: string) => void;
  mobile?: boolean;
}

export function HoldCartsModal({
  carts,
  onClose,
  onRecall,
  onDelete,
  mobile = false,
}: HoldCartsModalProps) {
  const body = (
    <div className="space-y-3 p-4">
      {!carts.length ? (
        <div className="py-12 text-center text-sm text-ink-mute">لا توجد فواتير معلقة حالياً</div>
      ) : (
        carts.map((cart) => {
          const totalPrice = cart.items.reduce((s, i) => s + i.unit_price * i.quantity, 0);

          return (
            <div
              key={cart.id}
              className="flex flex-col gap-3 rounded-2xl border border-paper-line p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-ink">{cart.customer_name || "فاتورة معلقة"}</span>
                  <span className="ms-2 text-xs text-ink-mute">
                    {new Date(cart.created_at).toLocaleTimeString("ar-LY", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="text-sm font-bold text-ink">{totalPrice.toFixed(2)} د.ل</div>
              </div>

              {cart.note && (
                <p className="rounded-lg bg-paper p-2 text-xs text-ink-mute">{cart.note}</p>
              )}

              <div className="text-xs text-ink-mute">
                {cart.items.map((i) => `${i.name} (${i.quantity})`).join(" ، ")}
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-paper-line pt-2">
                <button
                  type="button"
                  onClick={() => onDelete(cart.id)}
                  className="inline-flex items-center gap-1 rounded-full border border-danger/25 px-3 py-1.5 text-xs font-semibold text-danger"
                >
                  <Trash size={14} />
                  حذف
                </button>
                <button
                  type="button"
                  onClick={() => onRecall(cart)}
                  className="inline-flex items-center gap-1 rounded-full bg-ink px-4 py-1.5 text-xs font-semibold text-paper"
                >
                  <ArrowClockwise size={14} />
                  استرجاع
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  if (mobile) {
    return (
      <BottomSheet
        open
        onOpenChange={(v) => !v && onClose()}
        title={`الفواتير المعلقة (${carts.length})`}
      >
        {body}
      </BottomSheet>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-xl rounded-2xl border border-paper-line bg-paper-raised p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-paper-line pb-4">
          <Clock size={20} className="text-highlight" />
          <h2 className="text-lg font-bold text-ink">الفواتير المعلقة ({carts.length})</h2>
        </div>
        {body}
      </div>
    </div>
  );
}
