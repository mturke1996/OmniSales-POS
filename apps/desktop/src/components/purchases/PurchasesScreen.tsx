import { useEffect, useMemo, useState } from "react";
import { Package, Plus, Truck, Wallet } from "@phosphor-icons/react";
import {
  addSupplier,
  createPurchase,
  receivePurchase,
  recordSupplierPayment,
} from "../../lib/api";
import { formatMoney } from "../../lib/format";
import type {
  BranchSettings,
  Product,
  Purchase,
  PurchaseLine,
  Supplier,
  SupplierPayment,
} from "../../lib/types";
import { PageHeader } from "../layout/PageHeader";
import { PageContent } from "../layout/PageContent";
import { DataTable } from "../ui/DataTable";
import type { ColumnDef } from "@tanstack/react-table";
import { cn } from "../../lib/cn";

const PAY_AR: Record<string, string> = {
  unpaid: "غير مدفوع",
  partial: "مدفوع جزئياً",
  paid: "مدفوع",
};

export function PurchasesScreen({
  suppliers,
  purchases,
  supplierPayments = [],
  products,
  settings,
  onRefreshData,
  initialPurchaseId,
  initialSupplierId,
}: {
  suppliers: Supplier[];
  purchases: Purchase[];
  supplierPayments?: SupplierPayment[];
  products: Product[];
  settings: BranchSettings;
  onRefreshData: () => void;
  initialPurchaseId?: string | null;
  initialSupplierId?: string | null;
}) {
  const [tab, setTab] = useState<"purchases" | "suppliers" | "payables">(
    initialSupplierId ? "suppliers" : "purchases"
  );
  const [showSupplier, setShowSupplier] = useState(false);
  const [showPurchase, setShowPurchase] = useState(false);
  const [payTarget, setPayTarget] = useState<Supplier | null>(null);

  useEffect(() => {
    if (initialSupplierId) setTab("suppliers");
    else if (initialPurchaseId) setTab("purchases");
  }, [initialPurchaseId, initialSupplierId]);

  useEffect(() => {
    const id = initialPurchaseId
      ? `purchase-${initialPurchaseId}`
      : initialSupplierId
        ? `supplier-${initialSupplierId}`
        : null;
    if (!id) return;
    const t = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
    return () => window.clearTimeout(t);
  }, [initialPurchaseId, initialSupplierId, tab]);

  const sorted = useMemo(
    () =>
      [...purchases].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [purchases]
  );

  const totalPayable = useMemo(
    () => suppliers.reduce((s, x) => s + Math.max(0, Number(x.balance) || 0), 0),
    [suppliers]
  );

  const recentPayments = useMemo(
    () =>
      [...supplierPayments]
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        .slice(0, 40),
    [supplierPayments]
  );

  const purchaseColumns: ColumnDef<Purchase, unknown>[] = useMemo(
    () => [
      {
        accessorKey: "purchase_number",
        header: "رقم الأمر",
        cell: ({ row }) => (
          <span className="font-bold text-ink">{row.original.purchase_number}</span>
        ),
      },
      {
        accessorKey: "supplier_name",
        header: "المورد",
      },
      {
        accessorKey: "created_at",
        header: "التاريخ",
        cell: ({ row }) =>
          new Date(row.original.created_at).toLocaleString("ar-LY"),
      },
      {
        accessorKey: "total_cost",
        header: "الإجمالي",
        cell: ({ row }) => (
          <span className="money-big font-bold">
            {formatMoney(row.original.total_cost, settings.currency_symbol)}
          </span>
        ),
      },
      {
        id: "status",
        header: "الحالة",
        cell: ({ row }) => {
          const p = row.original;
          const paid = Number(p.paid_amount) || 0;
          const due = Math.max(0, p.total_cost - paid);
          const status = p.payment_status || (paid <= 0 ? "unpaid" : "partial");
          return (
            <div className="space-y-0.5">
              <span
                className={cn(
                  "text-[11px] font-bold",
                  p.status === "received" ? "text-success" : "text-warning"
                )}
              >
                {p.status === "received" ? "مستلم" : "مسودة"}
              </span>
              {p.status === "received" && (
                <p className="text-[10px] text-ink-mute">
                  {PAY_AR[status] || status}
                  {due > 0 ? ` · ${formatMoney(due, settings.currency_symbol)}` : ""}
                </p>
              )}
            </div>
          );
        },
      },
      {
        id: "actions",
        header: "إجراء",
        cell: ({ row }) => {
          const p = row.original;
          const paid = Number(p.paid_amount) || 0;
          const due = Math.max(0, p.total_cost - paid);
          return (
            <div className="flex flex-wrap gap-1">
              {p.status === "draft" && (
                <button
                  type="button"
                  className="text-xs font-bold text-highlight"
                  onClick={() => {
                    void receivePurchase(p.id)
                      .then(() => onRefreshData())
                      .catch((e) =>
                        alert(e instanceof Error ? e.message : "فشل الاستلام")
                      );
                  }}
                >
                  استلام
                </button>
              )}
              {p.status === "received" && due > 0 && (
                <button
                  type="button"
                  className="text-xs font-bold text-success"
                  onClick={() => {
                    const s = suppliers.find((x) => x.id === p.supplier_id);
                    if (s) setPayTarget(s);
                  }}
                >
                  سداد
                </button>
              )}
            </div>
          );
        },
      },
    ],
    [onRefreshData, settings.currency_symbol, suppliers]
  );

  const supplierColumns: ColumnDef<Supplier, unknown>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "المورد",
        cell: ({ row }) => (
          <span className="font-bold text-ink">{row.original.name}</span>
        ),
      },
      { accessorKey: "phone", header: "الهاتف" },
      {
        accessorKey: "balance",
        header: "مستحق علينا",
        cell: ({ row }) => (
          <span className="font-bold text-warning">
            {formatMoney(row.original.balance || 0, settings.currency_symbol)}
          </span>
        ),
      },
      {
        id: "pay",
        header: "إجراء",
        cell: ({ row }) =>
          (row.original.balance || 0) > 0 ? (
            <button
              type="button"
              className="text-xs font-bold text-highlight"
              onClick={() => setPayTarget(row.original)}
            >
              سداد
            </button>
          ) : (
            "—"
          ),
      },
    ],
    [settings.currency_symbol]
  );

  return (
    <>
      <PageHeader
        title="المشتريات والموردون"
        description="استلام بضاعة يحدّث المخزون والتكلفة وذمم الموردين"
        breadcrumbs={[{ label: "OmniSales" }, { label: "المخزون" }, { label: "المشتريات" }]}
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-ghost text-xs font-bold"
              onClick={() => setShowSupplier(true)}
            >
              + مورد
            </button>
            <button
              type="button"
              className="btn-primary text-xs font-bold"
              onClick={() => setShowPurchase(true)}
            >
              <Plus size={14} className="inline" /> أمر شراء
            </button>
          </div>
        }
      />
      <PageContent className="space-y-6">

      <div className="rounded-2xl border border-warning/25 bg-warning/10 px-4 py-3 text-sm">
        <span className="font-bold text-warning">ذمم الموردين: </span>
        <span className="font-mono font-bold text-ink">
          {formatMoney(totalPayable, settings.currency_symbol)}
        </span>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-paper-line bg-paper-raised p-1">
        {(
          [
            ["purchases", `أوامر الشراء (${purchases.length})`],
            ["suppliers", `الموردون (${suppliers.length})`],
            ["payables", "الذمم والدفعات"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold ${
              tab === id ? "bg-ink text-paper" : "text-ink-mute"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "suppliers" && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:hidden">
            {!suppliers.length && (
              <p className="col-span-full py-10 text-center text-xs text-ink-mute">
                لا يوجد موردون بعد
              </p>
            )}
            {suppliers.map((s) => (
              <div
                key={s.id}
                id={`supplier-${s.id}`}
                className={cn(
                  "rounded-2xl border bg-paper-raised p-4",
                  initialSupplierId === s.id
                    ? "border-highlight ring-1 ring-highlight/30"
                    : "border-paper-line"
                )}
              >
                <div className="flex items-center gap-2 font-bold text-ink">
                  <Truck size={18} className="text-highlight" />
                  {s.name}
                </div>
                <p className="mt-1 font-mono text-xs text-ink-mute">{s.phone}</p>
                {s.address && (
                  <p className="mt-1 text-xs text-ink-mute">{s.address}</p>
                )}
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[10px] text-ink-mute">مستحق علينا</p>
                    <p className="font-mono text-sm font-bold text-warning">
                      {formatMoney(s.balance || 0, settings.currency_symbol)}
                    </p>
                  </div>
                  {(s.balance || 0) > 0 && (
                    <button
                      type="button"
                      className="btn-primary text-[11px] font-bold"
                      onClick={() => setPayTarget(s)}
                    >
                      <Wallet size={14} className="inline" /> سداد
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="hidden lg:block">
            <DataTable
              data={suppliers}
              columns={supplierColumns}
              emptyMessage="لا يوجد موردون بعد"
              getRowClassName={(s) =>
                initialSupplierId === s.id ? "bg-highlight/10" : undefined
              }
            />
          </div>
        </>
      )}

      {tab === "payables" && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {suppliers
              .filter((s) => (s.balance || 0) > 0)
              .map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-2xl border border-paper-line bg-paper-raised p-4"
                >
                  <div>
                    <p className="font-bold text-ink">{s.name}</p>
                    <p className="font-mono text-sm font-bold text-warning">
                      {formatMoney(s.balance || 0, settings.currency_symbol)}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn-primary text-xs font-bold"
                    onClick={() => setPayTarget(s)}
                  >
                    تسجيل دفعة
                  </button>
                </div>
              ))}
            {!suppliers.some((s) => (s.balance || 0) > 0) && (
              <p className="col-span-full py-8 text-center text-xs text-ink-mute">
                لا توجد ذمم موردين حالياً
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-paper-line bg-paper-raised p-4">
            <h3 className="mb-3 text-sm font-bold text-ink">آخر الدفعات</h3>
            <div className="space-y-2">
              {recentPayments.map((p) => {
                const supplier = suppliers.find((s) => s.id === p.supplier_id);
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-2 border-b border-paper-line py-2 text-xs last:border-0"
                  >
                    <div>
                      <p className="font-semibold text-ink">
                        {supplier?.name || "مورد"}
                      </p>
                      <p className="text-ink-mute">
                        {new Date(p.created_at).toLocaleString("ar-LY")} ·{" "}
                        {p.method === "cash"
                          ? "نقداً"
                          : p.method === "card"
                            ? "بطاقة"
                            : "تحويل"}
                        {p.note ? ` · ${p.note}` : ""}
                      </p>
                    </div>
                    <span className="font-mono font-bold text-success">
                      −{formatMoney(p.amount, settings.currency_symbol)}
                    </span>
                  </div>
                );
              })}
              {!recentPayments.length && (
                <p className="py-6 text-center text-xs text-ink-mute">
                  لا دفعات مسجّلة بعد
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "purchases" && (
        <div className="space-y-3">
          {!sorted.length && (
            <p className="py-10 text-center text-xs text-ink-mute lg:hidden">
              لا توجد مشتريات — أنشئ أمر شراء واستلمه لإضافة المخزون
            </p>
          )}
          <div className="space-y-3 lg:hidden">
          {sorted.map((p) => {
            const paid = Number(p.paid_amount) || 0;
            const due = Math.max(0, p.total_cost - paid);
            const status = p.payment_status || (paid <= 0 ? "unpaid" : "partial");
            return (
              <div
                key={p.id}
                id={`purchase-${p.id}`}
                className={cn(
                  "rounded-2xl border bg-paper-raised p-4",
                  initialPurchaseId === p.id
                    ? "border-highlight ring-1 ring-highlight/30"
                    : "border-paper-line"
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-extrabold text-ink">{p.purchase_number}</p>
                    <p className="text-xs text-ink-mute">
                      {p.supplier_name} ·{" "}
                      {new Date(p.created_at).toLocaleString("ar-LY")}
                    </p>
                  </div>
                  <div className="text-end">
                    <p className="font-mono font-bold text-ink">
                      {formatMoney(p.total_cost, settings.currency_symbol)}
                    </p>
                    <span
                      className={`text-[11px] font-bold ${
                        p.status === "received" ? "text-success" : "text-warning"
                      }`}
                    >
                      {p.status === "received" ? "مستلم" : "مسودة"}
                    </span>
                    {p.status === "received" && (
                      <p className="mt-0.5 text-[10px] font-semibold text-ink-mute">
                        {PAY_AR[status] || status}
                        {due > 0
                          ? ` · متبقي ${formatMoney(due, settings.currency_symbol)}`
                          : ""}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                  {p.items.map((it, i) => (
                    <span
                      key={`${it.product_id}-${i}`}
                      className="rounded-full bg-paper px-2 py-0.5 text-ink-mute"
                    >
                      {it.name} ×{it.quantity} @ {it.unit_cost}
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {p.status === "draft" && (
                    <button
                      type="button"
                      className="btn-primary text-xs font-bold"
                      onClick={() => {
                        void receivePurchase(p.id)
                          .then(() => onRefreshData())
                          .catch((e) =>
                            alert(e instanceof Error ? e.message : "فشل الاستلام")
                          );
                      }}
                    >
                      <Package size={14} className="inline" /> استلام وتحديث
                      المخزون
                    </button>
                  )}
                  {p.status === "received" && due > 0 && (
                    <button
                      type="button"
                      className="btn-ghost text-xs font-bold"
                      onClick={() => {
                        const s = suppliers.find((x) => x.id === p.supplier_id);
                        if (s) setPayTarget(s);
                      }}
                    >
                      <Wallet size={14} className="inline" /> سداد للمورد
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          </div>
          <div className="hidden lg:block">
            <DataTable
              data={sorted}
              columns={purchaseColumns}
              emptyMessage="لا توجد مشتريات — أنشئ أمر شراء واستلمه"
              getRowClassName={(p) =>
                initialPurchaseId === p.id ? "bg-highlight/10" : undefined
              }
            />
          </div>
        </div>
      )}

      {showSupplier && (
        <SupplierModal
          onClose={() => setShowSupplier(false)}
          onSave={async (data) => {
            await addSupplier(data);
            setShowSupplier(false);
            onRefreshData();
          }}
        />
      )}

      {showPurchase && (
        <PurchaseModal
          suppliers={suppliers}
          products={products}
          currency={settings.currency_symbol}
          onClose={() => setShowPurchase(false)}
          onSave={async (data) => {
            await createPurchase({
              supplier_id: data.supplier_id,
              items: data.items,
              notes: data.notes,
              receive: data.receive,
              paid_amount: data.paid_amount,
            });
            setShowPurchase(false);
            onRefreshData();
          }}
        />
      )}

      {payTarget && (
        <SupplierPaymentModal
          supplier={payTarget}
          currency={settings.currency_symbol}
          purchases={purchases.filter(
            (p) =>
              p.supplier_id === payTarget.id &&
              p.status === "received" &&
              (p.total_cost - (p.paid_amount || 0) > 0.001)
          )}
          onClose={() => setPayTarget(null)}
          onSave={async (data) => {
            await recordSupplierPayment({
              supplier_id: payTarget.id,
              ...data,
            });
            setPayTarget(null);
            onRefreshData();
          }}
        />
      )}
      </PageContent>
    </>
  );
}

function SupplierModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (
    d: Omit<Supplier, "id" | "created_at" | "balance"> & { balance?: number }
  ) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4">
      <form
        className="w-full max-w-md space-y-3 rounded-2xl bg-paper-raised p-5"
        onSubmit={(e) => {
          e.preventDefault();
          setBusy(true);
          void onSave({ name, phone, address: address || undefined, balance: 0 })
            .catch((err) => alert(err instanceof Error ? err.message : "فشل"))
            .finally(() => setBusy(false));
        }}
      >
        <h3 className="font-bold">مورد جديد</h3>
        <input
          className="input"
          required
          placeholder="الاسم"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="input font-mono"
          required
          placeholder="الهاتف"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <input
          className="input"
          placeholder="العنوان"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost text-xs" onClick={onClose}>
            إلغاء
          </button>
          <button
            type="submit"
            disabled={busy}
            className="btn-primary text-xs font-bold"
          >
            حفظ
          </button>
        </div>
      </form>
    </div>
  );
}

function PurchaseModal({
  suppliers,
  products,
  currency,
  onClose,
  onSave,
}: {
  suppliers: Supplier[];
  products: Product[];
  currency: string;
  onClose: () => void;
  onSave: (d: {
    supplier_id: string;
    items: PurchaseLine[];
    notes?: string;
    receive?: boolean;
    paid_amount?: number;
  }) => Promise<void>;
}) {
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || "");
  const [productId, setProductId] = useState(products[0]?.id || "");
  const [qty, setQty] = useState(1);
  const [cost, setCost] = useState(0);
  const [lines, setLines] = useState<PurchaseLine[]>([]);
  const [receiveNow, setReceiveNow] = useState(true);
  const [paidNow, setPaidNow] = useState("");
  const [busy, setBusy] = useState(false);

  const total = lines.reduce((s, l) => s + l.quantity * l.unit_cost, 0);

  const addLine = () => {
    const p = products.find((x) => x.id === productId);
    if (!p || qty <= 0) return;
    setLines((prev) => [
      ...prev,
      {
        product_id: p.id,
        name: p.name,
        quantity: qty,
        unit_cost: cost || p.cost_price,
      },
    ]);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4">
      <form
        className="max-h-[90vh] w-full max-w-lg space-y-3 overflow-y-auto rounded-2xl bg-paper-raised p-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!supplierId || !lines.length) {
            alert("اختر مورداً وأضف أصنافاً");
            return;
          }
          setBusy(true);
          void onSave({
            supplier_id: supplierId,
            items: lines,
            receive: receiveNow,
            paid_amount: Number(paidNow) || 0,
          })
            .catch((err) => alert(err instanceof Error ? err.message : "فشل"))
            .finally(() => setBusy(false));
        }}
      >
        <h3 className="font-bold">أمر شراء</h3>
        {!suppliers.length ? (
          <p className="text-xs text-danger">أضف مورداً أولاً</p>
        ) : (
          <select
            className="input text-xs"
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
          >
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {(s.balance || 0) > 0
                  ? ` · ذمة ${formatMoney(s.balance, currency)}`
                  : ""}
              </option>
            ))}
          </select>
        )}
        <div className="grid grid-cols-3 gap-2">
          <select
            className="input col-span-3 text-xs sm:col-span-1"
            value={productId}
            onChange={(e) => {
              setProductId(e.target.value);
              const p = products.find((x) => x.id === e.target.value);
              if (p) setCost(p.cost_price);
            }}
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            className="input font-mono text-xs"
            value={qty}
            min={1}
            onChange={(e) => setQty(Number(e.target.value))}
            placeholder="كمية"
          />
          <input
            type="number"
            className="input font-mono text-xs"
            value={cost}
            min={0}
            step="0.01"
            onChange={(e) => setCost(Number(e.target.value))}
            placeholder="تكلفة"
          />
        </div>
        <button
          type="button"
          className="btn-ghost text-xs font-bold"
          onClick={addLine}
        >
          إضافة صنف للأمر
        </button>
        <ul className="space-y-1 text-xs">
          {lines.map((l, i) => (
            <li
              key={i}
              className="flex justify-between border-b border-paper-line py-1"
            >
              <span>
                {l.name} ×{l.quantity}
              </span>
              <span className="font-mono">
                {(l.quantity * l.unit_cost).toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
        {lines.length > 0 && (
          <p className="text-xs font-bold text-ink">
            الإجمالي: {formatMoney(total, currency)}
          </p>
        )}
        <label className="flex items-center gap-2 text-xs font-semibold">
          <input
            type="checkbox"
            checked={receiveNow}
            onChange={(e) => setReceiveNow(e.target.checked)}
          />
          استلام فوري (تحديث المخزون الآن)
        </label>
        <label className="block text-xs font-semibold text-ink-mute">
          المدفوع الآن (اختياري)
          <input
            type="number"
            min={0}
            step="0.01"
            className="input mt-1 font-mono text-xs"
            placeholder="0 = آجل كامل"
            value={paidNow}
            onChange={(e) => setPaidNow(e.target.value)}
          />
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost text-xs" onClick={onClose}>
            إلغاء
          </button>
          <button
            type="submit"
            disabled={busy}
            className="btn-primary text-xs font-bold"
          >
            حفظ
          </button>
        </div>
      </form>
    </div>
  );
}

function SupplierPaymentModal({
  supplier,
  currency,
  purchases,
  onClose,
  onSave,
}: {
  supplier: Supplier;
  currency: string;
  purchases: Purchase[];
  onClose: () => void;
  onSave: (d: {
    amount: number;
    method: "cash" | "transfer" | "card";
    note?: string;
    purchase_id?: string;
  }) => Promise<void>;
}) {
  const [amount, setAmount] = useState(String(supplier.balance || ""));
  const [method, setMethod] = useState<"cash" | "transfer" | "card">("cash");
  const [purchaseId, setPurchaseId] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4">
      <form
        className="w-full max-w-md space-y-3 rounded-2xl bg-paper-raised p-5"
        onSubmit={(e) => {
          e.preventDefault();
          const n = Number(amount);
          if (!(n > 0)) {
            alert("أدخل مبلغاً صالحاً");
            return;
          }
          setBusy(true);
          void onSave({
            amount: n,
            method,
            note: note || undefined,
            purchase_id: purchaseId || undefined,
          })
            .catch((err) => alert(err instanceof Error ? err.message : "فشل"))
            .finally(() => setBusy(false));
        }}
      >
        <h3 className="font-bold">دفعة لمورد: {supplier.name}</h3>
        <p className="text-xs text-ink-mute">
          الرصيد الحالي:{" "}
          <span className="font-mono font-bold text-warning">
            {formatMoney(supplier.balance || 0, currency)}
          </span>
        </p>
        <input
          type="number"
          required
          min={0.01}
          step="0.01"
          className="input font-mono"
          placeholder="المبلغ"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <select
          className="input text-xs"
          value={method}
          onChange={(e) =>
            setMethod(e.target.value as "cash" | "transfer" | "card")
          }
        >
          <option value="cash">نقداً</option>
          <option value="transfer">تحويل</option>
          <option value="card">بطاقة</option>
        </select>
        {purchases.length > 0 && (
          <select
            className="input text-xs"
            value={purchaseId}
            onChange={(e) => setPurchaseId(e.target.value)}
          >
            <option value="">بدون ربط بأمر شراء</option>
            {purchases.map((p) => (
              <option key={p.id} value={p.id}>
                {p.purchase_number} · متبقي{" "}
                {(p.total_cost - (p.paid_amount || 0)).toFixed(2)}
              </option>
            ))}
          </select>
        )}
        <input
          className="input text-xs"
          placeholder="ملاحظة"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost text-xs" onClick={onClose}>
            إلغاء
          </button>
          <button
            type="submit"
            disabled={busy}
            className="btn-primary text-xs font-bold"
          >
            تسجيل الدفعة
          </button>
        </div>
      </form>
    </div>
  );
}
