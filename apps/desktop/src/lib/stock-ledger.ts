import type { Product, StockMovement, StockMovementReason } from "./types";

const roundQty = (n: number) => Math.round(n * 1000) / 1000;

export const STOCK_REASON_AR: Record<StockMovementReason, string> = {
  sale: "بيع",
  return: "مرتجع",
  purchase: "شراء / استلام",
  adjustment: "تسوية يدوية",
  count: "جرد فعلي",
  opening: "رصيد افتتاح",
  damage: "تالف / هالك",
  transfer_in: "تحويل وارد",
  transfer_out: "تحويل صادر",
};

export interface ApplyStockInput {
  product: Product;
  delta: number;
  reason: StockMovementReason;
  branch_id: string;
  reference_type?: string;
  reference_id?: string;
  note?: string;
  actor_id?: string;
  /** When true, allow resulting qty < 0 (normally blocked). */
  allowNegative?: boolean;
  at?: string;
}

export interface ApplyStockResult {
  product: Product;
  movement: StockMovement;
}

/** Pure apply: returns next product + movement without I/O. */
export function applyStockDelta(input: ApplyStockInput): ApplyStockResult {
  const { product, reason, branch_id } = input;
  const delta = roundQty(input.delta);
  if (!Number.isFinite(delta) || delta === 0) {
    throw new Error("قيمة حركة المخزون غير صالحة");
  }
  if (!product.track_stock) {
    throw new Error(`الصنف «${product.name}» لا يتتبع المخزون`);
  }

  const qty_before = roundQty(product.stock_quantity);
  const qty_after = roundQty(qty_before + delta);
  if (!input.allowNegative && qty_after < -1e-9) {
    throw new Error(
      `مخزون غير كافٍ لـ «${product.name}» (المتوفر ${qty_before} · المطلوب ${Math.abs(delta)})`
    );
  }

  const now = input.at || new Date().toISOString();
  const nextVersion = (product.stock_version ?? 0) + 1;
  const nextProduct: Product = {
    ...product,
    stock_quantity: input.allowNegative ? qty_after : Math.max(0, qty_after),
    stock_version: nextVersion,
    updated_at: now,
  };

  const movement: StockMovement = {
    id: crypto.randomUUID(),
    product_id: product.id,
    branch_id,
    reason,
    delta,
    qty_before,
    qty_after: nextProduct.stock_quantity,
    reference_type: input.reference_type,
    reference_id: input.reference_id,
    note: input.note,
    actor_id: input.actor_id,
    created_at: now,
  };

  return { product: nextProduct, movement };
}

/** Count sheet → delta vs system qty. */
export function countDelta(systemQty: number, countedQty: number): number {
  return roundQty(countedQty - systemQty);
}

/**
 * Merge local/remote product favoring higher stock_version for quantity,
 * and newer updated_at for catalog fields.
 */
export function mergeProductInventory(
  local: Product,
  remote: Product
): Product {
  const localVer = local.stock_version ?? 0;
  const remoteVer = remote.stock_version ?? 0;
  const localUpdated = Date.parse(local.updated_at || "") || 0;
  const remoteUpdated = Date.parse(remote.updated_at || "") || 0;

  const base = remoteUpdated >= localUpdated ? { ...local, ...remote } : { ...remote, ...local };

  if (remoteVer > localVer) {
    return {
      ...base,
      stock_quantity: remote.stock_quantity,
      stock_version: remoteVer,
      updated_at: remote.updated_at || base.updated_at,
    };
  }
  if (localVer > remoteVer) {
    return {
      ...base,
      stock_quantity: local.stock_quantity,
      stock_version: localVer,
      updated_at: local.updated_at || base.updated_at,
    };
  }
  // Same version — keep local qty (device may have pending outbox)
  return {
    ...base,
    stock_quantity: local.stock_quantity,
    stock_version: localVer,
    updated_at: local.updated_at || remote.updated_at || base.updated_at,
  };
}
