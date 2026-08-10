import type { ReactNode } from "react";
import { filterCatalog } from "./catalog";
import { formatMoney } from "./format";
import type { Customer, Order, Product, ReturnRecord } from "./types";
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

export type CommandResult =
  | CommandNavResult
  | CommandInvoiceResult
  | CommandDeliveryResult
  | CommandReturnResult
  | CommandCustomerResult
  | CommandProductResult;

export type CommandSearchGroups = {
  navigation: CommandNavResult[];
  invoices: CommandInvoiceResult[];
  deliveries: CommandDeliveryResult[];
  returns: CommandReturnResult[];
  customers: CommandCustomerResult[];
  products: CommandProductResult[];
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
      subtitle: [p.sku, p.barcode, formatMoney(p.retail_price)].filter(Boolean).join(" · "),
      searchText: p.barcode || p.sku || p.name,
    }));
}

export function searchCommandResults(
  query: string,
  navItems: NavItem[],
  orders: Order[],
  customers: Customer[],
  products: Product[],
  returns: ReturnRecord[] = []
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
  ];
}
