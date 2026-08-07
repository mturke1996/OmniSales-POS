import type { CartLine, Order } from "./types";

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Net amount paid for one unit of a line after distributing
 * order-level discount + tax proportionally across the cart.
 */
export function unitNetRefund(order: Order, lineIndex: number): number {
  const line = order.items[lineIndex];
  if (!line) return 0;
  return unitNetRefundFromParts(
    line,
    order.items,
    order.discount_amount || 0,
    order.tax_amount || 0,
    order.delivery_fee || 0,
    order.total_amount
  );
}

export function unitNetRefundFromParts(
  line: CartLine,
  allLines: CartLine[],
  discountAmount: number,
  taxAmount: number,
  deliveryFee: number,
  totalAmount: number
): number {
  const lineGross = line.unit_price * line.quantity;
  const cartGross = allLines.reduce(
    (s, l) => s + l.unit_price * l.quantity,
    0
  );
  if (cartGross <= 0 || line.quantity <= 0) return 0;

  const share = lineGross / cartGross;
  const lineDiscount = (discountAmount || 0) * share;
  const lineTax = (taxAmount || 0) * share;
  // Delivery fee is not refunded per unit of goods
  void deliveryFee;
  void totalAmount;
  const lineNet = lineGross - lineDiscount + lineTax;
  return round2(lineNet / line.quantity);
}

export function refundForQty(order: Order, lineIndex: number, qty: number): number {
  return round2(unitNetRefund(order, lineIndex) * qty);
}
