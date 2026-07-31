import { useState } from "react";
import { FilePdf, Printer, X } from "@phosphor-icons/react";
import type { BranchSettings, Order } from "../../lib/types";
import { downloadInvoicePdf, printThermalReceipt } from "../../lib/invoice";
import { saleShareMessage } from "../../lib/whatsapp";
import { WhatsAppButton } from "../ui/WhatsAppButton";

interface ReceiptModalProps {
  order: Order;
  settings: BranchSettings;
  changeDue?: number;
  onClose: () => void;
}

export function ReceiptModal({
  order,
  settings,
  changeDue = 0,
  onClose,
}: ReceiptModalProps) {
  const [busy, setBusy] = useState<"pdf" | "thermal" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (kind: "pdf" | "thermal") => {
    setBusy(kind);
    setError(null);
    try {
      if (kind === "pdf") await downloadInvoicePdf(order, settings);
      else await printThermalReceipt(order, settings, changeDue);
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشلت الطباعة");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl border border-paper-line bg-paper-raised p-5 shadow-lift">
        <div className="flex items-center justify-between border-b border-paper-line pb-3">
          <div>
            <h3 className="font-bold text-ink">فاتورة البيع</h3>
            <p className="text-[11px] text-ink-mute">{order.order_number}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-ink-mute hover:bg-paper"
          >
            <X size={18} />
          </button>
        </div>

        <div className="print-receipt my-4 overflow-y-auto rounded-xl border border-dashed border-paper-line bg-white p-4 font-mono text-xs text-black">
          <div className="text-center text-base font-bold">
            {settings.name || "OmniSales POS"}
          </div>
          {settings.address && (
            <div className="text-center text-[11px]">{settings.address}</div>
          )}
          {settings.phone && (
            <div className="text-center text-[11px]">هاتف: {settings.phone}</div>
          )}

          <div className="my-2 border-y border-black py-1 text-[11px]">
            <div className="flex justify-between">
              <span>رقم الفاتورة</span>
              <span className="font-bold">{order.order_number}</span>
            </div>
            <div className="flex justify-between">
              <span>التاريخ</span>
              <span>{new Date(order.created_at).toLocaleString("ar-LY")}</span>
            </div>
            {order.customer_name && (
              <div className="flex justify-between">
                <span>العميل</span>
                <span>{order.customer_name}</span>
              </div>
            )}
          </div>

          <div className="my-2 space-y-1">
            {order.items.map((line, idx) => (
              <div key={idx} className="text-[11px]">
                <div className="flex justify-between gap-2">
                  <span className="max-w-[140px] truncate">{line.name}</span>
                  <span>
                    {line.quantity}×{line.unit_price}
                  </span>
                  <span className="font-bold">
                    {(line.quantity * line.unit_price).toFixed(2)}
                  </span>
                </div>
                {(line.imei || line.serial) && (
                  <div className="text-[10px] text-slate-500">
                    {line.imei ? `IMEI ${line.imei}` : ""}
                    {line.serial ? ` S/N ${line.serial}` : ""}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-1 border-t border-black pt-1 text-[11px]">
            <div className="flex justify-between">
              <span>الفرعي</span>
              <span>
                {order.subtotal.toFixed(2)} {settings.currency_symbol}
              </span>
            </div>
            {order.discount_amount > 0 && (
              <div className="flex justify-between">
                <span>الخصم</span>
                <span>
                  -{order.discount_amount.toFixed(2)} {settings.currency_symbol}
                </span>
              </div>
            )}
            {order.tax_amount > 0 && (
              <div className="flex justify-between">
                <span>الضريبة</span>
                <span>
                  {order.tax_amount.toFixed(2)} {settings.currency_symbol}
                </span>
              </div>
            )}
            {(order.delivery_fee || 0) > 0 && (
              <div className="flex justify-between">
                <span>التوصيل</span>
                <span>
                  {Number(order.delivery_fee).toFixed(2)}{" "}
                  {settings.currency_symbol}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t border-black pt-1 text-sm font-bold">
              <span>الإجمالي</span>
              <span>
                {order.total_amount.toFixed(2)} {settings.currency_symbol}
              </span>
            </div>
            {changeDue > 0 && (
              <div className="flex justify-between font-bold">
                <span>الباقي</span>
                <span>
                  {changeDue.toFixed(2)} {settings.currency_symbol}
                </span>
              </div>
            )}
          </div>

          <div className="mt-4 border-t border-dashed border-black pt-2 text-center text-[10px]">
            {settings.receipt_footer || "شكراً لتعاملكم معنا"}
          </div>
        </div>

        {error && (
          <p className="mb-2 rounded-lg bg-danger/10 px-3 py-2 text-xs font-medium text-danger">
            {error}
          </p>
        )}

        <div className="grid grid-cols-1 gap-2 border-t border-paper-line pt-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void run("thermal")}
            className="btn-ghost inline-flex items-center justify-center gap-1.5 text-xs"
          >
            <Printer size={16} />
            {busy === "thermal" ? "جاري…" : `حرارية ${settings.thermal_width_mm}مم`}
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void run("pdf")}
            className="btn-primary inline-flex items-center justify-center gap-1.5 text-xs"
          >
            <FilePdf size={16} />
            {busy === "pdf" ? "جاري…" : "PDF A4"}
          </button>
          {order.customer_phone && (
            <div className="sm:col-span-2">
              <WhatsAppButton
                phone={order.customer_phone}
                message={saleShareMessage(
                  order.order_number,
                  order.total_amount,
                  settings.currency_symbol,
                  settings.name,
                  order.customer_name
                )}
                label="إرسال الفاتورة واتساب"
                size="md"
                className="w-full"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
