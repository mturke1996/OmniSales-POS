import { useMemo, useState } from "react";
import { Camera, X, Barcode, MagicWand } from "@phosphor-icons/react";
import type { Product, ProductCategory } from "../../lib/types";
import { generateEan13 } from "../../lib/barcode-label";
import { BarcodeScannerModal } from "../pos/BarcodeScannerModal";
import { BarcodeLabelCard } from "./BarcodeLabelCard";

export function ProductFormModal({
  product,
  categories,
  existingBarcodes = [],
  initialBarcode,
  onClose,
  onSave,
}: {
  product: Product | null;
  categories: ProductCategory[];
  existingBarcodes?: string[];
  initialBarcode?: string;
  onClose: () => void;
  onSave: (data: Omit<Product, "id" | "branch_id">) => Promise<void>;
}) {
  const defaultCat = categories[0]?.id || "";
  const [name, setName] = useState(product?.name || "");
  const [barcode, setBarcode] = useState(
    product?.barcode || initialBarcode || generateEan13()
  );
  const [sku, setSku] = useState(
    product?.sku || `SKU-${barcode.slice(-6)}`
  );
  const [categoryId, setCategoryId] = useState(
    product?.category_id || defaultCat
  );
  const [costPrice, setCostPrice] = useState(product?.cost_price || 0);
  const [retailPrice, setRetailPrice] = useState(product?.retail_price || 0);
  const [wholesalePrice, setWholesalePrice] = useState(
    product?.wholesale_price || 0
  );
  const [stockQuantity, setStockQuantity] = useState(
    product ? product.stock_quantity : 0
  );
  const [minStock, setMinStock] = useState(product?.min_stock || 5);
  const [unitType, setUnitType] = useState(product?.unit_type || "piece");
  const [oemCode, setOemCode] = useState(product?.oem_code || "");
  const [saving, setSaving] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const duplicate = useMemo(() => {
    const code = barcode.trim();
    if (!code) return false;
    return existingBarcodes.some(
      (b) => b === code && b !== product?.barcode
    );
  }, [barcode, existingBarcodes, product?.barcode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !barcode.trim()) return;
    if (duplicate) {
      alert("هذا الباركود مستخدم لصنف آخر");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        category_id: categoryId || defaultCat || crypto.randomUUID(),
        name: name.trim(),
        barcode: barcode.trim(),
        sku: sku.trim() || `SKU-${barcode.trim().slice(-6)}`,
        cost_price: Number(costPrice),
        retail_price: Number(retailPrice),
        wholesale_price:
          Number(wholesalePrice) || Number(retailPrice) * 0.85,
        stock_quantity: product ? product.stock_quantity : Number(stockQuantity),
        min_stock: Number(minStock),
        unit_type: unitType,
        track_stock: true,
        is_active: true,
        oem_code: oemCode || undefined,
        stock_version: product?.stock_version ?? 0,
        updated_at: new Date().toISOString(),
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
          <h3 className="font-bold text-ink">
            {product ? "تعديل بيانات صنف" : "إضافة صنف جديد"}
          </h3>
          <button type="button" onClick={onClose} className="rounded-full p-1">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          {!product && (
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-highlight px-3 py-3 text-sm font-bold text-white shadow-sm transition active:scale-[0.99]"
            >
              <Camera size={22} weight="duotone" />
              قراءة الباركود بالكاميرا
            </button>
          )}
          <div>
            <label className="text-xs font-bold text-ink">اسم الصنف *</label>
            <input
              type="text"
              required
              autoFocus={Boolean(initialBarcode || product)}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: زيت محرك 5W-30"
              className="mt-1 w-full rounded-xl border border-paper-line bg-paper px-3 py-2 text-xs font-bold"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-ink">التصنيف</label>
            <select
              className="mt-1 w-full rounded-xl border border-paper-line bg-paper px-3 py-2 text-xs"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              {!categories.length && <option value="">عام</option>}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-ink">الباركود *</label>
              <div className="mt-1 flex gap-1">
                <input
                  type="text"
                  required
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="w-full rounded-xl border border-paper-line bg-paper px-3 py-2 font-mono text-xs"
                  inputMode="numeric"
                />
                <button
                  type="button"
                  onClick={() => setShowScanner(true)}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-highlight text-white"
                  title="قراءة الباركود بالكاميرا"
                >
                  <Camera size={18} weight="duotone" />
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-ink">SKU</label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="mt-1 w-full rounded-xl border border-paper-line bg-paper px-3 py-2 font-mono text-xs"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              const next = generateEan13();
              setBarcode(next);
              if (!product) setSku(`SKU-${next.slice(-6)}`);
            }}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-highlight"
          >
            <MagicWand size={14} />
            توليد باركود EAN-13 داخلي
          </button>

          {duplicate && (
            <p className="rounded-xl bg-danger/10 px-3 py-2 text-[11px] font-bold text-danger">
              هذا الباركود مسجّل مسبقاً — غيّره أو عدّل الصنف الحالي
            </p>
          )}

          <BarcodeLabelCard code={barcode} productName={name} />

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs font-semibold text-ink">تكلفة</label>
              <input
                type="number"
                step="0.01"
                value={costPrice}
                onChange={(e) => setCostPrice(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-paper-line bg-paper px-3 py-2 font-mono text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink">تجزئة *</label>
              <input
                type="number"
                step="0.01"
                required
                value={retailPrice}
                onChange={(e) => setRetailPrice(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-paper-line bg-paper px-3 py-2 font-mono text-xs font-bold"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink">جملة</label>
              <input
                type="number"
                step="0.01"
                value={wholesalePrice}
                onChange={(e) => setWholesalePrice(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-paper-line bg-paper px-3 py-2 font-mono text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {!product && (
              <div>
                <label className="text-xs font-semibold text-ink">
                  رصيد افتتاح
                </label>
                <input
                  type="number"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-paper-line bg-paper px-3 py-2 font-mono text-xs"
                />
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-ink">حد أدنى</label>
              <input
                type="number"
                value={minStock}
                onChange={(e) => setMinStock(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-paper-line bg-paper px-3 py-2 font-mono text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink">الوحدة</label>
              <select
                value={unitType}
                onChange={(e) => setUnitType(e.target.value)}
                className="mt-1 w-full rounded-xl border border-paper-line bg-paper px-3 py-2 text-xs"
              >
                <option value="piece">قطعة</option>
                <option value="box">علبة</option>
                <option value="kilo">كيلو</option>
                <option value="liter">لتر</option>
              </select>
            </div>
          </div>

          {product && (
            <p className="rounded-xl bg-paper px-3 py-2 text-[11px] text-ink-mute">
              لتغيير الكمية استخدم <strong>جرد</strong> أو <strong>تسوية</strong> —
              لا تُعدَّل من نموذج البيانات.
            </p>
          )}

          <div>
            <label className="text-xs font-semibold text-ink">OEM (اختياري)</label>
            <input
              type="text"
              value={oemCode}
              onChange={(e) => setOemCode(e.target.value)}
              className="mt-1 w-full rounded-xl border border-paper-line bg-paper px-3 py-2 font-mono text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-paper-line pt-3">
            <button type="button" onClick={onClose} className="btn-ghost text-xs">
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving || duplicate}
              className="btn-primary inline-flex items-center gap-1.5 text-xs font-bold"
            >
              <Barcode size={16} />
              {saving ? "جاري الحفظ..." : "حفظ الصنف والباركود"}
            </button>
          </div>
        </form>
      </div>

      {showScanner && (
        <BarcodeScannerModal
          title="امسح باركود الصنف"
          onClose={() => setShowScanner(false)}
          onDetect={(code) => {
            setBarcode(code);
            if (!product) setSku(`SKU-${code.replace(/\D/g, "").slice(-6) || code.slice(-6)}`);
            setShowScanner(false);
          }}
        />
      )}
    </div>
  );
}
