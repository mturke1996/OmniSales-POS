import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  FilePdf,
  Printer,
  MagnifyingGlass,
  Receipt,
  ArrowUUpLeft,
  Eye,
  CalendarBlank,
  User,
  CreditCard,
  X,
} from "@phosphor-icons/react";
import type { BranchSettings, Customer, Order } from "../../lib/types";
import { downloadInvoicePdf, openInvoicePdf, printThermalReceipt } from "../../lib/invoice";
import { PAYMENT_AR, STATUS_AR } from "../../lib/pdf/pdfBrand";
import { formatMoney } from "../../lib/format";
import { saleShareMessage } from "../../lib/whatsapp";
import { WhatsAppButton } from "../ui/WhatsAppButton";
import { MobileDataCard, MobileDataList } from "../ui/MobileDataList";
import { cn } from "../../lib/cn";
import { usePhoneLayout } from "../../hooks/use-media-query";

export function InvoicesScreen({
  orders,
  customers = [],
  settings,
  initialOrderId,
  onStartReturn,
  onOpenCustomer,
}: {
  orders: Order[];
  customers?: Customer[];
  settings: BranchSettings;
  initialOrderId?: string | null;
  onStartReturn?: (orderId: string) => void;
  onOpenCustomer?: (customerId: string) => void;
}) {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Order | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<"pdf" | "open" | "thermal" | null>(null);
  const isPhone = usePhoneLayout();

  useEffect(() => {
    if (!initialOrderId) return;
    const hit = orders.find((o) => o.id === initialOrderId);
    if (hit) setSelected(hit);
  }, [initialOrderId, orders]);

  const sorted = useMemo(
    () =>
      [...orders].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [orders]
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return sorted;
    return sorted.filter(
      (o) =>
        o.order_number.toLowerCase().includes(needle) ||
        (o.customer_name || "").toLowerCase().includes(needle) ||
        o.payment_method.includes(needle)
    );
  }, [sorted, q]);

  const run = async (
    kind: "pdf" | "open" | "thermal",
    fn: () => void | Promise<void>,
    ok: string
  ) => {
    setBusy(kind);
    setMsg(null);
    try {
      await fn();
      setMsg(ok);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "فشلت العملية");
    } finally {
      setBusy(null);
    }
  };

  const detailProps = {
    selected,
    settings,
    customers,
    busy,
    onStartReturn,
    onOpenCustomer,
    run,
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="flex flex-col gap-3 border-b border-paper-line pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">
            المبيعات المنفذة
          </h1>
          <p className="mt-1 hidden text-sm text-ink-mute sm:block">
            فواتير مكتملة · PDF · حرارية {settings.thermal_width_mm}مم · واتساب ·{" "}
            {settings.name}
          </p>
        </div>
        <div className="relative w-full max-w-sm">
          <MagnifyingGlass
            size={16}
            className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-mute"
          />
          <input
            className="input ps-9"
            placeholder="بحث برقم الفاتورة أو العميل…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      {msg && (
        <div className="rounded-xl border border-highlight/30 bg-highlight/10 px-4 py-2 text-xs font-semibold text-ink">
          {msg}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="panel overflow-hidden p-3 lg:col-span-3 lg:p-0">
          <MobileDataList empty={!filtered.length} emptyLabel="لا توجد فواتير مطابقة">
            {filtered.map((o) => (
              <MobileDataCard
                key={o.id}
                title={o.order_number}
                subtitle={o.customer_name || "نقدي"}
                meta={
                  <span>
                    {PAYMENT_AR[o.payment_method] || o.payment_method}
                  </span>
                }
                badge={
                  <span className="money-big text-sm font-bold text-ink">
                    {formatMoney(o.total_amount, settings.currency_symbol)}
                  </span>
                }
                onClick={() => setSelected(o)}
                className={cn(selected?.id === o.id && "border-highlight/40 ring-1 ring-highlight/25")}
                actions={
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-bold",
                      o.status === "completed"
                        ? "bg-success/12 text-success"
                        : o.status === "cancelled"
                          ? "bg-danger/12 text-danger"
                          : "bg-highlight/12 text-highlight"
                    )}
                  >
                    {STATUS_AR[o.status] || o.status}
                  </span>
                }
              />
            ))}
          </MobileDataList>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="bg-paper text-xs text-ink-mute">
                <tr>
                  <th className="px-4 py-3 text-start font-semibold">الرقم</th>
                  <th className="px-4 py-3 text-start font-semibold">العميل</th>
                  <th className="px-4 py-3 text-start font-semibold">الحالة</th>
                  <th className="px-4 py-3 text-start font-semibold">الدفع</th>
                  <th className="px-4 py-3 text-start font-semibold">الإجمالي</th>
                  <th className="px-4 py-3 text-end font-semibold">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {!filtered.length ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-12 text-center text-ink-mute"
                    >
                      لا توجد فواتير مطابقة
                    </td>
                  </tr>
                ) : (
                  filtered.map((o) => (
                    <tr
                      key={o.id}
                      className={cn(
                        "border-t border-paper-line transition",
                        selected?.id === o.id && "bg-highlight/5"
                      )}
                    >
                      <td className="px-4 py-3 font-bold text-ink">
                        {o.order_number}
                      </td>
                      <td className="px-4 py-3 text-ink-mute">
                        {o.customer_name || "نقدي"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 text-[11px] font-bold",
                            o.status === "completed"
                              ? "bg-success/12 text-success"
                              : o.status === "cancelled"
                                ? "bg-danger/12 text-danger"
                                : "bg-highlight/12 text-highlight"
                          )}
                        >
                          {STATUS_AR[o.status] || o.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-paper px-2.5 py-1 text-[11px] font-bold text-ink">
                          {PAYMENT_AR[o.payment_method] || o.payment_method}
                        </span>
                      </td>
                      <td className="money-big px-4 py-3 font-bold text-ink">
                        {formatMoney(o.total_amount, settings.currency_symbol)}
                      </td>
                      <td className="px-4 py-3 text-end">
                        <button
                          type="button"
                          className="text-xs font-bold text-highlight"
                          onClick={() => setSelected(o)}
                        >
                          تفاصيل
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div
          className={cn(
            "panel relative overflow-hidden lg:col-span-2",
            isPhone && "hidden"
          )}
        >
          <div className="h-1 bg-highlight" />
          <div className="h-0.5 bg-highlight/40" />
          <div className="space-y-4 p-5">
            <InvoiceDetailBody {...detailProps} />
          </div>
        </div>
      </div>

      {isPhone && selected && (
        <div
          className="app-modal-backdrop lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="تفاصيل الفاتورة"
          onClick={() => setSelected(null)}
        >
          <div
            className="app-modal-panel max-h-[88dvh] space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 border-b border-paper-line pb-3">
              <h2 className="text-sm font-bold text-ink">تفاصيل الفاتورة</h2>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="grid h-10 w-10 place-items-center rounded-xl bg-paper text-ink-mute"
                aria-label="إغلاق"
              >
                <X size={20} />
              </button>
            </div>
            <InvoiceDetailBody {...detailProps} />
          </div>
        </div>
      )}
    </div>
  );
}

function InvoiceDetailBody({
  selected,
  settings,
  customers,
  busy,
  onStartReturn,
  onOpenCustomer,
  run,
}: {
  selected: Order | null;
  settings: BranchSettings;
  customers: Customer[];
  busy: "pdf" | "open" | "thermal" | null;
  onStartReturn?: (orderId: string) => void;
  onOpenCustomer?: (customerId: string) => void;
  run: (
    kind: "pdf" | "open" | "thermal",
    fn: () => void | Promise<void>,
    ok: string
  ) => Promise<void>;
}) {
  if (!selected) {
    return (
      <div className="grid min-h-[240px] place-items-center text-center lg:min-h-[320px]">
        <div>
          <Receipt size={40} className="mx-auto text-highlight" weight="duotone" />
          <p className="mt-3 text-sm font-bold text-ink">اختر فاتورة</p>
          <p className="mt-1 max-w-[28ch] text-xs text-ink-mute">
            معاينة وثيقة رسمية بنفس هوية المنظومة — PDF أو حرارية
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-highlight">
            Invoice
          </p>
          <h2 className="mt-0.5 truncate text-lg font-extrabold text-ink">
            {selected.order_number}
          </h2>
          <p className="text-xs font-semibold text-ink-mute">
            {STATUS_AR[selected.status] || selected.status}
          </p>
        </div>
        <div className="shrink-0 rounded-xl bg-highlight/10 px-3 py-2 text-end">
          <p className="text-[10px] text-ink-mute">الإجمالي</p>
          <p className="money-big text-sm font-extrabold text-highlight">
            {formatMoney(selected.total_amount, settings.currency_symbol)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
        <InfoChip
          icon={<User size={14} />}
          label="العميل"
          value={selected.customer_name || "نقدي"}
        />
        <InfoChip
          icon={<CreditCard size={14} />}
          label="الدفع"
          value={PAYMENT_AR[selected.payment_method] || selected.payment_method}
        />
        <InfoChip
          icon={<CalendarBlank size={14} />}
          label="التاريخ"
          value={new Date(selected.created_at).toLocaleString("ar-LY")}
          wide
        />
      </div>

      {(() => {
        const phone =
          selected.customer_phone ||
          customers.find((c) => c.id === selected.customer_id)?.phone;
        if (!phone && !selected.customer_id) return null;
        return (
          <div className="flex flex-wrap gap-2">
            {phone && (
              <WhatsAppButton
                phone={phone}
                message={saleShareMessage(
                  selected.order_number,
                  selected.total_amount,
                  settings.currency_symbol,
                  settings.name,
                  selected.customer_name
                )}
                label="إرسال الفاتورة واتساب"
                size="md"
              />
            )}
            {selected.customer_id && onOpenCustomer && (
              <button
                type="button"
                className="btn-ghost rounded-xl text-xs font-bold"
                onClick={() => onOpenCustomer(selected.customer_id!)}
              >
                ملف العميل
              </button>
            )}
          </div>
        );
      })()}

      <div className="max-h-44 space-y-1 overflow-y-auto rounded-xl border border-paper-line bg-paper/60 p-2 text-xs">
        {selected.items.map((item, i) => (
          <div
            key={`${item.product_id}-${i}`}
            className="flex justify-between gap-2 border-b border-paper-line/70 px-1 py-1.5 last:border-0"
          >
            <span className="truncate font-semibold text-ink">{item.name}</span>
            <span className="shrink-0 font-mono text-ink-mute">
              {item.quantity}×{item.unit_price.toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-2">
        <button
          type="button"
          disabled={busy !== null}
          className="btn-primary inline-flex items-center justify-center gap-2 rounded-xl disabled:opacity-60"
          onClick={() =>
            void run(
              "pdf",
              () => downloadInvoicePdf(selected, settings),
              "تم تنزيل فاتورة PDF"
            )
          }
        >
          <FilePdf size={18} weight="duotone" />
          {busy === "pdf" ? "جاري الإنشاء…" : "تنزيل PDF (A4)"}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          className="btn-ghost inline-flex items-center justify-center gap-2 rounded-xl disabled:opacity-60"
          onClick={() =>
            void run(
              "open",
              () => openInvoicePdf(selected, settings),
              "تم فتح معاينة PDF"
            )
          }
        >
          <Eye size={18} weight="duotone" />
          {busy === "open" ? "جاري الفتح…" : "معاينة PDF"}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          className="btn-ghost inline-flex items-center justify-center gap-2 rounded-xl disabled:opacity-60"
          onClick={() =>
            void run(
              "thermal",
              async () => {
                await printThermalReceipt(selected, settings);
              },
              "تم إرسال الفاتورة الحرارية للطباعة"
            )
          }
        >
          <Printer size={18} weight="duotone" />
          طباعة حرارية ({settings.thermal_width_mm}مم)
        </button>
        {onStartReturn && selected.status !== "cancelled" && (
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2.5 text-xs font-bold text-warning transition hover:bg-warning/15"
            onClick={() => onStartReturn(selected.id)}
          >
            <ArrowUUpLeft size={18} weight="duotone" />
            مرتجع على هذه الفاتورة
          </button>
        )}
      </div>
    </>
  );
}

function InfoChip({
  icon,
  label,
  value,
  wide,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-xl border border-paper-line bg-paper/50 px-2.5 py-2",
        wide && "sm:col-span-2"
      )}
    >
      <span className="mt-0.5 text-highlight">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-ink-mute">{label}</p>
        <p className="truncate font-bold text-ink">{value}</p>
      </div>
    </div>
  );
}
