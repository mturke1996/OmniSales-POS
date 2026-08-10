import type { Order, Product, ReturnRecord } from "./types";
import {
  getAutoPinnedProductIds,
  getDisplayPinnedProductIds,
  setAutoPinnedProductIds,
} from "./pos-product-memory";
import { topSellerProductIds } from "./pos-top-sellers";

const DEFAULT_AUTO_PIN_LIMIT = 4;

/** Merge top sellers into auto-pinned storage; returns merged display ids. */
export function syncAutoPinnedTopSellers(
  orders: Order[],
  returns: ReturnRecord[],
  products: Product[],
  limit = DEFAULT_AUTO_PIN_LIMIT
): string[] {
  const nextAuto = topSellerProductIds(orders, returns, products, limit);
  const prevAuto = getAutoPinnedProductIds();
  if (prevAuto.join("\0") === nextAuto.join("\0")) {
    return getDisplayPinnedProductIds();
  }
  setAutoPinnedProductIds(nextAuto);
  return getDisplayPinnedProductIds();
}
