import type { SidebarTab } from "../components/Sidebar";

const VALID_TABS: SidebarTab[] = [
  "dashboard",
  "pos",
  "shifts",
  "orders",
  "invoices",
  "returns",
  "inventory",
  "purchases",
  "customers",
  "expenses",
  "ops",
  "reports",
  "settings",
];

export type AppUrlState = {
  tab: SidebarTab;
  invoiceId: string | null;
  orderId: string | null;
  customerId: string | null;
  returnOrderId: string | null;
  purchaseId: string | null;
  supplierId: string | null;
  inventoryQuery: string | null;
  posQuery: string | null;
};

export function parseAppUrl(search = window.location.search): AppUrlState {
  const q = new URLSearchParams(search);
  const tabParam = q.get("tab") as SidebarTab | null;
  const tab = tabParam && VALID_TABS.includes(tabParam) ? tabParam : "dashboard";
  const query = q.get("q");

  return {
    tab,
    invoiceId: q.get("invoice"),
    orderId: q.get("order"),
    customerId: q.get("customer"),
    returnOrderId: q.get("return"),
    purchaseId: q.get("purchase"),
    supplierId: q.get("supplier"),
    inventoryQuery: tab === "inventory" ? query : null,
    posQuery: tab === "pos" ? query : null,
  };
}

export function writeAppUrl(state: AppUrlState): void {
  const q = new URLSearchParams();
  if (state.tab !== "dashboard") q.set("tab", state.tab);
  if (state.tab === "invoices" && state.invoiceId) q.set("invoice", state.invoiceId);
  if (state.tab === "orders" && state.orderId) q.set("order", state.orderId);
  if (state.tab === "customers" && state.customerId) q.set("customer", state.customerId);
  if (state.tab === "returns" && state.returnOrderId) q.set("return", state.returnOrderId);
  if (state.tab === "purchases" && state.purchaseId) q.set("purchase", state.purchaseId);
  if (state.tab === "purchases" && state.supplierId) q.set("supplier", state.supplierId);
  if (state.tab === "inventory" && state.inventoryQuery) q.set("q", state.inventoryQuery);
  if (state.tab === "pos" && state.posQuery) q.set("q", state.posQuery);

  const next = q.toString();
  const path = `${window.location.pathname}${next ? `?${next}` : ""}`;
  if (path !== `${window.location.pathname}${window.location.search}`) {
    window.history.replaceState(null, "", path);
  }
}

export function initialFocusFromUrl(): Pick<
  AppUrlState,
  | "invoiceId"
  | "orderId"
  | "customerId"
  | "returnOrderId"
  | "purchaseId"
  | "supplierId"
  | "inventoryQuery"
  | "posQuery"
> {
  const {
    invoiceId,
    orderId,
    customerId,
    returnOrderId,
    purchaseId,
    supplierId,
    inventoryQuery,
    posQuery,
  } = parseAppUrl();
  return {
    invoiceId,
    orderId,
    customerId,
    returnOrderId,
    purchaseId,
    supplierId,
    inventoryQuery,
    posQuery,
  };
}
