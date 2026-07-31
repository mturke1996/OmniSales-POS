import { useMemo, useState } from "react";
import { Package, Plus, Truck } from "@phosphor-icons/react";
import {
  addSupplier,
  createPurchase,
  receivePurchase,
} from "../../lib/api";
import { formatMoney } from "../../lib/format";
import type {
  BranchSettings,
  Product,
  Purchase,
  PurchaseLine,
  Supplier,
} from "../../lib/types";

export function PurchasesScreen({
  suppliers,
  purchases,
  products,
  settings,
  onRefreshData,
}: {
  suppliers: Supplier[];
  purchases: Purchase[];
  products: Product[];
  settings: BranchSettings;
  onRefreshData: () => void;
}) {
  const [tab, setTab] = useState<"purchases" | "suppliers">("purchases");
  const [showSupplier, setShowSupplier] = useState(false);
  const [showPurchase, setShowPurchase] = useState(false);

  const sorted = useMemo(
    () =>
      [...purchases].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [purchases]
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-paper-line pb-4">
        <div>
          <h2 className="text-xl font-bold text-ink">المشتريات والموردون</h2>
          <p className="text-xs text-ink-mute">
            استلام بضاعة يحدّث المخزون وسعر التكلفة تلقائياً
          </p>
        </div>
        <div className="flex gap-2">
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
      </div>

      <div className="flex gap-1 rounded-2xl border border-paper-line bg-paper-raised p-1">
        <button
          type="button"
          onClick={() => setTab("purchases")}
          className={`rounded-xl px-4 py-2 text-xs font-bold ${
            tab === "purchases" ? "bg-ink text-paper" : "text-ink-mute"
          }`}
        >
          أوامر الشراء ({purchases.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("suppliers")}
          className={`rounded-xl px-4 py-2 text-xs font-bold ${
            tab === "suppliers" ? "bg-ink text-paper" : "text-ink-mute"
          }`}
        >
          الموردون ({suppliers.length})
        </button>
      </div>

      {tab === "suppliers" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {!suppliers.length && (
            <p className="col-span-full py-10 text-center text-xs text-ink-mute">
              لا يوجد موردون بعد
            </p>
          )}
          {suppliers.map((s) => (
            <div
              key={s.id}
              className="rounded-2xl border border-paper-line bg-paper-raised p-4"
            >
              <div className="flex items-center gap-2 font-bold text-ink">
                <Truck size={18} className="text-highlight" />
                {s.name}
              </div>
              <p className="mt-1 font-mono text-xs text-ink-mute">{s.phone}</p>
              {s.address && (
                <p className="mt-1 text-xs text-ink-mute">{s.address}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {!sorted.length && (
            <p className="py-10 text-center text-xs text-ink-mute">
              لا توجد مشتريات — أنشئ أمر شراء واستلمه لإضافة المخزون
            </p>
          )}
          {sorted.map((p) => (
            <div
              key={p.id}
              className="rounded-2xl border border-paper-line bg-paper-raised p-4"
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
              {p.status === "draft" && (
                <button
                  type="button"
                  className="btn-primary mt-3 text-xs font-bold"
                  onClick={() => {
                    void receivePurchase(p.id)
                      .then(() => onRefreshData())
                      .catch((e) =>
                        alert(e instanceof Error ? e.message : "فشل الاستلام")
                      );
                  }}
                >
                  <Package size={14} className="inline" /> استلام وتحديث المخزون
                </button>
              )}
            </div>
          ))}
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
          onClose={() => setShowPurchase(false)}
          onSave={async (data) => {
            await createPurchase(data);
            setShowPurchase(false);
            onRefreshData();
          }}
        />
      )}
    </div>
  );
}

function SupplierModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (d: Omit<Supplier, "id" | "created_at">) => Promise<void>;
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
          void onSave({ name, phone, address: address || undefined })
            .catch((err) => alert(err instanceof Error ? err.message : "فشل"))
            .finally(() => setBusy(false));
        }}
      >
        <h3 className="font-bold">مورد جديد</h3>
        <input className="input" required placeholder="الاسم" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="input font-mono" required placeholder="الهاتف" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <input className="input" placeholder="العنوان" value={address} onChange={(e) => setAddress(e.target.value)} />
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost text-xs" onClick={onClose}>إلغاء</button>
          <button type="submit" disabled={busy} className="btn-primary text-xs font-bold">حفظ</button>
        </div>
      </form>
    </div>
  );
}

function PurchaseModal({
  suppliers,
  products,
  onClose,
  onSave,
}: {
  suppliers: Supplier[];
  products: Product[];
  onClose: () => void;
  onSave: (d: {
    supplier_id: string;
    items: PurchaseLine[];
    notes?: string;
    receive_now?: boolean;
  }) => Promise<void>;
}) {
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || "");
  const [productId, setProductId] = useState(products[0]?.id || "");
  const [qty, setQty] = useState(1);
  const [cost, setCost] = useState(0);
  const [lines, setLines] = useState<PurchaseLine[]>([]);
  const [receiveNow, setReceiveNow] = useState(true);
  const [busy, setBusy] = useState(false);

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
            receive_now: receiveNow,
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
        <button type="button" className="btn-ghost text-xs font-bold" onClick={addLine}>
          إضافة صنف للأمر
        </button>
        <ul className="space-y-1 text-xs">
          {lines.map((l, i) => (
            <li key={i} className="flex justify-between border-b border-paper-line py-1">
              <span>
                {l.name} ×{l.quantity}
              </span>
              <span className="font-mono">{(l.quantity * l.unit_cost).toFixed(2)}</span>
            </li>
          ))}
        </ul>
        <label className="flex items-center gap-2 text-xs font-semibold">
          <input
            type="checkbox"
            checked={receiveNow}
            onChange={(e) => setReceiveNow(e.target.checked)}
          />
          استلام فوري (تحديث المخزون الآن)
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost text-xs" onClick={onClose}>
            إلغاء
          </button>
          <button type="submit" disabled={busy} className="btn-primary text-xs font-bold">
            حفظ
          </button>
        </div>
      </form>
    </div>
  );
}
