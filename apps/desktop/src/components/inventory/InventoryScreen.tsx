import { useState } from "react";
import { Plus, MagnifyingGlass, WarningCircle, PencilSimple, X } from "@phosphor-icons/react";
import { addProduct, updateProduct } from "../../lib/api";
import type { BranchSettings, Product } from "../../lib/types";
import { MobileDataCard, MobileDataList } from "../ui/MobileDataList";

interface InventoryScreenProps {
  products: Product[];
  settings: BranchSettings;
  onRefreshData: () => void;
  canManage?: boolean;
}

export function InventoryScreen({
  products,
  settings,
  onRefreshData,
  canManage = true,
}: InventoryScreenProps) {
  const [query, setQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const lowStockItems = products.filter((p) => p.track_stock && p.stock_quantity <= p.min_stock);

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.barcode.includes(query) ||
      p.sku.toLowerCase().includes(query) ||
      (p.oem_code && p.oem_code.toLowerCase().includes(query))
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-paper-line pb-4 gap-3">
        <div>
          <h2 className="text-xl font-bold text-ink">إدارة المنتجات والمخزون (Inventory & Catalog)</h2>
          <p className="text-xs text-ink-mute">
            إضافة وتعديل الأقسام والمنتجات ومتابعة كميات وتنبيهات نواقص المخزون.
          </p>
        </div>

        {canManage ? (
          <button
            type="button"
            onClick={() => {
              setEditingProduct(null);
              setShowAddModal(true);
            }}
            className="btn-primary text-xs inline-flex items-center gap-1.5 font-bold"
          >
            <Plus size={16} />
            إضافة صنف جديد
          </button>
        ) : (
          <p className="text-[11px] font-semibold text-ink-mute">
            عرض فقط · التعديل للمدير
          </p>
        )}
      </div>

      {/* Low Stock Warning Alert */}
      {lowStockItems.length > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <WarningCircle size={20} className="text-amber-600 shrink-0" />
            <div>
              <span className="font-bold">تنبيه النواقص: </span>
              <span>يوجد {lowStockItems.length} منتجات وصلت أو تجاوزت الحد الأدنى للمخزون!</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setQuery("")}
            className="text-xs font-bold underline hover:text-amber-950"
          >
            عرض النواقص
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <MagnifyingGlass size={18} className="absolute right-3.5 top-3 text-ink-mute" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث باسم المنتج، الباركود، SKU، أو رقم OEM..."
          className="w-full rounded-full border border-paper-line bg-paper-raised pr-10 pl-4 py-2.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ink"
        />
      </div>

      <MobileDataList empty={!filtered.length} emptyLabel="لا توجد منتجات مطابقة">
        {filtered.map((prod) => {
          const isLow = prod.track_stock && prod.stock_quantity <= prod.min_stock;
          return (
            <MobileDataCard
              key={prod.id}
              title={prod.name}
              subtitle={`${prod.barcode} · ${prod.sku}`}
              meta={
                <>
                  <span className="font-mono font-bold">
                    {prod.retail_price.toFixed(2)} {settings.currency_symbol}
                  </span>
                  <span
                    className={
                      isLow
                        ? "rounded bg-danger/10 px-1.5 font-mono font-bold text-danger"
                        : "font-mono"
                    }
                  >
                    {prod.stock_quantity} {prod.unit_type}
                  </span>
                </>
              }
              badge={
                prod.is_active ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    نشط
                  </span>
                ) : (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600">
                    معطل
                  </span>
                )
              }
              actions={
                canManage ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingProduct(prod);
                      setShowAddModal(true);
                    }}
                    className="inline-flex min-h-9 items-center gap-1 rounded-full bg-paper px-3 py-1.5 text-[11px] font-bold text-ink"
                  >
                    <PencilSimple size={14} />
                    تعديل
                  </button>
                ) : undefined
              }
            />
          );
        })}
      </MobileDataList>

      <div className="hidden overflow-x-auto rounded-2xl border border-paper-line bg-paper-raised shadow-xs md:block">
        <table className="w-full text-right text-xs">
          <thead className="bg-paper text-ink-mute font-bold border-b border-paper-line">
            <tr>
              <th className="p-3">المنتج</th>
              <th className="p-3">الباركود / SKU</th>
              <th className="p-3">سعر التكلفة</th>
              <th className="p-3">سعر البيع</th>
              <th className="p-3">المخزون الحالي</th>
              <th className="p-3">الحالة</th>
              <th className="p-3 text-left">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-paper-line">
            {filtered.map((prod) => {
              const isLow = prod.track_stock && prod.stock_quantity <= prod.min_stock;
              return (
                <tr key={prod.id} className="hover:bg-paper/50">
                  <td className="p-3 font-bold text-ink">
                    <div>{prod.name}</div>
                    {prod.oem_code && <div className="text-[10px] text-ink-mute">OEM: {prod.oem_code}</div>}
                  </td>
                  <td className="p-3 font-mono text-ink-mute">
                    <div>{prod.barcode}</div>
                    <div className="text-[10px]">{prod.sku}</div>
                  </td>
                  <td className="p-3 font-mono">{prod.cost_price.toFixed(2)} {settings.currency_symbol}</td>
                  <td className="p-3 font-mono font-bold text-ink">{prod.retail_price.toFixed(2)} {settings.currency_symbol}</td>
                  <td className="p-3 font-mono">
                    <span className={`font-bold ${isLow ? "text-red-600 bg-red-50 px-2 py-0.5 rounded" : ""}`}>
                      {prod.stock_quantity} {prod.unit_type}
                    </span>
                  </td>
                  <td className="p-3">
                    {prod.is_active ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">نشط</span>
                    ) : (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600">معطل</span>
                    )}
                  </td>
                  <td className="p-3 text-left">
                    {canManage ? (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProduct(prod);
                          setShowAddModal(true);
                        }}
                        className="rounded-full p-1.5 text-ink-mute hover:bg-paper hover:text-ink"
                      >
                        <PencilSimple size={16} />
                      </button>
                    ) : (
                      <span className="text-[10px] text-ink-mute">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Product Modal */}
      {showAddModal && (
        <ProductFormModal
          product={editingProduct}
          settings={settings}
          onClose={() => setShowAddModal(false)}
          onSave={async (data) => {
            if (editingProduct) {
              await updateProduct({ ...editingProduct, ...data });
            } else {
              await addProduct(data);
            }
            setShowAddModal(false);
            onRefreshData();
          }}
        />
      )}
    </div>
  );
}

function ProductFormModal({
  product,
  onClose,
  onSave,
}: {
  product: Product | null;
  settings?: BranchSettings;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}) {
  const [name, setName] = useState(product?.name || "");
  const [barcode, setBarcode] = useState(product?.barcode || `${Math.floor(10000000 + Math.random() * 90000000)}`);
  const [sku, setSku] = useState(product?.sku || `SKU-${Math.floor(100 + Math.random() * 900)}`);
  const [costPrice, setCostPrice] = useState(product?.cost_price || 0);
  const [retailPrice, setRetailPrice] = useState(product?.retail_price || 0);
  const [stockQuantity, setStockQuantity] = useState(product?.stock_quantity || 50);
  const [minStock, setMinStock] = useState(product?.min_stock || 5);
  const [unitType, setUnitType] = useState(product?.unit_type || "piece");
  const [oemCode, setOemCode] = useState(product?.oem_code || "");
  const [imei, setImei] = useState(product?.imei || "");
  const [serial, setSerial] = useState(product?.serial || "");
  const [vehicleFitment, setVehicleFitment] = useState(
    product?.vehicle_fitment || ""
  );
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !barcode) return;
    setSaving(true);
    try {
      await onSave({
        category_id: "cat-1",
        name,
        barcode,
        sku,
        cost_price: Number(costPrice),
        retail_price: Number(retailPrice),
        wholesale_price: Number(retailPrice) * 0.85,
        stock_quantity: Number(stockQuantity),
        min_stock: Number(minStock),
        unit_type: unitType,
        track_stock: true,
        is_active: true,
        oem_code: oemCode || undefined,
        imei: imei || undefined,
        serial: serial || undefined,
        vehicle_fitment: vehicleFitment || undefined,
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "فشل حفظ الصنف");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app-modal-backdrop">
      <div className="app-modal-panel !max-w-lg">
        <div className="flex items-center justify-between border-b border-paper-line pb-3">
          <h3 className="font-bold text-ink">{product ? "تعديل بيانات صنف" : "إضافة صنف جديد للمخزون"}</h3>
          <button type="button" onClick={onClose} className="rounded-full p-1 text-ink-mute hover:bg-paper">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-bold text-ink">اسم الصنف / المنتج *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-paper-line bg-paper px-3 py-2 text-xs font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-ink">الباركود *</label>
              <input
                type="text"
                required
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="mt-1 w-full rounded-xl border border-paper-line bg-paper px-3 py-2 text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink">رمز SKU</label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="mt-1 w-full rounded-xl border border-paper-line bg-paper px-3 py-2 text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-ink">سعر التكلفة</label>
              <input
                type="number"
                step="0.01"
                value={costPrice}
                onChange={(e) => setCostPrice(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-paper-line bg-paper px-3 py-2 text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink">سعر البيع للجمهور *</label>
              <input
                type="number"
                step="0.01"
                required
                value={retailPrice}
                onChange={(e) => setRetailPrice(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-paper-line bg-paper px-3 py-2 text-xs font-mono font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs font-semibold text-ink">المخزون الحالي</label>
              <input
                type="number"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-paper-line bg-paper px-3 py-2 text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink">الحد الأدنى</label>
              <input
                type="number"
                value={minStock}
                onChange={(e) => setMinStock(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-paper-line bg-paper px-3 py-2 text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink">الوحدة</label>
              <select
                value={unitType}
                onChange={(e) => setUnitType(e.target.value)}
                className="mt-1 w-full rounded-xl border border-paper-line bg-paper px-2 py-2 text-xs"
              >
                <option value="piece">قطعة</option>
                <option value="box">علبة</option>
                <option value="kilo">كيلو</option>
                <option value="gram">جرام</option>
                <option value="set">طقم</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-ink">رقم OEM / المرجع الأصلي (اختياري)</label>
            <input
              type="text"
              value={oemCode}
              onChange={(e) => setOemCode(e.target.value)}
              className="mt-1 w-full rounded-xl border border-paper-line bg-paper px-3 py-2 text-xs font-mono"
              placeholder="مثال: OEM-998811"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-ink">IMEI (اختياري)</label>
              <input
                type="text"
                value={imei}
                onChange={(e) => setImei(e.target.value)}
                className="mt-1 w-full rounded-xl border border-paper-line bg-paper px-3 py-2 text-xs font-mono"
                placeholder="15 رقم"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink">Serial (اختياري)</label>
              <input
                type="text"
                value={serial}
                onChange={(e) => setSerial(e.target.value)}
                className="mt-1 w-full rounded-xl border border-paper-line bg-paper px-3 py-2 text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-ink">
              توافق المركبة (قطع غيار)
            </label>
            <input
              type="text"
              value={vehicleFitment}
              onChange={(e) => setVehicleFitment(e.target.value)}
              className="mt-1 w-full rounded-xl border border-paper-line bg-paper px-3 py-2 text-xs"
              placeholder="مثال: تويوتا كورولا 2015–2019"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-paper-line">
            <button type="button" onClick={onClose} className="btn-ghost text-xs">
              إلغاء
            </button>
            <button type="submit" disabled={saving} className="btn-primary text-xs font-bold">
              {saving ? "جاري الحفظ..." : "حفظ المنتج"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
