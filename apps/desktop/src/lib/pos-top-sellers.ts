import type { Order, Product, ReturnRecord } from "./types";
import { computeAnalytics } from "./analytics";

/** Top-selling product ids for POS quick-add strip (last 7 days). */
export function topSellerProductIds(
  orders: Order[],
  returns: ReturnRecord[],
  products: Product[],
  limit = 8
): string[] {
  if (!orders.length) return [];
  const snap = computeAnalytics({
    orders,
    returns,
    products,
    customers: [],
    expenses: [],
    period: "7d",
  });
  return snap.topProducts.slice(0, limit).map((row) => row.product_id);
}
