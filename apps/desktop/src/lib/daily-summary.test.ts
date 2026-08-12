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
    expect(summary.returns).toBe(0);
    expect(summary.net).toBe(100);
  });

  it("subtracts returns from net and tracks purchases", () => {
    const today = new Date().toISOString();
    const summary = computeDailySummary({
      settings,
      orders: [
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
      ],
      expenses: [{ id: "e1", category: "كهرباء", amount: 10, note: "", created_at: today }],
      customers: [],
      returns: [
        {
          id: "r1",
          return_number: "RET-1",
          order_id: "1",
          order_number: "O1",
          refund_method: "cash",
          total_refund: 20,
          created_at: today,
          items: [],
        },
      ],
      purchases: [
        {
          id: "pu1",
          purchase_number: "PO-1",
          supplier_id: "s1",
          supplier_name: "مورد",
          items: [],
          total_cost: 30,
          status: "received",
          created_at: today,
          received_at: today,
        },
      ],
    });
    expect(summary.sales).toBe(100);
    expect(summary.returns).toBe(20);
    expect(summary.netSales).toBe(80);
    expect(summary.expenses).toBe(10);
    expect(summary.net).toBe(70);
    expect(summary.purchases).toBe(30);
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
    expect(lines.some((l) => l.includes("مرتجعات"))).toBe(true);
    expect(lines.some((l) => l.includes("نواقص"))).toBe(true);
  });
});
