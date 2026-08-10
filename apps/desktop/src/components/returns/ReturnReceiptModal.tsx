import { useEffect, useState } from "react";
import { Printer, CheckCircle, ShareNetwork } from "@phosphor-icons/react";
import type { BranchSettings, Order, ReturnRecord } from "../../lib/types";
import { printReturnReceiptSmart } from "../../lib/print/return-thermal";
import { printReturnReceiptHtml } from "../../lib/print/return-receipt-html";
import { usePrinter } from "../../hooks/use-printer";
import { canShareReceipt, isIosBrowser, shareTextReceipt } from "../../lib/share-receipt";
import { BottomSheet } from "../ui/BottomSheet";
import { cn } from "../../lib/cn";
import { formatMoney } from "../../lib/format";

const REFUND_AR: Record<string, string> = {
  cash: "نقداً",
  card: "بطاقة",
  credit: "رصيد عميل",
};

export function ReturnReceiptModal({
  record,
  order,
  settings,
  onClose,
  autoPrint = false,
  mobile = false,
}: {
  record: ReturnRecord;
  order: Order;
  settings: BranchSettings;
  onClose: () => void;
  autoPrint?: boolean;
  mobile?: boolean;
}) {
  const printer = usePrinter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [printMode, setPrintMode] = useState<"escpos" | "html" | null>(null);
  const [autoTried, setAutoTried] = useState(false);
  const ios = isIosBrowser();

  const runThermal = async (force: "escpos" | "html" | "auto" = "auto") => {
    setBusy(true);
    setError(null);
    try {
      if (force === "html") {
        printReturnReceiptHtml(record, order, settings);
        setPrintMode("html");
        return;
      }
      const mode = await printReturnReceiptSmart(record, order, settings, force);
      setPrintMode(mode);
      if (mode === "html" && !printer.connected) {
        setError(
          ios
            ? "فُتحت طباعة المتصفح — اختر Share → Print (AirPrint) على iPhone"
            : "فُتحت طباعة المتصفح — اربط الطابعة من إعدادات الطباعة."
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشلت الطباعة");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!autoPrint || autoTried) return;
    setAutoTried(true);
    void runThermal("auto");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on open when autoPrint
  }, [autoPrint, autoTried]);

  useEffect(() => {
    if (mobile) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "F10") return;
      e.preventDefault();
      if (busy) return;
      void runThermal(printer.connected ? "escpos" : "auto");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobile, busy, printer.connected]);

  const shareText = [
    `مرتجع ${record.return_number}`,
    `فاتورة ${record.order_number}`,
    `الاسترداد: ${formatMoney(record.total_refund, settings.currency_symbol)}`,
    `الطريقة: ${REFUND_AR[record.refund_method]}`,
    settings.name,
  ].join("\n");

  const actions = (
    <div className={cn("grid gap-2", mobile ? "grid-cols-1 p-4 pt-0" : "grid-cols-1 sm:grid-cols-2")}>
      <button
        type="button"
        disabled={busy}
        onClick={() => void runThermal(printer.connected ? "escpos" : "auto")}
        className="btn-primary inline-flex min-h-12 items-center justify-center gap-2 text-sm font-bold"
      >
        <Printer size={18} />
        {busy ? "جاري الطباعة…" : "طباعة إيصال المرتجع"}
        {!mobile && <span className="pos-key-badge ms-1.5 hidden sm:inline">F10</span>}
      </button>
      {canShareReceipt() && (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            void shareTextReceipt({ title: record.return_number, text: shareText }).catch((e) =>
              setError(e instanceof Error ? e.message : "فشل المشاركة")
            )
          }
          className="btn-ghost inline-flex min-h-11 items-center justify-center gap-2 text-xs font-bold"
        >
          <ShareNetwork size={16} />
          مشاركة / AirPrint
        </button>
      )}
      <button type="button" onClick={onClose} className="btn-ghost min-h-11 text-xs font-bold">
        متابعة
      </button>
    </div>
  );

  const body = (
    <div className={mobile ? "px-4 pb-2" : ""}>
      {mobile && (
        <div className="mb-4 text-center">
          <CheckCircle size={40} weight="fill" className="mx-auto text-success" />
          <p className="mt-2 text-lg font-bold text-ink">تم تسجيل المرتجع</p>
          <p className="money-big mt-1 text-2xl font-bold text-warning">
            {formatMoney(record.total_refund, settings.currency_symbol)}
          </p>
          <p className="mt-1 text-xs text-ink-mute">{record.return_number}</p>
        </div>
      )}

      <div className="rounded-xl border border-dashed border-paper-line bg-white p-4 font-mono text-xs text-black">
        <div className="text-center text-base font-bold">{settings.name}</div>
        <div className="text-center text-[11px] font-bold text-amber-700">إيصال مرتجع</div>
        <div className="my-2 space-y-1 border-y border-black py-1 text-[11px]">
          <div className="flex justify-between">
            <span>المرتجع</span>
            <span className="font-bold">{record.return_number}</span>
          </div>
          <div className="flex justify-between">
            <span>الفاتورة</span>
            <span>{record.order_number}</span>
          </div>
          <div className="flex justify-between">
            <span>الاسترداد</span>
            <span>{REFUND_AR[record.refund_method]}</span>
          </div>
        </div>
        <ul className="space-y-1">
          {record.items.map((item, idx) => (
            <li key={idx} className="flex justify-between gap-2 text-[11px]">
              <span className="truncate">{item.name}</span>
              <span className="font-bold">
                {(item.quantity * item.unit_refund).toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex justify-between border-t border-black pt-1 font-bold">
          <span>الإجمالي</span>
          <span>
            {record.total_refund.toFixed(2)} {settings.currency_symbol}
          </span>
        </div>
      </div>

      {printMode && (
        <p className="my-2 text-center text-[11px] font-semibold text-success">
          {printMode === "escpos" ? "طُبع حرارياً" : "فُتحت طباعة المتصفح"}
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
      <BottomSheet open onOpenChange={(v) => !v && onClose()} title={`مرتجع ${record.return_number}`}>
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
          <h3 className="font-bold text-ink">إيصال المرتجع</h3>
          <p className="text-[11px] text-ink-mute">{record.return_number}</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{body}</div>
      </div>
    </div>
  );
}
