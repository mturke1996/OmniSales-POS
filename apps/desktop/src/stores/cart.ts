import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartLine, Product } from "../lib/types";

export type PriceMode = "retail" | "wholesale";

export type AddLineMeta = {
  qty?: number;
  imei?: string;
  serial?: string;
  note?: string;
  priceMode?: PriceMode;
};

interface CartState {
  lines: CartLine[];
  discount: number;
  priceMode: PriceMode;
  setPriceMode: (mode: PriceMode) => void;
  add: (product: Product, qtyOrMeta?: number | AddLineMeta) => void;
  setQty: (productId: string, qty: number, lineKey?: string) => void;
  remove: (productId: string, lineKey?: string) => void;
  setDiscount: (value: number) => void;
  clear: () => void;
}

function lineKeyOf(line: CartLine) {
  return `${line.product_id}|${line.imei || ""}|${line.serial || ""}`;
}

function unitPriceFor(product: Product, mode: PriceMode) {
  if (mode === "wholesale") {
    const w = Number(product.wholesale_price);
    if (Number.isFinite(w) && w > 0) return w;
  }
  return product.retail_price;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      discount: 0,
      priceMode: "retail",
      setPriceMode: (mode) => set({ priceMode: mode }),
      add: (product, qtyOrMeta = 1) => {
        const meta: AddLineMeta =
          typeof qtyOrMeta === "number" ? { qty: qtyOrMeta } : qtyOrMeta || {};
        const qty = meta.qty ?? 1;
        const imei = meta.imei?.trim() || undefined;
        const serial = meta.serial?.trim() || undefined;
        const mode = meta.priceMode ?? get().priceMode;
        const unit_price = unitPriceFor(product, mode);

        // Serialized / IMEI units never merge — each is a unique line
        if (imei || serial) {
          const lines = [...get().lines];
          for (let i = 0; i < qty; i++) {
            lines.push({
              product_id: product.id,
              name: product.name,
              unit_price,
              quantity: 1,
              unit_type: product.unit_type,
              imei: imei || null,
              serial: serial || null,
              note: meta.note || null,
            });
          }
          set({ lines });
          return;
        }

        const lines = [...get().lines];
        const idx = lines.findIndex(
          (l) =>
            l.product_id === product.id &&
            !l.imei &&
            !l.serial &&
            Math.abs(l.unit_price - unit_price) < 1e-9
        );
        if (idx >= 0) {
          lines[idx] = {
            ...lines[idx],
            quantity: lines[idx].quantity + qty,
          };
        } else {
          lines.push({
            product_id: product.id,
            name: product.name,
            unit_price,
            quantity: qty,
            unit_type: product.unit_type,
            note: meta.note || null,
          });
        }
        set({ lines });
      },
      setQty: (productId, qty, lineKey) => {
        if (qty <= 0) {
          set({
            lines: get().lines.filter((l) =>
              lineKey
                ? lineKeyOf(l) !== lineKey
                : !(l.product_id === productId && !l.imei && !l.serial)
            ),
          });
          return;
        }
        set({
          lines: get().lines.map((l) => {
            const match = lineKey
              ? lineKeyOf(l) === lineKey
              : l.product_id === productId && !l.imei && !l.serial;
            return match ? { ...l, quantity: qty } : l;
          }),
        });
      },
      remove: (productId, lineKey) =>
        set({
          lines: get().lines.filter((l) =>
            lineKey
              ? lineKeyOf(l) !== lineKey
              : !(l.product_id === productId && !l.imei && !l.serial)
          ),
        }),
      setDiscount: (value) => set({ discount: Math.max(0, value) }),
      clear: () => set({ lines: [], discount: 0 }),
    }),
    { name: "omnisales-cart" }
  )
);
