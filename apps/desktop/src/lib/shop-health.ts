import type { SidebarTab } from "../components/Sidebar";
import { computeAnalytics, type AnalyticsSnapshot } from "./analytics";
import { formatMoney } from "./format";
import type {
  Customer,
  Expense,
  Order,
  Product,
  Purchase,
  ReturnRecord,
  Shift,
  Supplier,
  WorkMode,
} from "./types";

export type ShopAlertSeverity = "critical" | "warning" | "info";

export interface ShopAlert {
  id: string;
  severity: ShopAlertSeverity;
  title: string;
  detail: string;
  tab: SidebarTab;
  search?: string;
  customerId?: string;
  purchaseId?: string;
  supplierId?: string;
}

export type ActivityKind = "sale" | "return" | "expense" | "purchase";

export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  at: string;
  title: string;
  subtitle: string;
  amount: number;
  signedAmount: number;
  tab: SidebarTab;
  focusId?: string;
}

export interface ShopHealthInput {
  orders: Order[];
  returns: ReturnRecord[];
  products: Product[];
  customers: Customer[];
  expenses: Expense[];
  purchases?: Purchase[];
  suppliers?: Supplier[];
  openShift?: Shift | null;
  pendingSync?: number;
  workMode?: WorkMode;
  currencySymbol?: string;
}

export interface ShopHealth {
  today: AnalyticsSnapshot;
  week: AnalyticsSnapshot;
  alerts: ShopAlert[];
  activity: ActivityItem[];
  criticalCount: number;
}

function creditRiskCustomers(customers: Customer[]): Customer[] {
  return customers
    .filter((c) => {
      if (c.balance <= 0) return false;
      if (c.credit_limit <= 0) return true;
      return c.balance / c.credit_limit >= 0.8;
    })
    .sort((a, b) => b.balance - a.balance);
}

export function buildShopAlerts(input: ShopHealthInput): ShopAlert[] {
  const today = computeAnalytics({ ...input, period: "today" });
  const sym = input.currencySymbol ?? "د.ل";
  const alerts: ShopAlert[] = [];

  if (input.workMode !== "open_sales" && !input.openShift) {
    alerts.push({
      id: "no-shift",
      severity: "warning",
      title: "لا توجد وردية مفتوحة",
      detail: "افتح وردية قبل البيع الفوري حتى تُسجَّل النقدية بشكل صحيح",
      tab: "shifts",
    });
  }

  const outOfStock = today.lowStock.filter((p) => p.stock_quantity <= 0);
  if (outOfStock.length) {
    alerts.push({
      id: "out-of-stock",
      severity: "critical",
      title: `${outOfStock.length} صنف نافد`,
      detail: outOfStock
        .slice(0, 3)
        .map((p) => p.name)
        .join("، "),
      tab: "inventory",
      search: outOfStock[0]?.barcode || outOfStock[0]?.sku || outOfStock[0]?.name,
    });
  } else if (today.lowStock.length) {
    alerts.push({
      id: "low-stock",
      severity: "warning",
      title: `${today.lowStock.length} صنف تحت الحد الأدنى`,
      detail: today.lowStock
        .slice(0, 3)
        .map((p) => p.name)
        .join("، "),
      tab: "inventory",
      search: today.lowStock[0]?.barcode || today.lowStock[0]?.sku || today.lowStock[0]?.name,
    });
  }

  const risk = creditRiskCustomers(input.customers);
  if (risk.length) {
    alerts.push({
      id: "credit-risk",
      severity: "warning",
      title: `${risk.length} عميل قرب حد الائتمان`,
      detail: `${risk[0].name} · ${formatMoney(risk[0].balance, sym)}`,
      tab: "customers",
      customerId: risk[0].id,
    });
  }

  if (today.openDeliveryCount > 0) {
    alerts.push({
      id: "open-delivery",
      severity: "info",
      title: `${today.openDeliveryCount} طلب توصيل مفتوح`,
      detail: "تابع التجهيز والتسليم من شاشة التوصيل",
      tab: "orders",
    });
  }

  const drafts = (input.purchases ?? []).filter((p) => p.status === "draft");
  if (drafts.length) {
    alerts.push({
      id: "draft-purchases",
      severity: "info",
      title: `${drafts.length} أمر شراء بانتظار الاستلام`,
      detail: drafts[0].purchase_number,
      tab: "purchases",
      purchaseId: drafts[0].id,
    });
  }

  if (today.unpaidPurchaseCount > 0 || today.supplierPayables > 0) {
    const firstUnpaid = (input.suppliers ?? [])
      .filter((s) => s.balance > 0)
      .sort((a, b) => b.balance - a.balance)[0];
    alerts.push({
      id: "payables",
      severity: "info",
      title: "ذمم موردين مستحقة",
      detail: formatMoney(today.supplierPayables, sym),
      tab: "purchases",
      supplierId: firstUnpaid?.id,
    });
  }

  if ((input.pendingSync ?? 0) > 0) {
    alerts.push({
      id: "sync",
      severity: "info",
      title: `${input.pendingSync} عملية بانتظار المزامنة`,
      detail: "ارفع التغييرات عند توفر الاتصال",
      tab: "settings",
    });
  }

  return alerts;
}

export function buildActivityFeed(
  input: Pick<
    ShopHealthInput,
    "orders" | "returns" | "expenses" | "purchases"
  >,
  limit = 8
): ActivityItem[] {
  const items: ActivityItem[] = [];

  for (const o of input.orders) {
    const openDelivery =
      (o.type === "delivery" || o.type === "special_event") &&
      o.status !== "completed" &&
      o.status !== "cancelled";
    items.push({
      id: `sale-${o.id}`,
      kind: "sale",
      at: o.created_at,
      title: o.order_number,
      subtitle: o.customer_name || "عميل نقدي",
      amount: o.total_amount,
      signedAmount: o.total_amount,
      tab: openDelivery ? "orders" : "invoices",
      focusId: o.id,
    });
  }

  for (const r of input.returns) {
    items.push({
      id: `ret-${r.id}`,
      kind: "return",
      at: r.created_at,
      title: r.return_number,
      subtitle: r.order_number,
      amount: r.total_refund,
      signedAmount: -r.total_refund,
      tab: "returns",
      focusId: r.order_id,
    });
  }

  for (const e of input.expenses) {
    items.push({
      id: `exp-${e.id}`,
      kind: "expense",
      at: e.created_at,
      title: e.category,
      subtitle: e.note || "مصروف",
      amount: e.amount,
      signedAmount: -e.amount,
      tab: "expenses",
    });
  }

  for (const p of input.purchases ?? []) {
    items.push({
      id: `pur-${p.id}`,
      kind: "purchase",
      at: p.created_at,
      title: p.purchase_number,
      subtitle: p.supplier_name,
      amount: p.total_cost,
      signedAmount: -p.total_cost,
      tab: "purchases",
      focusId: p.id,
    });
  }

  return items
    .sort(
      (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
    )
    .slice(0, limit);
}

export function computeShopHealth(input: ShopHealthInput): ShopHealth {
  const today = computeAnalytics({ ...input, period: "today" });
  const week = computeAnalytics({ ...input, period: "7d" });
  const alerts = buildShopAlerts(input);
  const activity = buildActivityFeed(input);
  return {
    today,
    week,
    alerts,
    activity,
    criticalCount: alerts.filter((a) => a.severity === "critical").length,
  };
}
