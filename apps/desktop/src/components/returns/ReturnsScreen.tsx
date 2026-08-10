import { useMemo, useState } from "react";
import {
  ArrowUUpLeft,
  MagnifyingGlass,
  Package,
  CheckCircle,
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
}: {
  orders: Order[];
  returns: ReturnRecord[];
  settings: BranchSettings;
  openShift: Shift | null;
  cashierId: string;
  initialOrderId?: string | null;
  onDone: () => void;
}) {
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(
    initialOrderId ?? null
  );
  const [qtys, setQtys] = useState<Record<number, number>>({});
  const [method, setMethod] = useState<RefundMethod>("cash");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [lastReturn, setLastReturn] = useState<ReturnRecord | null>(null);

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

  const selected = completed.find((o) => o.id === selectedId) ?? null;

  const selectOrder = (id: string) => {
    setSelectedId(id);
    setQtys({});
    setMsg(null);
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
        restock: true,
      }))
      .filter((i) => i.quantity > 0);
    if (!items.length) {
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
      setQtys({});
      setMsg(`تم تسجيل المرتجع ${record.return_number}`);
      onDone();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "فشل تسجيل المرتجع");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
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
            lastReturn
              ? "bg-success/10 text-success"
              : "bg-warning/10 text-warning"
          )}
        >
          {msg}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <section className="panel overflow-hidden p-0">
          <div className="flex items-center gap-2 border-b border-paper-line px-3 py-2.5">
            <MagnifyingGlass size={16} className="text-ink-mute" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="بحث برقم الفاتورة أو العميل…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-ink-mute"
            />
          </div>
          <div className="max-h-[60dvh] overflow-y-auto">
            {filtered.map((o) => {
              const active = o.id === selectedId;
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => selectOrder(o.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 border-b border-paper-line px-3 py-3 text-start transition",
                    active ? "bg-highlight/10" : "hover:bg-paper"
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-ink">
                      {o.order_number}
                    </p>
                    <p className="truncate text-[11px] text-ink-mute">
                      {o.customer_name || "نقدي"} ·{" "}
                      {new Date(o.created_at).toLocaleString("ar-LY")}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-xs font-bold text-ink">
                    {formatMoney(o.total_amount, settings.currency_symbol)}
                  </span>
                </button>
              );
            })}
            {!filtered.length && (
              <p className="px-4 py-10 text-center text-xs text-ink-mute">
                لا فواتير مطابقة
              </p>
            )}
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
        <div className="space-y-2 p-3 md:hidden">
          {!returns.length ? (
            <p className="py-8 text-center text-xs text-ink-mute">لا مرتجعات بعد</p>
          ) : (
            returns
              .slice()
              .sort(
                (a, b) =>
                  new Date(b.created_at).getTime() -
                  new Date(a.created_at).getTime()
              )
              .map((r) => (
                <div
                  key={r.id}
                  className="rounded-xl border border-paper-line bg-paper/40 px-3 py-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-ink">
                        {r.return_number}
                      </p>
                      <p className="truncate text-[11px] text-ink-mute">
                        {r.order_number} · {REFUND_LABEL[r.refund_method]}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-xs font-bold text-ink">
                      {formatMoney(r.total_refund, settings.currency_symbol)}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-ink-mute">
                    {new Date(r.created_at).toLocaleString("ar-LY")}
                  </p>
                </div>
              ))
          )}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[640px] text-start text-xs">
            <thead className="bg-paper text-ink-mute">
              <tr>
                <th className="px-3 py-2 font-semibold">الرقم</th>
                <th className="px-3 py-2 font-semibold">الفاتورة</th>
                <th className="px-3 py-2 font-semibold">الطريقة</th>
                <th className="px-3 py-2 font-semibold">المبلغ</th>
                <th className="px-3 py-2 font-semibold">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {returns
                .slice()
                .sort(
                  (a, b) =>
                    new Date(b.created_at).getTime() -
                    new Date(a.created_at).getTime()
                )
                .map((r) => (
                  <tr key={r.id} className="border-t border-paper-line">
                    <td className="px-3 py-2 font-bold text-ink">
                      {r.return_number}
                    </td>
                    <td className="px-3 py-2 text-ink-soft">{r.order_number}</td>
                    <td className="px-3 py-2">
                      {REFUND_LABEL[r.refund_method]}
                    </td>
                    <td className="px-3 py-2 font-mono font-bold">
                      {formatMoney(r.total_refund, settings.currency_symbol)}
                    </td>
                    <td className="px-3 py-2 text-ink-mute">
                      {new Date(r.created_at).toLocaleString("ar-LY")}
                    </td>
                  </tr>
                ))}
              {!returns.length && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-8 text-center text-ink-mute"
                  >
                    لا مرتجعات بعد
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      </PageContent>
    </>
  );
}
