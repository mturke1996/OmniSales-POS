import type {
  Customer,
  Expense,
  Order,
  Product,
  ReturnRecord,
  Shift,
} from "./types";

export type PeriodKey = "today" | "shift" | "7d" | "30d" | "custom";

export interface PeriodRange {
  key: PeriodKey;
  from: Date;
  to: Date;
  label: string;
}

export interface AnalyticsInput {
  orders: Order[];
  returns: ReturnRecord[];
  products: Product[];
  customers: Customer[];
  expenses: Expense[];
  openShift?: Shift | null;
  from?: Date;
  to?: Date;
  period?: PeriodKey;
}

export interface DayPoint {
  date: string; // YYYY-MM-DD
  label: string;
  gross: number;
  returns: number;
  net: number;
}

export interface TopProductRow {
  product_id: string;
  name: string;
  qty: number;
  revenue: number;
  cost: number;
  margin: number;
}

export interface PaymentMixRow {
  method: string;
  label: string;
  amount: number;
  count: number;
}

export interface AnalyticsSnapshot {
  range: PeriodRange;
  orders: Order[];
  returns: ReturnRecord[];
  grossSales: number;
  returnsTotal: number;
  netSales: number;
  orderCount: number;
  returnCount: number;
  aov: number;
  estimatedCost: number;
  estimatedMargin: number;
  expensesTotal: number;
  debtsTotal: number;
  series: DayPoint[];
  topProducts: TopProductRow[];
  paymentMix: PaymentMixRow[];
  lowStock: Product[];
  cashReturns: number;
}

const PAYMENT_AR: Record<string, string> = {
  cash: "نقداً",
  card: "بطاقة",
  transfer: "تحويل",
  debt: "آجل",
  mixed: "مختلط",
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function dayKey(d: Date | string) {
  const dt = typeof d === "string" ? new Date(d) : d;
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function arDayLabel(key: string) {
  const [, m, d] = key.split("-");
  return `${d}/${m}`;
}

export function resolvePeriod(
  period: PeriodKey = "7d",
  openShift?: Shift | null,
  customFrom?: Date,
  customTo?: Date
): PeriodRange {
  const now = new Date();
  if (period === "today") {
    return {
      key: "today",
      from: startOfDay(now),
      to: endOfDay(now),
      label: "اليوم",
    };
  }
  if (period === "shift") {
    const from = openShift?.opened_at
      ? new Date(openShift.opened_at)
      : startOfDay(now);
    return {
      key: "shift",
      from,
      to: endOfDay(now),
      label: openShift ? "الوردية الحالية" : "اليوم (لا وردية)",
    };
  }
  if (period === "30d") {
    const from = startOfDay(new Date(now.getTime() - 29 * 86400000));
    return { key: "30d", from, to: endOfDay(now), label: "آخر 30 يوماً" };
  }
  if (period === "custom" && customFrom && customTo) {
    return {
      key: "custom",
      from: startOfDay(customFrom),
      to: endOfDay(customTo),
      label: "فترة مخصصة",
    };
  }
  const from = startOfDay(new Date(now.getTime() - 6 * 86400000));
  return { key: "7d", from, to: endOfDay(now), label: "آخر 7 أيام" };
}

function inRange(iso: string, from: Date, to: Date) {
  const t = new Date(iso).getTime();
  return t >= from.getTime() && t <= to.getTime();
}

function isSaleOrder(o: Order) {
  return o.status !== "cancelled";
}

/** Remaining returnable qty per order line index. */
export function remainingReturnQty(
  order: Order,
  returns: ReturnRecord[],
  lineIndex: number
): number {
  const line = order.items[lineIndex];
  if (!line) return 0;
  const returned = returns
    .filter((r) => r.order_id === order.id)
    .reduce((sum, r) => {
      return (
        sum +
        r.items
          .filter(
            (i) =>
              i.line_index === lineIndex ||
              (i.line_index == null && i.product_id === line.product_id)
          )
          .reduce((s, i) => s + i.quantity, 0)
      );
    }, 0);
  return Math.max(0, line.quantity - returned);
}

export function computeAnalytics(input: AnalyticsInput): AnalyticsSnapshot {
  const range = resolvePeriod(
    input.period,
    input.openShift,
    input.from,
    input.to
  );
  const orders = input.orders.filter(
    (o) => isSaleOrder(o) && inRange(o.created_at, range.from, range.to)
  );
  const returns = input.returns.filter((r) =>
    inRange(r.created_at, range.from, range.to)
  );
  const expenses = input.expenses.filter((e) =>
    inRange(e.created_at, range.from, range.to)
  );

  const grossSales = orders.reduce((s, o) => s + o.total_amount, 0);
  const returnsTotal = returns.reduce((s, r) => s + r.total_refund, 0);
  const cashReturns = returns
    .filter((r) => r.refund_method === "cash")
    .reduce((s, r) => s + r.total_refund, 0);
  const netSales = Math.max(0, grossSales - returnsTotal);
  const orderCount = orders.length;
  const aov = orderCount ? grossSales / orderCount : 0;

  const productMap = new Map(input.products.map((p) => [p.id, p]));
  let estimatedCost = 0;
  for (const o of orders) {
    for (const line of o.items) {
      const p = productMap.get(line.product_id);
      const unitCost = p?.cost_price ?? line.unit_price * 0.6;
      estimatedCost += unitCost * line.quantity;
    }
  }
  // Credit returned COGS roughly by returned qty × cost
  for (const r of returns) {
    for (const item of r.items) {
      if (!item.restock) continue;
      const p = productMap.get(item.product_id);
      const unitCost = p?.cost_price ?? item.unit_refund * 0.6;
      estimatedCost = Math.max(0, estimatedCost - unitCost * item.quantity);
    }
  }
  const estimatedMargin = Math.max(0, netSales - estimatedCost);
  const expensesTotal = expenses.reduce((s, e) => s + e.amount, 0);
  const debtsTotal = input.customers.reduce((s, c) => s + Math.max(0, c.balance), 0);

  // Daily series
  const seriesMap = new Map<string, DayPoint>();
  const cursor = startOfDay(range.from);
  const end = startOfDay(range.to);
  while (cursor.getTime() <= end.getTime()) {
    const key = dayKey(cursor);
    seriesMap.set(key, {
      date: key,
      label: arDayLabel(key),
      gross: 0,
      returns: 0,
      net: 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  for (const o of orders) {
    const key = dayKey(o.created_at);
    const row = seriesMap.get(key);
    if (row) row.gross += o.total_amount;
  }
  for (const r of returns) {
    const key = dayKey(r.created_at);
    const row = seriesMap.get(key);
    if (row) row.returns += r.total_refund;
  }
  const series = [...seriesMap.values()].map((row) => ({
    ...row,
    net: Math.max(0, row.gross - row.returns),
  }));

  // Top products (gross sales lines in period)
  const topMap = new Map<string, TopProductRow>();
  for (const o of orders) {
    for (const line of o.items) {
      const p = productMap.get(line.product_id);
      const prev = topMap.get(line.product_id) ?? {
        product_id: line.product_id,
        name: line.name,
        qty: 0,
        revenue: 0,
        cost: 0,
        margin: 0,
      };
      const cost = (p?.cost_price ?? line.unit_price * 0.6) * line.quantity;
      const revenue = line.unit_price * line.quantity;
      prev.qty += line.quantity;
      prev.revenue += revenue;
      prev.cost += cost;
      prev.margin = prev.revenue - prev.cost;
      topMap.set(line.product_id, prev);
    }
  }
  // Subtract returned qty/revenue
  for (const r of returns) {
    for (const item of r.items) {
      const prev = topMap.get(item.product_id);
      if (!prev) continue;
      prev.qty = Math.max(0, prev.qty - item.quantity);
      prev.revenue = Math.max(0, prev.revenue - item.unit_refund * item.quantity);
      const p = productMap.get(item.product_id);
      const cost = (p?.cost_price ?? item.unit_refund * 0.6) * item.quantity;
      prev.cost = Math.max(0, prev.cost - cost);
      prev.margin = prev.revenue - prev.cost;
    }
  }
  const topProducts = [...topMap.values()]
    .filter((r) => r.qty > 0 || r.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  const payMap = new Map<string, PaymentMixRow>();
  for (const o of orders) {
    const prev = payMap.get(o.payment_method) ?? {
      method: o.payment_method,
      label: PAYMENT_AR[o.payment_method] || o.payment_method,
      amount: 0,
      count: 0,
    };
    prev.amount += o.total_amount;
    prev.count += 1;
    payMap.set(o.payment_method, prev);
  }
  const paymentMix = [...payMap.values()].sort((a, b) => b.amount - a.amount);

  const lowStock = input.products
    .filter((p) => p.track_stock && p.is_active && p.stock_quantity <= p.min_stock)
    .sort((a, b) => a.stock_quantity - b.stock_quantity)
    .slice(0, 12);

  return {
    range,
    orders,
    returns,
    grossSales,
    returnsTotal,
    netSales,
    orderCount,
    returnCount: returns.length,
    aov,
    estimatedCost,
    estimatedMargin,
    expensesTotal,
    debtsTotal,
    series,
    topProducts,
    paymentMix,
    lowStock,
    cashReturns,
  };
}

export function buildZSummary(
  shift: Shift | null,
  orders: Order[],
  returns: ReturnRecord[]
) {
  if (!shift) {
    return {
      shift,
      grossSales: 0,
      cashReturns: 0,
      cardReturns: 0,
      creditReturns: 0,
      returnsTotal: 0,
      netSales: 0,
      invoiceCount: 0,
      expectedCash: 0,
    };
  }
  const from = new Date(shift.opened_at);
  const to = shift.closed_at ? new Date(shift.closed_at) : new Date();
  const shiftOrders = orders.filter(
    (o) => isSaleOrder(o) && inRange(o.created_at, from, to)
  );
  const shiftReturns = returns.filter((r) => inRange(r.created_at, from, to));
  const grossSales = shiftOrders.reduce((s, o) => s + o.total_amount, 0);
  const cashReturns = shiftReturns
    .filter((r) => r.refund_method === "cash")
    .reduce((s, r) => s + r.total_refund, 0);
  const cardReturns = shiftReturns
    .filter((r) => r.refund_method === "card")
    .reduce((s, r) => s + r.total_refund, 0);
  const creditReturns = shiftReturns
    .filter((r) => r.refund_method === "credit")
    .reduce((s, r) => s + r.total_refund, 0);
  const returnsTotal = cashReturns + cardReturns + creditReturns;
  return {
    shift,
    grossSales,
    cashReturns,
    cardReturns,
    creditReturns,
    returnsTotal,
    netSales: Math.max(0, grossSales - returnsTotal),
    invoiceCount: shiftOrders.length,
    expectedCash: shift.expected_cash,
  };
}

export function exportAnalyticsCsv(snap: AnalyticsSnapshot, currency: string) {
  const lines = [
    ["المقياس", "القيمة"].join(","),
    ["الفترة", snap.range.label].join(","),
    ["إجمالي المبيعات", snap.grossSales.toFixed(2)].join(","),
    ["المرتجعات", snap.returnsTotal.toFixed(2)].join(","),
    ["صافي المبيعات", snap.netSales.toFixed(2)].join(","),
    ["عدد الفواتير", String(snap.orderCount)].join(","),
    ["متوسط الفاتورة", snap.aov.toFixed(2)].join(","),
    ["هامش تقديري", snap.estimatedMargin.toFixed(2)].join(","),
    ["المصروفات", snap.expensesTotal.toFixed(2)].join(","),
    ["العملة", currency].join(","),
    "",
    ["التاريخ", "إجمالي", "مرتجعات", "صافي"].join(","),
    ...snap.series.map((d) =>
      [d.date, d.gross.toFixed(2), d.returns.toFixed(2), d.net.toFixed(2)].join(",")
    ),
    "",
    ["المنتج", "الكمية", "الإيراد", "الهامش"].join(","),
    ...snap.topProducts.map((p) =>
      [
        `"${p.name.replace(/"/g, '""')}"`,
        String(p.qty),
        p.revenue.toFixed(2),
        p.margin.toFixed(2),
      ].join(",")
    ),
  ];
  return "\uFEFF" + lines.join("\n");
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
