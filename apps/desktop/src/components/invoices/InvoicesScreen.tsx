import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  FilePdf,
  Printer,
  Receipt,
  ArrowUUpLeft,
  Eye,
  CalendarBlank,
  User,
  CreditCard,
  X,
  CookingPot,
} from "@phosphor-icons/react";
import type { BranchSettings, Customer, Order } from "../../lib/types";
import { downloadInvoicePdf, openInvoicePdf } from "../../lib/invoice";
import { resolveOrderChangeDue } from "../../lib/print/thermal";
import { PAYMENT_AR, STATUS_AR } from "../../lib/pdf/pdfBrand";
import { formatMoney } from "../../lib/format";
import { saleShareMessage } from "../../lib/whatsapp";
import { WhatsAppButton } from "../ui/WhatsAppButton";
import { MobileDataCard, MobileDataList } from "../ui/MobileDataList";
import { PageHeader } from "../layout/PageHeader";
import { PageContent } from "../layout/PageContent";
import { SearchField } from "../ui/SearchField";
import { DataTable } from "../ui/DataTable";
import type { ColumnDef } from "@tanstack/react-table";
import { cn } from "../../lib/cn";
import { usePhoneLayout } from "../../hooks/use-media-query";
import { ReceiptModal } from "../pos/ReceiptModal";
import { PosSyncBar } from "../pos/PosSyncBar";
import { usePageSync } from "../../hooks/use-page-sync";
import {
  isKitchenTicketOrder,
  printKitchenTicketSmart,
} from "../../lib/print/kitchen-ticket";

export function InvoicesScreen({
  orders,
  customers = [],
  settings,
  initialOrderId,
  onStartReturn,
  onOpenCustomer,
  pendingSync = 0,
  onSync,
}: {
  orders: Order[];
  customers?: Customer[];
  settings: BranchSettings;
  initialOrderId?: string | null;
  onStartReturn?: (orderId: string) => void;
  onOpenCustomer?: (customerId: string) => void;
  pendingSync?: number;
  onSync?: () => void | Promise<void>;
}) {
  const { online, syncing, handleSyncNow } = usePageSync(onSync);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Order | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<"pdf" | "open" | "thermal" | "kitchen" | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
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
    kind: "pdf" | "open" | "thermal" | "kitchen",
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
    onOpenReceipt: () => setShowReceipt(true),
  };

  const columns: ColumnDef<Order, unknown>[] = [
    {
      accessorKey: "order_number",
      header: "الرقم",
      cell: ({ row }) => (
        <span className="font-bold text-ink">{row.original.order_number}</span>
      ),
    },
    {
      id: "customer",
      header: "العميل",
      cell: ({ row }) => (
        <span className="text-ink-mute">{row.original.customer_name || "نقدي"}</span>
      ),
    },
    {
      id: "status",
      header: "الحالة",
      cell: ({ row }) => {
        const o = row.original;
        return (
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
        );
      },
    },
    {
      id: "payment",
      header: "الدفع",
      cell: ({ row }) => (
        <span className="rounded-full bg-paper px-2.5 py-1 text-[11px] font-bold text-ink">
          {PAYMENT_AR[row.original.payment_method] || row.original.payment_method}
        </span>
      ),
    },
    {
      accessorKey: "total_amount",
      header: "الإجمالي",
      cell: ({ row }) => (
        <span className="money-big font-bold text-ink">
          {formatMoney(row.original.total_amount, settings.currency_symbol)}
        </span>
      ),
    },
    {
      id: "action",
      header: "إجراء",
      cell: ({ row }) => (
        <button
          type="button"
          className="text-xs font-bold text-highlight"
          onClick={() => setSelected(row.original)}
        >
          تفاصيل
        </button>
      ),
    },
  ];

  return (
    <>
      <PosSyncBar
        online={online}
        pendingSync={pendingSync}
        cloudEnabled={settings.cloud_sync_enabled}
        syncing={syncing}
        onSync={onSync ? handleSyncNow : undefined}
        compact
      />
      <PageHeader
        title="المبيعات المنفذة"
        description={`فواتير مكتملة · PDF · حرارية ${settings.thermal_width_mm}مم · ${settings.name}`}
        breadcrumbs={[{ label: "OmniSales" }, { label: "المبيعات" }, { label: "الفواتير" }]}
        actions={
          <SearchField
            value={q}
            onChange={setQ}
            placeholder="بحث برقم الفاتورة أو العميل…"
            className="max-w-xs"
          />
        }
      />
      <PageContent size="wide" className="space-y-5">

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
                  <div className="flex items-center gap-2">
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
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(o);
                      }}
                      className="touch-chip bg-ink text-paper text-[11px] font-bold px-3 py-1"
                    >
                      عرض الفاتورة
                    </button>
                  </div>
                }
              />
            ))}
          </MobileDataList>

          <div className="hidden lg:block">
            <DataTable
              data={filtered}
              columns={columns}
              emptyMessage="لا توجد فواتير مطابقة"
            />
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
      </PageContent>

      {showReceipt && selected && (
        <ReceiptModal
          order={selected}
          settings={settings}
          changeDue={resolveOrderChangeDue(selected)}
          onClose={() => setShowReceipt(false)}
          autoPrint={false}
          mobile={isPhone}
        />
      )}
    </>
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
  onOpenReceipt,
}: {
  selected: Order | null;
  settings: BranchSettings;
  customers: Customer[];
  busy: "pdf" | "open" | "thermal" | "kitchen" | null;
  onStartReturn?: (orderId: string) => void;
  onOpenCustomer?: (customerId: string) => void;
  run: (
    kind: "pdf" | "open" | "thermal" | "kitchen",
    fn: () => void | Promise<void>,
    ok: string
  ) => Promise<void>;
  onOpenReceipt: () => void;
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
          className="btn-primary inline-flex items-center justify-center gap-2 rounded-xl disabled:opacity-60"
          onClick={onOpenReceipt}
        >
          <Printer size={18} weight="duotone" />
          إيصال / طباعة حرارية
        </button>
        {isKitchenTicketOrder(selected) && (
          <button
            type="button"
            disabled={busy !== null}
            className="btn-ghost inline-flex items-center justify-center gap-2 rounded-xl disabled:opacity-60"
            onClick={() =>
              void run(
                "kitchen",
                async () => {
                  await printKitchenTicketSmart(selected, settings);
                },
                "تم إرسال تذكرة المطبخ للطباعة"
              )
            }
          >
            <CookingPot size={18} weight="duotone" />
            {busy === "kitchen" ? "جاري الطباعة…" : "تذكرة مطبخ"}
          </button>
        )}
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
