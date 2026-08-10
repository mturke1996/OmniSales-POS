import { useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Plus, Image as ImageIcon } from "@phosphor-icons/react";
import { cn } from "../../lib/cn";
import { formatMoney } from "../../lib/format";
import type { PosLayout, Product, ProductCategory } from "../../lib/types";

function columnsFor(layout: PosLayout, width: number) {
  if (layout === "list_barcode") return 1;
  if (layout === "compact_split") {
    if (width < 480) return 2;
    if (width < 900) return 3;
    if (width < 1280) return 4;
    return 5;
  }
  if (layout === "touch_tiles") {
    if (width < 380) return 2;
    if (width < 520) return 3;
    if (width < 900) return 3;
    return 4;
  }
  if (width < 480) return 2;
  if (width < 640) return 2;
  if (width < 900) return 3;
  if (width < 1200) return 4;
  if (width < 1600) return 5;
  return 6;
}

const FALLBACK_CATEGORY_LABELS: Record<string, string> = {
  chocolate: "شوكولاتة",
  gifts: "هدايا",
  electronics: "إلكترونيات",
  spare_parts: "قطع غيار",
  grocery: "مواد غذائية",
  cat_1: "عام",
};

export function ProductGrid({
  products,
  categories = [],
  layout,
  currencySymbol,
  onAdd,
  disabled = false,
  phoneLayout = false,
  pinnedIds,
  onTogglePin,
}: {
  products: Product[];
  categories?: ProductCategory[];
  layout: PosLayout;
  currencySymbol: string;
  onAdd: (p: Product) => void;
  disabled?: boolean;
  phoneLayout?: boolean;
  pinnedIds?: Set<string>;
  onTogglePin?: (p: Product) => void;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width;
      if (next) setWidth(next);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of categories) map.set(c.id, c.name);
    return map;
  }, [categories]);

  const categoryIds = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category_id) set.add(p.category_id);
    });
    // Prefer catalog order when available
    const ordered = categories
      .slice()
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((c) => c.id)
      .filter((id) => set.has(id));
    for (const id of set) {
      if (!ordered.includes(id)) ordered.push(id);
    }
    return ordered;
  }, [products, categories]);

  const filteredProducts = useMemo(() => {
    if (activeCategory === "all") return products;
    return products.filter((p) => p.category_id === activeCategory);
  }, [products, activeCategory]);

  function labelFor(catId: string) {
    return (
      categoryNameById.get(catId) ||
      FALLBACK_CATEGORY_LABELS[catId] ||
      catId
    );
  }

  const cols = columnsFor(layout, width);
  const isMobile = phoneLayout || width < 640;
  const showImages = layout !== "list_barcode";
  const rowHeight =
    layout === "touch_tiles"
      ? showImages
        ? isMobile ? 148 : 240
        : 135
      : layout === "list_barcode"
        ? 72
        : showImages
          ? isMobile ? 148 : 220
          : 115;

  const rows = useMemo(() => {
    const out: Product[][] = [];
    for (let i = 0; i < filteredProducts.length; i += cols) {
      out.push(filteredProducts.slice(i, i + cols));
    }
    return out;
  }, [filteredProducts, cols]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight + 12,
    overscan: 6,
  });

  return (
    <div className="mt-3 flex min-h-0 flex-1 flex-col">
      {categoryIds.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
          <CategoryChip
            active={activeCategory === "all"}
            onClick={() => setActiveCategory("all")}
            label={`الكل (${products.length})`}
          />
          {categoryIds.map((cat) => {
            const count = products.filter((p) => p.category_id === cat).length;
            return (
              <CategoryChip
                key={cat}
                active={activeCategory === cat}
                onClick={() => setActiveCategory(cat)}
                label={`${labelFor(cat)} (${count})`}
              />
            );
          })}
        </div>
      )}

      <div
        ref={parentRef}
        className="mt-2 min-h-0 flex-1 overflow-y-auto overscroll-contain pe-1"
        style={{ contain: "strict" }}
      >
        {!filteredProducts.length ? (
          <div className="rounded-xl border border-dashed border-ink/[0.12] px-4 py-14 text-center text-sm text-ink-mute">
            لا توجد منتجات مطابقة في هذا القسم.
          </div>
        ) : (
          <div
            style={{
              height: virtualizer.getTotalSize(),
              width: "100%",
              position: "relative",
            }}
          >
            {virtualizer.getVirtualItems().map((vRow) => {
              const row = rows[vRow.index] ?? [];
              return (
                <div
                  key={vRow.key}
                  className={cn(
                    "absolute start-0 top-0 grid w-full gap-3",
                    cols === 1 && "grid-cols-1",
                    cols === 2 && "grid-cols-2",
                    cols === 3 && "grid-cols-3",
                    cols === 4 && "grid-cols-4",
                    cols === 5 && "grid-cols-5",
                    cols === 6 && "grid-cols-6"
                  )}
                  style={{
                    height: vRow.size,
                    transform: `translateY(${vRow.start}px)`,
                  }}
                >
                  {row.map((p, idx) =>
                    layout === "list_barcode" ? (
                      <ListProductRow
                        key={p.id}
                        product={p}
                        currencySymbol={currencySymbol}
                        onAdd={onAdd}
                        disabled={disabled}
                      />
                    ) : (
                      <ProductTile
                        key={p.id}
                        product={p}
                        currencySymbol={currencySymbol}
                        onAdd={onAdd}
                        tall={layout === "touch_tiles"}
                        isMobile={isMobile}
                        disabled={disabled}
                        pinned={pinnedIds?.has(p.id)}
                        onTogglePin={onTogglePin}
                        shortcut={
                          vRow.index === 0 && idx < 9 ? idx + 1 : undefined
                        }
                      />
                    )
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function CategoryChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition duration-200 ease-spring active:scale-[0.98]",
        active
          ? "bg-highlight text-white shadow-soft"
          : "bg-paper-raised text-ink-soft shadow-soft hover:bg-highlight/10"
      )}
    >
      {label}
    </button>
  );
}

function ProductTile({
  product,
  currencySymbol,
  onAdd,
  tall,
  isMobile,
  shortcut,
  disabled = false,
  pinned,
  onTogglePin,
}: {
  product: Product;
  currencySymbol: string;
  onAdd: (p: Product) => void;
  tall?: boolean;
  isMobile?: boolean;
  shortcut?: number;
  disabled?: boolean;
  pinned?: boolean;
  onTogglePin?: (p: Product) => void;
}) {
  const longPressRef = useRef<number | null>(null);

  const low =
    product.track_stock && product.stock_quantity <= product.min_stock;
  const locked = disabled || !product.is_active;

  function clearLongPress() {
    if (longPressRef.current != null) {
      window.clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  }

  return (
    <button
      type="button"
      onClick={() => onAdd(product)}
      disabled={locked}
      onContextMenu={(e) => {
        if (!onTogglePin) return;
        e.preventDefault();
        onTogglePin(product);
      }}
      onTouchStart={() => {
        if (!onTogglePin) return;
        clearLongPress();
        longPressRef.current = window.setTimeout(() => onTogglePin(product), 550);
      }}
      onTouchEnd={clearLongPress}
      onTouchMove={clearLongPress}
      className={cn(
        "bonbon-tile group flex flex-col overflow-hidden transition active:scale-[0.97]",
        isMobile ? "!p-2 rounded-2xl min-h-[8.5rem]" : "",
        locked && "pointer-events-none opacity-45",
        tall && !isMobile && "min-h-[12rem]",
        pinned && "ring-2 ring-warning/50"
      )}
    >
      <div className={cn("relative overflow-hidden", isMobile ? "-mx-2 -mt-2 mb-1.5 rounded-t-xl" : "-mx-1 -mt-1 mb-2.5 rounded-t-[0.65rem]")}>
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className={cn(
              "w-full object-cover",
              isMobile ? "h-20" : tall ? "h-40" : "h-32"
            )}
            loading="lazy"
          />
        ) : (
          <div
            className={cn(
              "flex w-full items-center justify-center bg-accent-mute",
              isMobile ? "h-20" : tall ? "h-40" : "h-32"
            )}
          >
            <ImageIcon size={isMobile ? 22 : 28} className="text-ink-mute/50" weight="duotone" />
          </div>
        )}

        {shortcut && !isMobile ? (
          <span className="pos-key-badge absolute bottom-2 start-2 bg-paper-raised/90 backdrop-blur-sm">
            {shortcut}
          </span>
        ) : null}

        {low && (
          <span className="absolute top-1.5 end-1.5 rounded-md bg-danger/90 px-1 py-0.5 text-[9px] font-bold text-white">
            منخفض
          </span>
        )}
        {pinned && (
          <span className="absolute top-1.5 start-1.5 rounded-md bg-warning/90 px-1 py-0.5 text-[9px] font-bold text-white">
            ★
          </span>
        )}
      </div>

      <p className={cn("px-0.5 leading-tight text-ink font-semibold", isMobile ? "line-clamp-2 text-[11px] font-bold" : "line-clamp-2 min-h-[2.4rem] text-sm")}>
        {product.name}
      </p>
      {isMobile ? (
        product.track_stock && (
          <p className="mt-0.5 px-0.5 text-[9px] font-semibold text-ink-mute">
            مخزون: {product.stock_quantity}
          </p>
        )
      ) : (
        <p className="mt-0.5 truncate px-0.5 font-mono text-[10px] text-ink-mute">
          {product.sku || product.barcode}
        </p>
      )}

      <div className={cn("mt-auto flex items-end justify-between gap-1 px-0.5", isMobile ? "pt-1" : "pt-2.5")}>
        <span className={cn("money-big font-bold text-ink", isMobile ? "text-xs font-mono" : "text-sm")}>
          {formatMoney(product.retail_price, currencySymbol)}
        </span>
        <span className={cn("grid place-items-center rounded-full border border-ink/[0.08] bg-paper text-ink transition group-hover:border-highlight/40 group-hover:bg-highlight-soft", isMobile ? "h-7 w-7" : "h-7 w-7")}>
          <Plus size={isMobile ? 12 : 12} weight="bold" />
        </span>
      </div>
    </button>
  );
}

function ListProductRow({
  product,
  currencySymbol,
  onAdd,
  disabled = false,
}: {
  product: Product;
  currencySymbol: string;
  onAdd: (p: Product) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onAdd(product)}
      disabled={disabled || !product.is_active}
      className={cn(
        "bonbon-tile flex items-center justify-between gap-3 !p-3",
        (disabled || !product.is_active) && "pointer-events-none opacity-45"
      )}
    >
      <div className="min-w-0 text-start">
        <p className="truncate text-sm font-semibold text-ink">{product.name}</p>
        <p className="mt-0.5 font-mono text-[11px] text-ink-mute">
          {product.barcode} · {product.sku}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="money-big text-sm font-bold">
          {formatMoney(product.retail_price, currencySymbol)}
        </span>
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-ink text-accent-invert">
          <Plus size={14} weight="bold" />
        </span>
      </div>
    </button>
  );
}
