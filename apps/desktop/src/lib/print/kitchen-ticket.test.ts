import { describe, expect, it } from "vitest";
import {
  buildKitchenTicketTextLines,
  isKitchenTicketOrder,
} from "./kitchen-ticket";
import { shouldAttemptEscpos } from "./print-routing";
import type { BranchSettings, Order } from "../types";

const settings: BranchSettings = {
  branch_id: "b1",
  name: "مطعم",
  address: "",
  phone: "",
  currency: "LYD",
  currency_symbol: "د.ل",
  locale: "ar-LY",
  tax_rate: 0,
  industry: "food_service",
  work_mode: "shift_based",
  pos_layout: "touch_tiles",
  theme_key: "scout",
  walk_in_sales_enabled: true,
  thermal_width_mm: 80,
  order_prefix: "ORD",
  invoice_prefix: "INV",
  receipt_footer: "",
};

const deliveryOrder: Order = {
  id: "1",
  order_number: "ORD-100",
  type: "delivery",
  status: "in_prep",
  customer_name: "أحمد",
  customer_phone: "0910000000",
  delivery_address: "طرابلس",
  items: [
    { product_id: "p1", name: "برجر", unit_price: 15, quantity: 2, unit_type: "pc" },
  ],
  subtotal: 30,
  tax_amount: 0,
  discount_amount: 0,
  total_amount: 30,
  payment_method: "cash",
  created_at: new Date().toISOString(),
};

describe("isKitchenTicketOrder", () => {
  it("accepts delivery and special_event", () => {
    expect(isKitchenTicketOrder(deliveryOrder)).toBe(true);
    expect(
      isKitchenTicketOrder({ ...deliveryOrder, type: "special_event" })
    ).toBe(true);
  });

  it("rejects walk-in", () => {
    expect(
      isKitchenTicketOrder({ ...deliveryOrder, type: "pos_walk_in" })
    ).toBe(false);
  });
});

describe("buildKitchenTicketTextLines", () => {
  it("includes order number and items with qty", () => {
    const lines = buildKitchenTicketTextLines(deliveryOrder, settings);
    expect(lines.some((l) => l.includes("ORD-100"))).toBe(true);
    expect(lines.some((l) => l.includes("2×") && l.includes("برجر"))).toBe(true);
    expect(lines.some((l) => l.includes("طرابلس"))).toBe(true);
  });
});

describe("shouldAttemptEscpos", () => {
  it("forces escpos mode", () => {
    expect(shouldAttemptEscpos("escpos")).toBe(true);
  });

  it("skips escpos for html mode", () => {
    expect(shouldAttemptEscpos("html")).toBe(false);
  });
});
