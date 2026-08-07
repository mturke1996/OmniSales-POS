import type { Product } from "./types";

/** Exact barcode / SKU / OEM hit — preferred for scanner Enter. */
export function findExactCatalogMatch(
  products: Product[],
  rawQuery: string
): Product | null {
  const q = rawQuery.trim();
  if (!q) return null;
  const lower = q.toLowerCase();
  const byBarcode = products.find((p) => p.barcode && p.barcode === q);
  if (byBarcode) return byBarcode;
  const bySku = products.find((p) => p.sku && p.sku.toLowerCase() === lower);
  if (bySku) return bySku;
  const byOem = products.find(
    (p) => p.oem_code && p.oem_code.toLowerCase() === lower
  );
  if (byOem) return byOem;
  return null;
}

export function filterCatalog(products: Product[], rawQuery: string): Product[] {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return products;
  return products.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.barcode.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.oem_code != null && p.oem_code.toLowerCase().includes(q))
  );
}
