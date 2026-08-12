import { describe, expect, it } from "vitest";
import { parseAppUrl } from "./app-url";

describe("parseAppUrl", () => {
  it("defaults to dashboard", () => {
    expect(parseAppUrl("").tab).toBe("dashboard");
  });

  it("reads tab and focus params", () => {
    const state = parseAppUrl("?tab=invoices&invoice=o1&customer=c1");
    expect(state.tab).toBe("invoices");
    expect(state.invoiceId).toBe("o1");
    expect(state.customerId).toBe("c1");
  });

  it("reads orders and returns focus", () => {
    const orders = parseAppUrl("?tab=orders&order=o2");
    expect(orders.tab).toBe("orders");
    expect(orders.orderId).toBe("o2");

    const returns = parseAppUrl("?tab=returns&return=o3");
    expect(returns.tab).toBe("returns");
    expect(returns.returnOrderId).toBe("o3");
  });

  it("reads purchases, suppliers, and inventory query", () => {
    const state = parseAppUrl("?tab=purchases&purchase=pu1&supplier=s1");
    expect(state.tab).toBe("purchases");
    expect(state.purchaseId).toBe("pu1");
    expect(state.supplierId).toBe("s1");

    const inv = parseAppUrl("?tab=inventory&q=زيت");
    expect(inv.tab).toBe("inventory");
    expect(inv.inventoryQuery).toBe("زيت");
  });

  it("ignores invalid tab", () => {
    expect(parseAppUrl("?tab=invalid").tab).toBe("dashboard");
  });
});
