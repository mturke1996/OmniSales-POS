import type { ReactNode } from "react";
import { filterCatalog } from "./catalog";
import { formatMoney } from "./format";
import type { Customer, Order, Product, Purchase, ReturnRecord, Supplier } from "./types";
import type { NavItem } from "./nav-config";
import type { SidebarTab } from "../components/Sidebar";
import { STATUS_AR } from "./pdf/pdfBrand";

const MAX_DATA = 5;

export type CommandNavResult = {
  kind: "nav";
  id: string;
  tab: SidebarTab;
  label: string;
  group: string;
  icon: ReactNode;
};

export type CommandInvoiceResult = {
  kind: "invoice";
  id: string;
  orderId: string;
  title: string;
  subtitle: string;
};

export type CommandDeliveryResult = {
  kind: "delivery";
  id: string;
  orderId: string;
  title: string;
  subtitle: string;
};

export type CommandReturnResult = {
  kind: "return";
  id: string;
  orderId: string;
  title: string;
  subtitle: string;
};

export type CommandCustomerResult = {
  kind: "customer";
  id: string;
  customerId: string;
  title: string;
  subtitle: string;
};

export type CommandProductResult = {
  kind: "product";
  id: string;
  productId: string;
  title: string;
  subtitle: string;
  searchText: string;
};

export type CommandPurchaseResult = {
  kind: "purchase";
  id: string;
  purchaseId: string;
  title: string;
  subtitle: string;
};

export type CommandSupplierResult = {
  kind: "supplier";
  id: string;
  supplierId: string;
  title: string;
  subtitle: string;
};

export type CommandResult =
  | CommandNavResult
  | CommandInvoiceResult
  | CommandDeliveryResult
  | CommandReturnResult
  | CommandCustomerResult
  | CommandProductResult
  | CommandPurchaseResult
  | CommandSupplierResult;

export type CommandSearchGroups = {
  navigation: CommandNavResult[];
  invoices: CommandInvoiceResult[];
  deliveries: CommandDeliveryResult[];
  returns: CommandReturnResult[];
  customers: CommandCustomerResult[];
  products: CommandProductResult[];
  purchases: CommandPurchaseResult[];
  suppliers: CommandSupplierResult[];
};

function matchNav(items: NavItem[], q: string): CommandNavResult[] {
  const needle = q.trim().toLowerCase();
  if (!needle) {
    return items.map((item) => ({
      kind: "nav" as const,
      id: `nav-${item.id}`,
      tab: item.id,
      label: item.label,
      group: item.group,
      icon: item.icon,
    }));
  }
  return items
    .filter(
      (item) =>
        item.label.toLowerCase().includes(needle) ||
        item.keywords.toLowerCase().includes(needle) ||
        item.group.toLowerCase().includes(needle)
    )
    .map((item) => ({
      kind: "nav" as const,
      id: `nav-${item.id}`,
      tab: item.id,
      label: item.label,
      group: item.group,
      icon: item.icon,
    }));
}

function matchInvoices(orders: Order[], q: string): CommandInvoiceResult[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  const hits: CommandInvoiceResult[] = [];
  for (const o of orders) {
    if (o.status === "cancelled") continue;
    const hay =
      `${o.order_number} ${o.customer_name ?? ""} ${o.customer_phone ?? ""}`.toLowerCase();
    if (!hay.includes(needle)) continue;
    hits.push({
      kind: "invoice",
      id: `inv-${o.id}`,
      orderId: o.id,
      title: o.order_number,
      subtitle: [o.customer_name, formatMoney(o.total_amount)].filter(Boolean).join(" · "),
    });
    if (hits.length >= MAX_DATA) break;
  }
  return hits;
}

function matchDeliveries(orders: Order[], q: string): CommandDeliveryResult[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  const hits: CommandDeliveryResult[] = [];
  for (const o of orders) {
    if (o.type !== "delivery" && o.type !== "special_event") continue;
    if (o.status === "cancelled" || o.status === "completed") continue;
    const hay =
      `${o.order_number} ${o.customer_name ?? ""} ${o.customer_phone ?? ""} ${o.delivery_address ?? ""}`.toLowerCase();
    if (!hay.includes(needle)) continue;
    hits.push({
      kind: "delivery",
      id: `del-${o.id}`,
      orderId: o.id,
      title: o.order_number,
      subtitle: [
        o.customer_name,
        STATUS_AR[o.status] || o.status,
        o.delivery_address?.slice(0, 40),
      ]
        .filter(Boolean)
        .join(" · "),
    });
    if (hits.length >= MAX_DATA) break;
  }
  return hits;
}

function matchReturns(returns: ReturnRecord[], q: string): CommandReturnResult[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  const hits: CommandReturnResult[] = [];
  for (const r of returns) {
    const hay =
      `${r.return_number} ${r.order_number} ${r.customer_name ?? ""}`.toLowerCase();
    if (!hay.includes(needle)) continue;
    hits.push({
      kind: "return",
      id: `ret-${r.id}`,
      orderId: r.order_id,
      title: r.return_number,
      subtitle: [r.order_number, formatMoney(r.total_refund)].filter(Boolean).join(" · "),
    });
    if (hits.length >= MAX_DATA) break;
  }
  return hits;
}

function matchCustomers(customers: Customer[], q: string): CommandCustomerResult[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  const hits: CommandCustomerResult[] = [];
  for (const c of customers) {
    const hay = `${c.name} ${c.phone} ${c.email ?? ""}`.toLowerCase();
    if (!hay.includes(needle)) continue;
    const balance =
      c.balance > 0 ? `دين ${formatMoney(c.balance)}` : c.phone || "بدون هاتف";
    hits.push({
      kind: "customer",
      id: `cust-${c.id}`,
      customerId: c.id,
      title: c.name,
      subtitle: balance,
    });
    if (hits.length >= MAX_DATA) break;
  }
  return hits;
}

function matchProducts(products: Product[], q: string): CommandProductResult[] {
  const needle = q.trim();
  if (!needle) return [];
  return filterCatalog(products, needle)
    .slice(0, MAX_DATA)
    .map((p) => ({
      kind: "product",
      id: `prod-${p.id}`,
      productId: p.id,
      title: p.name,
      subtitle: [
        p.sku,
        p.barcode,
        formatMoney(p.retail_price),
        p.track_stock ? `مخزون ${p.stock_quantity}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      searchText: p.barcode || p.sku || p.name,
    }));
}

function matchPurchases(purchases: Purchase[], q: string): CommandPurchaseResult[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  const hits: CommandPurchaseResult[] = [];
  for (const p of purchases) {
    const hay = `${p.purchase_number} ${p.supplier_name}`.toLowerCase();
    if (!hay.includes(needle)) continue;
    const status = p.status === "received" ? "مستلم" : "مسودة";
    hits.push({
      kind: "purchase",
      id: `pur-${p.id}`,
      purchaseId: p.id,
      title: p.purchase_number,
      subtitle: [p.supplier_name, status, formatMoney(p.total_cost)]
        .filter(Boolean)
        .join(" · "),
    });
    if (hits.length >= MAX_DATA) break;
  }
  return hits;
}

function matchSuppliers(suppliers: Supplier[], q: string): CommandSupplierResult[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  const hits: CommandSupplierResult[] = [];
  for (const s of suppliers) {
    const hay = `${s.name} ${s.phone} ${s.address ?? ""}`.toLowerCase();
    if (!hay.includes(needle)) continue;
    hits.push({
      kind: "supplier",
      id: `sup-${s.id}`,
      supplierId: s.id,
      title: s.name,
      subtitle:
        s.balance > 0
          ? `مستحق ${formatMoney(s.balance)}`
          : s.phone || "بدون هاتف",
    });
    if (hits.length >= MAX_DATA) break;
  }
  return hits;
}

export function searchCommandResults(
  query: string,
  navItems: NavItem[],
  orders: Order[],
  customers: Customer[],
  products: Product[],
  returns: ReturnRecord[] = [],
  purchases: Purchase[] = [],
  suppliers: Supplier[] = []
): CommandSearchGroups {
  const q = query.trim();
  const showData = q.length >= 1;
  return {
    navigation: matchNav(navItems, query),
    invoices: showData ? matchInvoices(orders, query) : [],
    deliveries: showData ? matchDeliveries(orders, query) : [],
    returns: showData ? matchReturns(returns, query) : [],
    customers: showData ? matchCustomers(customers, query) : [],
    products: showData ? matchProducts(products, query) : [],
    purchases: showData ? matchPurchases(purchases, query) : [],
    suppliers: showData ? matchSuppliers(suppliers, query) : [],
  };
}

export function flattenCommandResults(groups: CommandSearchGroups): CommandResult[] {
  return [
    ...groups.navigation,
    ...groups.invoices,
    ...groups.deliveries,
    ...groups.returns,
    ...groups.customers,
    ...groups.products,
    ...groups.purchases,
    ...groups.suppliers,
  ];
}
