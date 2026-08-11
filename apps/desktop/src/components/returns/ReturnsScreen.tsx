import { useMemo, useState, useEffect } from "react";
import {
  ArrowUUpLeft,
  CheckCircle,
  Package,
  Printer,
  ArrowsClockwise,
} from "@phosphor-icons/react";
import type {
  BranchSettings,
  Order,
  RefundMethod,
  ReturnRecord,
  Shift,
} from "../../lib/types";
import { remainingReturnQty } from "../../lib/analytics";
import { createReturn } from "../../lib/api";
import { formatMoney } from "../../lib/format";
import { cn } from "../../lib/cn";
import { PageHeader } from "../layout/PageHeader";
import { PageContent } from "../layout/PageContent";
import { SearchField } from "../ui/SearchField";
import { DataTable } from "../ui/DataTable";
import { MobileDataCard, MobileDataList } from "../ui/MobileDataList";
import type { ColumnDef } from "@tanstack/react-table";
import { ReturnReceiptModal } from "./ReturnReceiptModal";
import { PosSyncBar } from "../pos/PosSyncBar";
import { usePhoneLayout } from "../../hooks/use-media-query";
import { usePageSync } from "../../hooks/use-page-sync";

const REFUND_LABEL: Record<RefundMethod, string> = {
  cash: "نقداً",
  card: "بطاقة",
  credit: "رصيد عميل",
};

export function ReturnsScreen({
  orders,
  returns,
  settings,
  openShift,
  cashierId,
  initialOrderId,
  onDone,
  pendingSync = 0,
  onSync,
}: {
  orders: Order[];
  returns: ReturnRecord[];
  settings: BranchSettings;
  openShift: Shift | null;
  cashierId: string;
  initialOrderId?: string | null;
  onDone: () => void;
  pendingSync?: number;
  onSync?: () => void | Promise<void>;
}) {
  const { online, syncing, handleSyncNow } = usePageSync(onSync);
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(
    initialOrderId ?? null
  );
  const [qtys, setQtys] = useState<Record<number, number>>({});
  const [restock, setRestock] = useState<Record<number, boolean>>({});
  const [method, setMethod] = useState<RefundMethod>("cash");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgKind, setMsgKind] = useState<"success" | "error" | "info">("info");
  const [lastReturn, setLastReturn] = useState<ReturnRecord | null>(null);
  const [receiptReturn, setReceiptReturn] = useState<ReturnRecord | null>(null);
  const isPhone = usePhoneLayout();

  useEffect(() => {
    if (!initialOrderId) return;
    setSelectedId(initialOrderId);
  }, [initialOrderId]);

  const completed = useMemo(
    () =>
      orders
        .filter((o) => o.status !== "cancelled")
        .slice()
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ),
    [orders]
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return completed;
    return completed.filter(
      (o) =>
        o.order_number.toLowerCase().includes(needle) ||
        (o.customer_name || "").toLowerCase().includes(needle)
    );
  }, [completed, q]);

  const sortedReturns = useMemo(
    () =>
      returns
        .slice()
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ),
    [returns]
  );

  const orderColumns: ColumnDef<Order, unknown>[] = useMemo(
    () => [
      {
        accessorKey: "order_number",
        header: "الفاتورة",
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
        accessorKey: "created_at",
        header: "التاريخ",
        cell: ({ row }) =>
          new Date(row.original.created_at).toLocaleString("ar-LY"),
      },
      {
        accessorKey: "total_amount",
        header: "الإجمالي",
        cell: ({ row }) => (
          <span className="font-mono font-bold text-ink">
            {formatMoney(row.original.total_amount, settings.currency_symbol)}
          </span>
        ),
      },
    ],
    [settings.currency_symbol]
  );

  const returnColumns: ColumnDef<ReturnRecord, unknown>[] = useMemo(
    () => [
      {
        accessorKey: "return_number",
        header: "الرقم",
        cell: ({ row }) => (
          <span className="font-bold text-ink">{row.original.return_number}</span>
        ),
      },
      {
        accessorKey: "order_number",
        header: "الفاتورة",
        cell: ({ row }) => (
          <span className="text-ink-soft">{row.original.order_number}</span>
        ),
      },
      {
        id: "method",
        header: "الطريقة",
        cell: ({ row }) => REFUND_LABEL[row.original.refund_method],
      },
      {
        accessorKey: "total_refund",
        header: "المبلغ",
        cell: ({ row }) => (
          <span className="font-mono font-bold text-ink">
            {formatMoney(row.original.total_refund, settings.currency_symbol)}
          </span>
        ),
      },
      {
        accessorKey: "created_at",
        header: "التاريخ",
        cell: ({ row }) =>
          new Date(row.original.created_at).toLocaleString("ar-LY"),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-full border border-paper-line px-2.5 py-1 text-[11px] font-bold"
            onClick={(e) => {
              e.stopPropagation();
              setReceiptReturn(row.original);
            }}
          >
            <Printer size={14} /> طباعة
          </button>
        ),
      },
    ],
    [settings.currency_symbol]
  );

  const receiptOrder = useMemo(() => {
    if (!receiptReturn) return null;
    return orders.find((o) => o.id === receiptReturn.order_id) ?? null;
  }, [receiptReturn, orders]);

  const selected = completed.find((o) => o.id === selectedId) ?? null;

  const selectOrder = (id: string) => {
    setSelectedId(id);
    setQtys({});
    setRestock({});
    setMsg(null);
    setMsgKind("info");
    setLastReturn(null);
    const order = completed.find((o) => o.id === id);
    if (order?.payment_method === "debt" && order.customer_id) {
      setMethod("credit");
    } else if (order?.payment_method === "card") {
      setMethod("card");
    } else {
      setMethod("cash");
    }
  };

  const refundTotal = useMemo(() => {
    if (!selected) return 0;
    return selected.items.reduce((sum, line, idx) => {
      const qty = qtys[idx] ?? 0;
      return sum + qty * line.unit_price;
    }, 0);
  }, [selected, qtys]);

  const submit = async () => {
    if (!selected) return;
    const items = Object.entries(qtys)
      .map(([idx, quantity]) => ({
        line_index: Number(idx),
        quantity,
        restock: restock[Number(idx)] !== false,
      }))
      .filter((i) => i.quantity > 0);
    if (!items.length) {
      setMsgKind("error");
      setMsg("حدد كمية مرتجعة لبند واحد على الأقل");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const record = await createReturn({
        order_id: selected.id,
        items,
        refund_method: method,
        notes: notes.trim() || undefined,
        cashier_id: cashierId,
        settings,
        open_shift: openShift,
      });
      setLastReturn(record);
      setReceiptReturn(record);
      setQtys({});
      setRestock({});
      setMsgKind("success");
      setMsg(`تم تسجيل المرتجع ${record.return_number}`);
      onDone();
    } catch (e) {
      setMsgKind("error");
      setMsg(e instanceof Error ? e.message : "فشل تسجيل المرتجع");
    } finally {
      setBusy(false);
    }
  };

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
        title="المرتجعات"
        description="إرجاع بنود من فاتورة — إعادة مخزون وتحديث الصندوق/رصيد العميل"
        breadcrumbs={[{ label: "OmniSales" }, { label: "المبيعات" }, { label: "المرتجعات" }]}
        actions={
          <span className="rounded-xl bg-highlight/10 px-3 py-2 text-xs font-semibold text-highlight">
            {returns.length} مرتجع مسجّل
          </span>
        }
      />
      <PageContent className="space-y-4">

      {msg && (
        <div
          className={cn(
            "rounded-xl px-3 py-2 text-xs font-medium",
            msgKind === "success"
              ? "bg-success/10 text-success"
              : msgKind === "error"
                ? "bg-danger/10 text-danger"
                : "bg-warning/10 text-warning"
          )}
        >
          {msg}
          {lastReturn && (
            <button
              type="button"
              className="ms-2 font-bold underline"
              onClick={() => setReceiptReturn(lastReturn)}
            >
              طباعة الإيصال
            </button>
          )}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <section className="panel overflow-hidden p-0">
          <div className="border-b border-paper-line px-3 py-2.5">
            <SearchField
              value={q}
              onChange={setQ}
              placeholder="بحث برقم الفاتورة أو العميل…"
              className="max-w-none"
            />
          </div>
          <MobileDataList
            empty={!filtered.length}
            emptyLabel="لا فواتير مطابقة"
            className="max-h-[60dvh] overflow-y-auto p-2 lg:hidden"
          >
            {filtered.map((o) => (
              <MobileDataCard
                key={o.id}
                title={o.order_number}
                subtitle={`${o.customer_name || "نقدي"} · ${new Date(o.created_at).toLocaleString("ar-LY")}`}
                onClick={() => selectOrder(o.id)}
                className={cn(o.id === selectedId && "ring-2 ring-highlight/40")}
                badge={
                  <span className="font-mono text-xs font-bold text-ink">
                    {formatMoney(o.total_amount, settings.currency_symbol)}
                  </span>
                }
              />
            ))}
          </MobileDataList>
          <div className="hidden max-h-[60dvh] overflow-y-auto md:block">
            <DataTable
              data={filtered}
              columns={orderColumns}
              emptyMessage="لا فواتير مطابقة"
              onRowClick={(o) => selectOrder(o.id)}
              getRowClassName={(o) =>
                o.id === selectedId ? "bg-highlight/10 hover:bg-highlight/15" : undefined
              }
              className="rounded-none border-0"
            />
          </div>
        </section>

        <section className="panel space-y-4 p-4">
          {!selected ? (
            <div className="grid h-64 place-items-center text-center text-xs text-ink-mute">
              <div>
                <ArrowUUpLeft size={28} className="mx-auto mb-2 text-highlight" />
                اختر فاتورة لبدء مرتجع
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-ink">
                    {selected.order_number}
                  </h3>
                  <p className="text-[11px] text-ink-mute">
                    {selected.customer_name || "عميل نقدي"}
                  </p>
                </div>
                <span className="rounded-full bg-paper px-2.5 py-1 text-[11px] font-semibold text-ink-soft">
                  {formatMoney(selected.total_amount, settings.currency_symbol)}
                </span>
              </div>

              <div className="space-y-2">
                {selected.items.map((line, idx) => {
                  const rem = remainingReturnQty(selected, returns, idx);
                  return (
                    <div
                      key={`${line.product_id}-${idx}`}
                      className="flex flex-wrap items-center gap-2 rounded-xl border border-paper-line bg-paper/50 px-3 py-2.5"
                    >
                      <Package size={16} className="text-ink-mute" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-ink">
                          {line.name}
                        </p>
                        <p className="text-[10px] text-ink-mute">
                          متاح للإرجاع: {rem} ·{" "}
                          {formatMoney(line.unit_price, settings.currency_symbol)}
                        </p>
                      </div>
                      <input
                        type="number"
                        min={0}
                        max={rem}
                        step={1}
                        disabled={rem <= 0}
                        value={qtys[idx] ?? 0}
                        onChange={(e) => {
                          const v = Math.max(
                            0,
                            Math.min(rem, Number(e.target.value) || 0)
                          );
                          setQtys((prev) => ({ ...prev, [idx]: v }));
                        }}
                        className="w-20 rounded-lg border border-paper-line bg-paper-raised px-2 py-1.5 text-center text-sm font-bold outline-none focus:border-highlight"
                      />
                      <label
                        className={cn(
                          "inline-flex items-center gap-1 text-[10px] font-semibold text-ink-mute",
                          rem <= 0 && "opacity-40"
                        )}
                        title="إعادة الكمية للمخزون"
                      >
                        <input
                          type="checkbox"
                          checked={restock[idx] !== false}
                          disabled={rem <= 0}
                          onChange={(e) =>
                            setRestock((prev) => ({ ...prev, [idx]: e.target.checked }))
                          }
                          className="rounded"
                        />
                        <ArrowsClockwise size={12} />
                        مخزون
                      </label>
                    </div>
                  );
                })}
              </div>

              <div>
                <p className="mb-2 text-[11px] font-semibold text-ink-mute">
                  طريقة الاسترداد
                </p>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(REFUND_LABEL) as RefundMethod[]).map((m) => {
                    const disabled = m === "credit" && !selected.customer_id;
                    return (
                      <button
                        key={m}
                        type="button"
                        disabled={disabled}
                        onClick={() => setMethod(m)}
                        className={cn(
                          "rounded-full px-3 py-1.5 text-xs font-bold transition",
                          method === m
                            ? "bg-highlight text-white"
                            : "bg-paper text-ink-soft hover:bg-highlight/10",
                          disabled && "cursor-not-allowed opacity-40"
                        )}
                      >
                        {REFUND_LABEL[m]}
                      </button>
                    );
                  })}
                </div>
                {method === "cash" && !openShift && (
                  <p className="mt-2 text-[11px] text-warning">
                    لا توجد وردية مفتوحة — لن يُحدَّث الصندوق المتوقع
                  </p>
                )}
              </div>

              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-ink-mute">
                  ملاحظة
                </span>
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-xl border border-paper-line bg-paper-raised px-3 py-2 text-sm outline-none focus:border-highlight"
                  placeholder="سبب الإرجاع (اختياري)"
                />
              </label>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-paper-line pt-3">
                <div>
                  <p className="text-[11px] text-ink-mute">إجمالي الاسترداد</p>
                  <p className="text-lg font-bold text-ink">
                    {formatMoney(refundTotal, settings.currency_symbol)}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy || refundTotal <= 0}
                  onClick={() => void submit()}
                  className="btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold disabled:opacity-50"
                >
                  <CheckCircle size={18} weight="fill" />
                  {busy ? "جاري التسجيل…" : "تأكيد المرتجع"}
                </button>
              </div>
            </>
          )}
        </section>
      </div>

      <section className="panel overflow-hidden p-0">
        <div className="border-b border-paper-line px-4 py-3">
          <h3 className="text-sm font-bold text-ink">سجل المرتجعات</h3>
        </div>
        <div className="space-y-2 p-3 lg:hidden">
          {!sortedReturns.length ? (
            <p className="py-8 text-center text-xs text-ink-mute">لا مرتجعات بعد</p>
          ) : (
            sortedReturns.map((r) => (
              <MobileDataCard
                key={r.id}
                title={r.return_number}
                subtitle={`${r.order_number} · ${REFUND_LABEL[r.refund_method]}`}
                meta={new Date(r.created_at).toLocaleString("ar-LY")}
                badge={
                  <span className="font-mono text-xs font-bold text-ink">
                    {formatMoney(r.total_refund, settings.currency_symbol)}
                  </span>
                }
                actions={
                  <button
                    type="button"
                    className="touch-chip inline-flex items-center gap-1 bg-paper text-[11px] font-bold text-ink"
                    onClick={() => setReceiptReturn(r)}
                  >
                    <Printer size={14} /> طباعة
                  </button>
                }
              />
            ))
          )}
        </div>
        <div className="hidden lg:block">
          <DataTable
            data={sortedReturns}
            columns={returnColumns}
            emptyMessage="لا مرتجعات بعد"
            className="rounded-none border-0"
          />
        </div>
      </section>
      </PageContent>

      {receiptReturn && receiptOrder && (
        <ReturnReceiptModal
          record={receiptReturn}
          order={receiptOrder}
          settings={settings}
          onClose={() => setReceiptReturn(null)}
          autoPrint={settings.auto_print_thermal !== false}
          mobile={isPhone}
        />
      )}
    </>
  );
}
