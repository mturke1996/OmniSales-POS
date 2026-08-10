import { useEffect, useState } from "react";
import { FilePdf, Printer, CheckCircle, ShareNetwork, X } from "@phosphor-icons/react";
import type { BranchSettings, Order } from "../../lib/types";
import {
  downloadInvoicePdf,
  printThermalReceiptBrowser,
} from "../../lib/invoice";
import { printThermalReceiptSmart, resolveOrderChangeDue } from "../../lib/print/thermal";
import { usePrinter } from "../../hooks/use-printer";
import { saleShareMessage } from "../../lib/whatsapp";
import { WhatsAppButton } from "../ui/WhatsAppButton";
import { BottomSheet } from "../ui/BottomSheet";
import { cn } from "../../lib/cn";
import { formatMoney } from "../../lib/format";
import { canShareReceipt, isIosBrowser, shareTextReceipt } from "../../lib/share-receipt";

interface ReceiptModalProps {
  order: Order;
  settings: BranchSettings;
  changeDue?: number;
  onClose: () => void;
  autoPrint?: boolean;
  mobile?: boolean;
}

export function ReceiptModal({
  order,
  settings,
  changeDue = 0,
  onClose,
  autoPrint = false,
  mobile = false,
}: ReceiptModalProps) {
  const printer = usePrinter();
  const resolvedChange = resolveOrderChangeDue(order, changeDue);
  const [busy, setBusy] = useState<"pdf" | "thermal" | "escpos" | "html" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [printMode, setPrintMode] = useState<"escpos" | "html" | null>(null);
  const [autoTried, setAutoTried] = useState(false);

  useEffect(() => {
    if (!autoPrint || autoTried) return;
    setAutoTried(true);
    setBusy("thermal");
    void printThermalReceiptSmart(order, settings, resolvedChange, "auto")
      .then((mode) => {
        setPrintMode(mode);
        if (mode === "html" && !printer.connected && isIosBrowser()) {
          setError("فُتحت طباعة المتصفح — Share → Print (AirPrint) على iPhone");
        }
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "فشلت الطباعة التلقائية")
      )
      .finally(() => setBusy(null));
  }, [autoPrint, autoTried, order, settings, resolvedChange, printer.connected]);

  const runThermal = async (force: "escpos" | "html" | "auto" = "auto") => {
    setBusy(force === "html" ? "html" : force === "escpos" ? "escpos" : "thermal");
    setError(null);
    try {
      if (force === "html") {
        printThermalReceiptBrowser(order, settings, resolvedChange);
        setPrintMode("html");
        return;
      }
      const mode = await printThermalReceiptSmart(order, settings, resolvedChange, force);
      setPrintMode(mode);
      if (mode === "html") {
        setError("فُتحت طباعة المتصفح — اربط الطابعة الحرارية من الإعدادات.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشلت الطباعة");
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => {
    if (mobile) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "F10") return;
      e.preventDefault();
      if (busy !== null) return;
      void runThermal(printer.connected ? "escpos" : "html");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobile, printer.connected, busy, order, settings, resolvedChange]);

  const whatsAppMessage = saleShareMessage(
    order.order_number,
    order.total_amount,
    settings.currency_symbol,
    settings.name,
    order.customer_name
  );

  const actions = (
    <div className={cn("grid gap-2", mobile ? "grid-cols-1 p-4 pt-0" : "grid-cols-1 sm:grid-cols-2")}>
      {(order.customer_phone || settings.phone) && (
        <WhatsAppButton
          phone={order.customer_phone || settings.phone || ""}
          message={whatsAppMessage}
          label={order.customer_phone ? "إرسال واتساب للعميل" : "مشاركة الفاتورة واتساب"}
          size="md"
          className="w-full"
        />
      )}
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => void runThermal(printer.connected ? "escpos" : "html")}
        className="btn-primary inline-flex min-h-12 items-center justify-center gap-2 text-sm font-bold"
      >
        <Printer size={18} />
        {busy === "escpos" || busy === "thermal" || busy === "html"
          ? "جاري الطباعة…"
          : "طباعة الإيصال"}
        {!mobile && (
          <span className="pos-key-badge ms-1.5 hidden sm:inline">F10</span>
        )}
      </button>
      {canShareReceipt() && (
        <button
          type="button"
          disabled={busy !== null}
          onClick={() =>
            void shareTextReceipt({
              title: order.order_number,
              text: whatsAppMessage,
            }).catch((e) => setError(e instanceof Error ? e.message : "فشل المشاركة"))
          }
          className="btn-ghost inline-flex min-h-11 items-center justify-center gap-2 text-xs font-bold"
        >
          <ShareNetwork size={16} />
          مشاركة / AirPrint
        </button>
      )}
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => {
          setBusy("pdf");
          void downloadInvoicePdf(order, settings)
            .catch((e) => setError(e instanceof Error ? e.message : "فشل PDF"))
            .finally(() => setBusy(null));
        }}
        className="btn-ghost inline-flex min-h-11 items-center justify-center gap-2 text-xs font-bold"
      >
        <FilePdf size={16} />
        {busy === "pdf" ? "جاري…" : "تحميل PDF"}
      </button>
      {mobile && (
        <button type="button" onClick={onClose} className="btn-ghost min-h-11 text-xs font-bold">
          متابعة البيع
        </button>
      )}
      {!mobile && (
        <button type="button" onClick={onClose} className="btn-ghost min-h-11 text-xs font-bold">
          متابعة البيع
        </button>
      )}
    </div>
  );

  const body = (
    <div className={mobile ? "px-4 pb-2" : ""}>
      {mobile && (
        <div className="mb-4 text-center">
          <CheckCircle size={40} weight="fill" className="mx-auto text-success" />
          <p className="mt-2 text-lg font-bold text-ink">تم البيع بنجاح</p>
          <p className="money-big mt-1 text-2xl font-bold text-highlight">
            {formatMoney(order.total_amount, settings.currency_symbol)}
          </p>
          {resolvedChange > 0 && (
            <p className="mt-1 text-sm font-semibold text-success">
              الباقي للعميل: {formatMoney(resolvedChange, settings.currency_symbol)}
            </p>
          )}
          <p className="mt-1 text-xs text-ink-mute">{order.order_number}</p>
          <div
            className={cn(
              "mx-auto mt-3 inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold",
              printer.connected ? "bg-success/15 text-success" : "bg-paper text-ink-mute"
            )}
          >
            {printer.connected
              ? `طابعة جاهزة${printer.label ? ` · ${printer.label}` : ""}`
              : "بدون طابعة — طباعة المتصفح متاحة"}
          </div>
        </div>
      )}

      {!mobile && (
        <div
          className={cn(
            "inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold",
            printer.connected ? "bg-success/15 text-success" : "bg-paper text-ink-mute"
          )}
        >
          {printer.connected
            ? `طابعة جاهزة${printer.label ? ` · ${printer.label}` : ""}`
            : "الطابعة غير متصلة"}
        </div>
      )}

      <ReceiptPreview order={order} settings={settings} changeDue={resolvedChange} compact={mobile} />

      {printMode && (
        <p className="my-2 text-center text-[11px] font-semibold text-success">
          {printMode === "escpos" ? "طُبعت حرارياً" : "فُتحت طباعة المتصفح"}
        </p>
      )}
      {error && (
        <p className="mb-2 rounded-lg bg-danger/10 px-3 py-2 text-xs font-medium text-danger">
          {error}
        </p>
      )}

      {!mobile && actions}
    </div>
  );

  if (mobile) {
    return (
      <BottomSheet open onOpenChange={(v) => !v && onClose()} title={`فاتورة ${order.order_number}`}>
        {body}
        <div className="shrink-0 border-t border-paper-line/70 bg-paper-raised">{actions}</div>
      </BottomSheet>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl border border-paper-line bg-paper-raised p-5 shadow-lift"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-paper-line pb-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-bold text-ink">فاتورة البيع</h3>
              <p className="text-[11px] text-ink-mute">{order.order_number}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-xl bg-paper text-ink-mute hover:text-ink"
              aria-label="إغلاق"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{body}</div>
      </div>
    </div>
  );
}

function ReceiptPreview({
  order,
  settings,
  changeDue,
  compact,
}: {
  order: Order;
  settings: BranchSettings;
  changeDue: number;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="rounded-xl border border-paper-line bg-paper p-3 text-xs">
        <p className="font-bold text-ink">{settings.name}</p>
        <ul className="mt-2 space-y-1 text-ink-mute">
          {order.items.slice(0, 4).map((line, idx) => (
            <li key={idx} className="flex justify-between gap-2">
              <span className="truncate">{line.name}</span>
              <span className="money-big shrink-0 font-semibold text-ink">
                {line.quantity}×{line.unit_price.toFixed(2)}
              </span>
            </li>
          ))}
          {order.items.length > 4 && (
            <li className="text-[10px]">+{order.items.length - 4} أصناف أخرى</li>
          )}
        </ul>
      </div>
    );
  }

  return (
    <div className="print-receipt my-4 overflow-y-auto rounded-xl border border-dashed border-paper-line bg-white p-4 font-mono text-xs text-black">
      <div className="text-center text-base font-bold">{settings.name || "OmniSales POS"}</div>
      {settings.address && <div className="text-center text-[11px]">{settings.address}</div>}
      {settings.phone && <div className="text-center text-[11px]">هاتف: {settings.phone}</div>}

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
          <div key={idx} className="flex justify-between gap-2 text-[11px]">
            <span className="max-w-[140px] truncate">{line.name}</span>
            <span className="font-bold">{(line.quantity * line.unit_price).toFixed(2)}</span>
          </div>
        ))}
      </div>

      <div className="space-y-1 border-t border-black pt-1 text-[11px]">
        <div className="flex justify-between">
          <span>الإجمالي</span>
          <span className="font-bold">
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
    </div>
  );
}
