import { useMemo, useState, type ReactElement } from "react";
import {
  Plus,
  MagnifyingGlass,
  WarningCircle,
  PencilSimple,
  X,
  Scales,
  ArrowsDownUp,
  Tag,
  ClockCounterClockwise,
  Camera,
} from "@phosphor-icons/react";
import {
  addProduct,
  updateProduct,
  countStock,
  adjustStock,
  addCategory,
} from "../../lib/api";
import { STOCK_REASON_AR } from "../../lib/stock-ledger";
import { cn } from "../../lib/cn";
import type {
  BranchSettings,
  Product,
  ProductCategory,
  StockMovement,
} from "../../lib/types";
import { MobileDataCard, MobileDataList } from "../ui/MobileDataList";
import { PageHeader } from "../layout/PageHeader";
import { PageContent } from "../layout/PageContent";
import { DataTable } from "../ui/DataTable";
import type { ColumnDef } from "@tanstack/react-table";
import { BarcodeScannerModal } from "../pos/BarcodeScannerModal";

type TabKey = "catalog" | "count" | "movements" | "categories";

interface InventoryScreenProps {
  products: Product[];
  categories: ProductCategory[];
  stockMovements: StockMovement[];
  settings: BranchSettings;
  onRefreshData: () => void;
  canManage?: boolean;
  actorId?: string;
}

export function InventoryScreen({
  products,
  categories,
  stockMovements,
  settings,
  onRefreshData,
  canManage = true,
  actorId,
}: InventoryScreenProps) {
  const [tab, setTab] = useState<TabKey>("catalog");
  const [query, setQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [countProduct, setCountProduct] = useState<Product | null>(null);
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);
  const [movementFilter, setMovementFilter] = useState<string>("");
  const [showScanner, setShowScanner] = useState(false);

  const categoryName = useMemo(() => {
    const map = new Map(categories.map((c) => [c.id, c.name]));
    return (id: string) => map.get(id) || "بدون تصنيف";
  }, [categories]);

  const lowStockItems = products.filter(
    (p) => p.track_stock && p.stock_quantity <= p.min_stock
  );

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.barcode.includes(query) ||
      p.sku.toLowerCase().includes(query) ||
      (p.oem_code && p.oem_code.toLowerCase().includes(query)) ||
      categoryName(p.category_id).includes(query)
  );

  const movements = useMemo(() => {
    const list = movementFilter
      ? stockMovements.filter((m) => m.product_id === movementFilter)
      : stockMovements;
    return list.slice(0, 80);
  }, [stockMovements, movementFilter]);

  const productName = useMemo(() => {
    const map = new Map(products.map((p) => [p.id, p.name]));
    return (id: string) => map.get(id) || id.slice(0, 8);
  }, [products]);

  const tabs: { id: TabKey; label: string; icon: ReactElement }[] = [
    { id: "catalog", label: "الأصناف", icon: <Tag size={14} /> },
    { id: "count", label: "الجرد", icon: <Scales size={14} /> },
    { id: "movements", label: "الحركات", icon: <ClockCounterClockwise size={14} /> },
    { id: "categories", label: "التصنيفات", icon: <ArrowsDownUp size={14} /> },
  ];

  const catalogColumns: ColumnDef<Product, unknown>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "المنتج",
        cell: ({ row }) => (
          <span className="font-bold text-ink">{row.original.name}</span>
        ),
      },
      {
        id: "category",
        header: "التصنيف",
        cell: ({ row }) => (
          <span className="text-ink-mute">{categoryName(row.original.category_id)}</span>
        ),
      },
      { accessorKey: "barcode", header: "الباركود" },
      {
        accessorKey: "retail_price",
        header: "البيع",
        cell: ({ row }) => (
          <span className="money-big font-bold">
            {row.original.retail_price.toFixed(2)} {settings.currency_symbol}
          </span>
        ),
      },
      {
        accessorKey: "stock_quantity",
        header: "المخزون",
        cell: ({ row }) => {
          const p = row.original;
          const isLow = p.track_stock && p.stock_quantity <= p.min_stock;
          return (
            <span
              className={cn(
                "font-mono font-bold",
                isLow && "rounded bg-danger/10 px-2 py-0.5 text-danger"
              )}
            >
              {p.stock_quantity} {p.unit_type}
            </span>
          );
        },
      },
      {
        id: "version",
        header: "إصدار",
        cell: ({ row }) => (
          <span className="font-mono text-ink-mute">v{row.original.stock_version ?? 0}</span>
        ),
      },
      ...(canManage
        ? [
            {
              id: "actions",
              header: "إجراءات",
              cell: ({ row }: { row: { original: Product } }) => {
                const prod = row.original;
                return (
                  <div className="inline-flex gap-1">
                    <button
                      type="button"
                      title="جرد"
                      onClick={() => setCountProduct(prod)}
                      className="rounded-lg p-1.5 text-ink-mute hover:bg-paper hover:text-ink"
                    >
                      <Scales size={16} />
                    </button>
                    <button
                      type="button"
                      title="تسوية"
                      onClick={() => setAdjustProduct(prod)}
                      className="rounded-lg p-1.5 text-ink-mute hover:bg-paper hover:text-ink"
                    >
                      <ArrowsDownUp size={16} />
                    </button>
                    <button
                      type="button"
                      title="تعديل"
                      onClick={() => {
                        setEditingProduct(prod);
                        setShowAddModal(true);
                      }}
                      className="rounded-lg p-1.5 text-ink-mute hover:bg-paper hover:text-ink"
                    >
                      <PencilSimple size={16} />
                    </button>
                  </div>
                );
              },
            } as ColumnDef<Product, unknown>,
          ]
        : []),
    ],
    [canManage, categoryName, settings.currency_symbol]
  );

  const movementColumns: ColumnDef<StockMovement, unknown>[] = useMemo(
    () => [
      {
        id: "product",
        header: "الصنف",
        cell: ({ row }) => (
          <span className="font-semibold text-ink">{productName(row.original.product_id)}</span>
        ),
      },
      {
        id: "reason",
        header: "السبب",
        cell: ({ row }) => STOCK_REASON_AR[row.original.reason] || row.original.reason,
      },
      {
        accessorKey: "delta",
        header: "التغيير",
        cell: ({ row }) => (
          <span
            className={cn(
              "font-mono font-bold",
              row.original.delta >= 0 ? "text-success" : "text-danger"
            )}
          >
            {row.original.delta >= 0 ? "+" : ""}
            {row.original.delta}
          </span>
        ),
      },
      {
        id: "qty",
        header: "قبل → بعد",
        cell: ({ row }) => (
          <span className="font-mono text-ink-mute">
            {row.original.qty_before} → {row.original.qty_after}
          </span>
        ),
      },
      {
        accessorKey: "created_at",
        header: "التاريخ",
        cell: ({ row }) =>
          new Date(row.original.created_at).toLocaleString("ar-LY"),
      },
    ],
    [productName]
  );

  return (
    <>
      <PageHeader
        title="المخزون والجرد"
        description="أصناف · جرد فعلي · تسوية · دفتر حركات · تصنيفات"
        breadcrumbs={[{ label: "OmniSales" }, { label: "المخزون" }]}
        actions={
          canManage && tab === "catalog" ? (
            <button
              type="button"
              onClick={() => {
                setEditingProduct(null);
                setShowAddModal(true);
              }}
              className="btn-primary inline-flex items-center gap-1.5 text-xs font-bold"
            >
              <Plus size={16} />
              إضافة صنف
            </button>
          ) : undefined
        }
      />
      <PageContent className="space-y-5">

      <div className="grid grid-cols-4 gap-1 rounded-2xl bg-paper p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "inline-flex items-center justify-center gap-1 rounded-xl py-2 text-[11px] font-bold transition",
              tab === t.id ? "bg-ink text-paper" : "text-ink-mute hover:text-ink"
            )}
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {lowStockItems.length > 0 && tab !== "categories" && (
        <div className="flex items-center gap-2 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          <WarningCircle size={18} className="shrink-0 text-amber-600" />
          <span>
            <span className="font-bold">نواقص: </span>
            {lowStockItems.length} أصناف عند أو تحت الحد الأدنى
          </span>
        </div>
      )}

      {(tab === "catalog" || tab === "count") && (
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <MagnifyingGlass
              size={18}
              className="absolute right-3.5 top-3 text-ink-mute"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث بالاسم، الباركود، SKU، التصنيف..."
              className="w-full rounded-full border border-paper-line bg-paper-raised py-2.5 pl-4 pr-10 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ink"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowScanner(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-paper-line bg-paper-raised text-ink transition active:scale-95"
            title="مسح باركود بالكاميرا"
          >
            <Camera size={18} weight="duotone" />
          </button>
        </div>
      )}

      {tab === "catalog" && (
        <>
          <MobileDataList empty={!filtered.length} emptyLabel="لا توجد منتجات">
            {filtered.map((prod) => {
              const isLow =
                prod.track_stock && prod.stock_quantity <= prod.min_stock;
              return (
                <MobileDataCard
                  key={prod.id}
                  title={prod.name}
                  subtitle={`${categoryName(prod.category_id)} · ${prod.barcode}`}
                  meta={
                    <>
                      <span className="font-mono font-bold">
                        {prod.retail_price.toFixed(2)}{" "}
                        {settings.currency_symbol}
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
                  actions={
                    canManage ? (
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => setCountProduct(prod)}
                          className="inline-flex min-h-9 items-center gap-1 rounded-full bg-paper px-3 py-1.5 text-[11px] font-bold"
                        >
                          <Scales size={14} /> جرد
                        </button>
                        <button
                          type="button"
                          onClick={() => setAdjustProduct(prod)}
                          className="inline-flex min-h-9 items-center gap-1 rounded-full bg-paper px-3 py-1.5 text-[11px] font-bold"
                        >
                          <ArrowsDownUp size={14} /> تسوية
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProduct(prod);
                            setShowAddModal(true);
                          }}
                          className="inline-flex min-h-9 items-center gap-1 rounded-full bg-paper px-3 py-1.5 text-[11px] font-bold"
                        >
                          <PencilSimple size={14} /> تعديل
                        </button>
                      </div>
                    ) : undefined
                  }
                />
              );
            })}
          </MobileDataList>

          <div className="hidden md:block">
            <DataTable
              data={filtered}
              columns={catalogColumns}
              emptyMessage="لا توجد منتجات"
            />
          </div>
        </>
      )}

      {tab === "count" && (
        <div className="space-y-3">
          <p className="text-xs text-ink-mute">
            اختر صنفاً وأدخل الكمية المعدودة فعلياً — النظام يحسب الفرق ويسجّل
            حركة جرد.
          </p>
          <MobileDataList empty={!filtered.length} emptyLabel="لا أصناف">
            {filtered.map((prod) => (
              <MobileDataCard
                key={prod.id}
                title={prod.name}
                subtitle={`نظامي: ${prod.stock_quantity} ${prod.unit_type}`}
                actions={
                  canManage ? (
                    <button
                      type="button"
                      className="btn-primary text-[11px] font-bold"
                      onClick={() => setCountProduct(prod)}
                    >
                      بدء الجرد
                    </button>
                  ) : undefined
                }
              />
            ))}
          </MobileDataList>
        </div>
      )}

      {tab === "movements" && (
        <div className="space-y-3">
          <select
            className="input w-full max-w-md text-xs"
            value={movementFilter}
            onChange={(e) => setMovementFilter(e.target.value)}
          >
            <option value="">كل الأصناف</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <MobileDataList empty={!movements.length} emptyLabel="لا حركات بعد">
            {movements.map((m) => (
              <MobileDataCard
                key={m.id}
                title={productName(m.product_id)}
                subtitle={`${STOCK_REASON_AR[m.reason] || m.reason}${
                  m.note ? ` · ${m.note}` : ""
                }`}
                meta={
                  <>
                    <span
                      className={cn(
                        "font-mono font-bold",
                        m.delta >= 0 ? "text-success" : "text-danger"
                      )}
                    >
                      {m.delta >= 0 ? "+" : ""}
                      {m.delta}
                    </span>
                    <span className="font-mono text-ink-mute">
                      {m.qty_before} → {m.qty_after}
                    </span>
                    <span className="text-[10px] text-ink-mute">
                      {new Date(m.created_at).toLocaleString("ar-LY")}
                    </span>
                  </>
                }
              />
            ))}
          </MobileDataList>
          <div className="hidden md:block">
            <DataTable
              data={movements}
              columns={movementColumns}
              emptyMessage="لا حركات بعد"
            />
          </div>
        </div>
      )}

      {tab === "categories" && (
        <CategoriesPanel
          categories={categories}
          canManage={canManage}
          onRefresh={onRefreshData}
        />
      )}

      {showAddModal && (
        <ProductFormModal
          product={editingProduct}
          categories={categories}
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

      {countProduct && (
        <CountModal
          product={countProduct}
          onClose={() => setCountProduct(null)}
          onSubmit={async (counted, note) => {
            await countStock({
              product_id: countProduct.id,
              counted_qty: counted,
              note,
              actor_id: actorId,
            });
            setCountProduct(null);
            onRefreshData();
          }}
        />
      )}

      {adjustProduct && (
        <AdjustModal
          product={adjustProduct}
          onClose={() => setAdjustProduct(null)}
          onSubmit={async (delta, reason, note) => {
            await adjustStock({
              product_id: adjustProduct.id,
              delta,
              reason,
              note,
              actor_id: actorId,
            });
          }}
        />
      )}

      {showScanner && (
        <BarcodeScannerModal
          onClose={() => setShowScanner(false)}
          onDetect={(code) => {
            setQuery(code);
            setShowScanner(false);
          }}
        />
      )}
      </PageContent>
    </>
  );
}

function CategoriesPanel({
  categories,
  canManage,
  onRefresh,
}: {
  categories: ProductCategory[];
  canManage: boolean;
  onRefresh: () => void;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="space-y-4">
      {canManage && (
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setBusy(true);
            void addCategory(name)
              .then(() => {
                setName("");
                onRefresh();
              })
              .catch((err) =>
                alert(err instanceof Error ? err.message : "فشل")
              )
              .finally(() => setBusy(false));
          }}
        >
          <input
            className="input min-w-[12rem] flex-1 text-xs"
            placeholder="اسم تصنيف جديد"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={busy}
            className="btn-primary text-xs font-bold"
          >
            إضافة تصنيف
          </button>
        </form>
      )}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => (
          <div
            key={c.id}
            className="rounded-2xl border border-paper-line bg-paper-raised px-4 py-3"
          >
            <p className="text-sm font-bold text-ink">{c.name}</p>
            <p className="mt-0.5 font-mono text-[10px] text-ink-mute">
              {c.id.slice(0, 8)}
            </p>
          </div>
        ))}
        {!categories.length && (
          <p className="text-xs text-ink-mute">لا تصنيفات بعد</p>
        )}
      </div>
    </div>
  );
}

function CountModal({
  product,
  onClose,
  onSubmit,
}: {
  product: Product;
  onClose: () => void;
  onSubmit: (counted: number, note?: string) => Promise<void>;
}) {
  const [counted, setCounted] = useState(String(product.stock_quantity));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const delta =
    Math.round((Number(counted) - product.stock_quantity) * 1000) / 1000;

  return (
    <div className="app-modal-backdrop">
      <div className="app-modal-panel">
        <div className="flex items-center justify-between border-b border-paper-line pb-3">
          <h3 className="font-bold text-ink">جرد · {product.name}</h3>
          <button type="button" onClick={onClose} className="rounded-full p-1">
            <X size={18} />
          </button>
        </div>
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setBusy(true);
            void onSubmit(Number(counted), note || undefined)
              .catch((err) =>
                alert(err instanceof Error ? err.message : "فشل الجرد")
              )
              .finally(() => setBusy(false));
          }}
        >
          <p className="text-xs text-ink-mute">
            الكمية النظامية:{" "}
            <span className="font-mono font-bold text-ink">
              {product.stock_quantity}
            </span>
          </p>
          <label className="block space-y-1">
            <span className="text-xs font-bold">الكمية المعدودة *</span>
            <input
              type="number"
              step="0.001"
              min={0}
              required
              className="input w-full font-mono"
              value={counted}
              onChange={(e) => setCounted(e.target.value)}
              autoFocus
            />
          </label>
          <p
            className={cn(
              "text-xs font-bold",
              delta === 0
                ? "text-ink-mute"
                : delta > 0
                  ? "text-success"
                  : "text-danger"
            )}
          >
            الفرق: {delta >= 0 ? "+" : ""}
            {delta}
          </p>
          <input
            className="input w-full text-xs"
            placeholder="ملاحظة (اختياري)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex justify-end gap-2 border-t border-paper-line pt-3">
            <button type="button" className="btn-ghost text-xs" onClick={onClose}>
              إلغاء
            </button>
            <button
              type="submit"
              disabled={busy || !Number.isFinite(Number(counted))}
              className="btn-primary text-xs font-bold"
            >
              حفظ الجرد
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AdjustModal({
  product,
  onClose,
  onSubmit,
}: {
  product: Product;
  onClose: () => void;
  onSubmit: (
    delta: number,
    reason: "adjustment" | "damage" | "opening",
    note?: string
  ) => Promise<void>;
}) {
  const [delta, setDelta] = useState("1");
  const [reason, setReason] = useState<"adjustment" | "damage" | "opening">(
    "adjustment"
  );
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="app-modal-backdrop">
      <div className="app-modal-panel">
        <div className="flex items-center justify-between border-b border-paper-line pb-3">
          <h3 className="font-bold text-ink">تسوية · {product.name}</h3>
          <button type="button" onClick={onClose} className="rounded-full p-1">
            <X size={18} />
          </button>
        </div>
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const d = Number(delta);
            if (!d) {
              alert("أدخل فرق كمية غير صفر");
              return;
            }
            setBusy(true);
            void onSubmit(d, reason, note || undefined)
              .catch((err) =>
                alert(err instanceof Error ? err.message : "فشل التسوية")
              )
              .finally(() => setBusy(false));
          }}
        >
          <p className="text-xs text-ink-mute">
            الحالي:{" "}
            <span className="font-mono font-bold text-ink">
              {product.stock_quantity}
            </span>
          </p>
          <label className="block space-y-1">
            <span className="text-xs font-bold">الفرق (+ إضافة / − خصم)</span>
            <input
              type="number"
              step="0.001"
              required
              className="input w-full font-mono"
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
            />
          </label>
          <select
            className="input w-full text-xs"
            value={reason}
            onChange={(e) =>
              setReason(e.target.value as "adjustment" | "damage" | "opening")
            }
          >
            <option value="adjustment">تسوية يدوية</option>
            <option value="damage">تالف / هالك</option>
            <option value="opening">رصيد افتتاح</option>
          </select>
          <input
            className="input w-full text-xs"
            placeholder="سبب التسوية"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex justify-end gap-2 border-t border-paper-line pt-3">
            <button type="button" className="btn-ghost text-xs" onClick={onClose}>
              إلغاء
            </button>
            <button
              type="submit"
              disabled={busy}
              className="btn-primary text-xs font-bold"
            >
              تطبيق التسوية
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProductFormModal({
  product,
  categories,
  onClose,
  onSave,
}: {
  product: Product | null;
  categories: ProductCategory[];
  onClose: () => void;
  onSave: (data: Omit<Product, "id" | "branch_id">) => Promise<void>;
}) {
  const defaultCat = categories[0]?.id || "";
  const [name, setName] = useState(product?.name || "");
  const [barcode, setBarcode] = useState(
    product?.barcode || `${Math.floor(10000000 + Math.random() * 90000000)}`
  );
  const [sku, setSku] = useState(
    product?.sku || `SKU-${Math.floor(100 + Math.random() * 900)}`
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !barcode) return;
    setSaving(true);
    try {
      await onSave({
        category_id: categoryId || defaultCat || crypto.randomUUID(),
        name,
        barcode,
        sku,
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
          <div>
            <label className="text-xs font-bold text-ink">اسم الصنف *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
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
              <input
                type="text"
                required
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="mt-1 w-full rounded-xl border border-paper-line bg-paper px-3 py-2 font-mono text-xs"
              />
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
              disabled={saving}
              className="btn-primary text-xs font-bold"
            >
              {saving ? "جاري الحفظ..." : "حفظ"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
