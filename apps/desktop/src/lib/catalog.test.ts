import { describe, expect, it } from "vitest";
import { filterCatalog, findExactCatalogMatch } from "./catalog";
import type { Product } from "./types";

const products: Product[] = [
  {
    id: "1",
    branch_id: "b",
    category_id: "c",
    sku: "SKU-1",
    barcode: "6291001001",
    name: "شوكولاتة فاخرة",
    cost_price: 1,
    retail_price: 2,
    wholesale_price: 1.5,
    unit_type: "piece",
    track_stock: true,
    stock_quantity: 1,
    min_stock: 0,
    is_active: true,
  },
  {
    id: "2",
    branch_id: "b",
    category_id: "c",
    sku: "SKU-2",
    barcode: "6291001002",
    name: "قهوة عربية",
    cost_price: 1,
    retail_price: 2,
    wholesale_price: 1.5,
    unit_type: "piece",
    track_stock: true,
    stock_quantity: 1,
    min_stock: 0,
    is_active: true,
  },
];

describe("catalog scan", () => {
  it("prefers exact barcode", () => {
    expect(findExactCatalogMatch(products, "6291001001")?.id).toBe("1");
  });

  it("does not guess on partial barcode", () => {
    expect(findExactCatalogMatch(products, "6291")).toBeNull();
    expect(filterCatalog(products, "6291")).toHaveLength(2);
  });
});
