import { describe, expect, it } from "vitest";
import { toWhatsAppE164, buildDailyOwnerSummary } from "./whatsapp";

describe("toWhatsAppE164", () => {
  it("normalizes Libyan 09 mobiles", () => {
    expect(toWhatsAppE164("0912345678")).toBe("218912345678");
  });

  it("keeps international", () => {
    expect(toWhatsAppE164("+218912345678")).toBe("218912345678");
  });
});

describe("buildDailyOwnerSummary", () => {
  it("includes key metrics", () => {
    const msg = buildDailyOwnerSummary({
      branchName: "فرع 1",
      sales: 100,
      expenses: 20,
      debts: 50,
      symbol: "د.ل",
      deliveryOpen: 2,
    });
    expect(msg).toContain("فرع 1");
    expect(msg).toContain("100.00");
    expect(msg).toContain("2");
  });
});
