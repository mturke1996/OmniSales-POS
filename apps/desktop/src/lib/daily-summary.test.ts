import { describe, expect, it } from "vitest";
import { buildDailySummaryTextLines, computeDailySummary } from "./daily-summary";
import type { BranchSettings, Order } from "./types";

const settings: BranchSettings = {
  branch_id: "b1",
  name: "محل",
  address: "",
  phone: "",
  currency: "LYD",
  currency_symbol: "د.ل",
  locale: "ar-LY",
  tax_rate: 0,
  industry: "general_retail",
  work_mode: "shift_based",
  pos_layout: "grid_cart",
  theme_key: "scout",
  walk_in_sales_enabled: true,
  thermal_width_mm: 80,
  order_prefix: "ORD",
  invoice_prefix: "INV",
  receipt_footer: "",
};

describe("computeDailySummary", () => {
  it("sums completed sales for today", () => {
    const today = new Date().toISOString();
    const orders: Order[] = [
      {
        id: "1",
        order_number: "O1",
        type: "pos_walk_in",
        status: "completed",
        items: [],
        subtotal: 100,
        tax_amount: 0,
        discount_amount: 0,
        total_amount: 100,
        payment_method: "cash",
        created_at: today,
      },
      {
        id: "2",
        order_number: "O2",
        type: "pos_walk_in",
        status: "cancelled",
        items: [],
        subtotal: 50,
        tax_amount: 0,
        discount_amount: 0,
        total_amount: 50,
        payment_method: "cash",
        created_at: today,
      },
    ];
    const summary = computeDailySummary({
      settings,
      orders,
      expenses: [],
      customers: [],
    });
    expect(summary.sales).toBe(100);
  });
});

describe("buildDailySummaryTextLines", () => {
  it("includes branch name and net", () => {
    const lines = buildDailySummaryTextLines({
      settings,
      orders: [],
      expenses: [],
      customers: [],
    });
    expect(lines.some((l) => l.includes("محل"))).toBe(true);
    expect(lines.some((l) => l.includes("صافي"))).toBe(true);
  });
});
