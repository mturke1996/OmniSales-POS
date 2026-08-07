import type { CartLine, Product } from "./types";

export interface StockIssue {
  product_id: string;
  name: string;
  requested: number;
  available: number;
}

/** Aggregate cart qty per product (serialized lines included). */
export function cartDemandByProduct(lines: CartLine[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const line of lines) {
    map.set(line.product_id, (map.get(line.product_id) ?? 0) + line.quantity);
  }
  return map;
}

export function findStockIssues(
  lines: CartLine[],
  products: Product[]
): StockIssue[] {
  const demand = cartDemandByProduct(lines);
  const byId = new Map(products.map((p) => [p.id, p]));
  const issues: StockIssue[] = [];
  for (const [productId, qty] of demand) {
    const p = byId.get(productId);
    if (!p || !p.track_stock) continue;
    if (qty > p.stock_quantity + 1e-9) {
      issues.push({
        product_id: productId,
        name: p.name,
        requested: qty,
        available: p.stock_quantity,
      });
    }
  }
  return issues;
}

export function assertStockAvailable(
  lines: CartLine[],
  products: Product[]
): void {
  const issues = findStockIssues(lines, products);
  if (!issues.length) return;
  const detail = issues
    .map(
      (i) =>
        `«${i.name}»: المطلوب ${i.requested} · المتاح ${i.available}`
    )
    .join(" · ");
  throw new Error(`مخزون غير كافٍ — ${detail}`);
}

export function availableForProduct(
  product: Product,
  lines: CartLine[],
  excludeProductId?: string
): number {
  if (!product.track_stock) return Number.POSITIVE_INFINITY;
  const inCart =
    excludeProductId === product.id
      ? 0
      : cartDemandByProduct(lines).get(product.id) ?? 0;
  return Math.max(0, product.stock_quantity - inCart);
}
