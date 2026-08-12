import { describe, expect, it } from "vitest";
import { mapRemoteShift, mergeOpenShift } from "./shift-merge";
import type { Shift } from "./types";

const shift = (partial: Partial<Shift> & Pick<Shift, "id">): Shift => ({
  branch_id: "b1",
  cashier_id: "c1",
  opened_at: "2026-08-12T08:00:00.000Z",
  opening_float: 100,
  cash_sales: 0,
  card_sales: 0,
  debt_sales: 0,
  expected_cash: 100,
  status: "open",
  ...partial,
});

describe("mapRemoteShift", () => {
  it("normalizes numeric cash fields from a cloud row", () => {
    const mapped = mapRemoteShift({
      id: "s9",
      branch_id: "b1",
      cashier_id: "c2",
      opened_at: "2026-08-12T08:00:00.000Z",
      opening_float: "50",
      cash_sales: "10",
      expected_cash: "60",
      status: "open",
    });
    expect(mapped.opening_float).toBe(50);
    expect(mapped.cash_sales).toBe(10);
    expect(mapped.expected_cash).toBe(60);
  });
});

describe("mergeOpenShift", () => {
  it("adopts the first remote shift when local is closed", () => {
    const remote = shift({ id: "s1", expected_cash: 140 });
    expect(mergeOpenShift(null, [remote]).shift?.id).toBe("s1");
  });

  it("keeps local totals when they are ahead of the same remote shift", () => {
    const local = shift({ id: "s1", expected_cash: 200, cash_sales: 100 });
    const remote = shift({ id: "s1", expected_cash: 150, cash_sales: 50 });
    const merged = mergeOpenShift(local, [remote]);
    expect(merged.shift?.expected_cash).toBe(200);
    expect(merged.extraRemote).toBe(0);
  });

  it("takes remote totals when the same shift is ahead in the cloud", () => {
    const local = shift({ id: "s1", expected_cash: 120 });
    const remote = shift({ id: "s1", expected_cash: 180, cash_sales: 80 });
    expect(mergeOpenShift(local, [remote]).shift?.cash_sales).toBe(80);
  });

  it("keeps local and counts a foreign open shift", () => {
    const local = shift({ id: "mine", expected_cash: 110 });
    const other = shift({ id: "theirs", expected_cash: 90 });
    const merged = mergeOpenShift(local, [other]);
    expect(merged.shift?.id).toBe("mine");
    expect(merged.extraRemote).toBe(1);
  });
});
