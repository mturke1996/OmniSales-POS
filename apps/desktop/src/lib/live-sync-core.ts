/** Pure helpers for live cloud sync — kept free of Supabase for unit tests. */

export const LIVE_TABLES = [
  "orders",
  "products",
  "returns",
  "customers",
  "customer_ledger",
  "purchases",
  "stock_movements",
  "shifts",
  "expenses",
  "suppliers",
  "supplier_payments",
  "promotions",
  "categories",
  "devices",
  "cash_movements",
  "audit_log",
] as const;

export type LiveTable = (typeof LIVE_TABLES)[number];

const TABLE_AR: Record<string, string> = {
  orders: "فاتورة",
  products: "صنف",
  returns: "مرتجع",
  customers: "عميل",
  purchases: "شراء",
  stock_movements: "حركة مخزون",
  shifts: "وردية",
  expenses: "مصروف",
  suppliers: "مورد",
  supplier_payments: "دفعة مورد",
  promotions: "عرض",
  categories: "تصنيف",
  devices: "جهاز",
  customer_ledger: "كشف عميل",
  cash_movements: "حركة نقدية",
  audit_log: "تدقيق",
};

export function liveTableLabel(table: string): string {
  return TABLE_AR[table] || table;
}

export function liveEventLabel(
  table: string,
  event: string,
  record?: Record<string, unknown> | null
): string {
  const kind = liveTableLabel(table);
  const name =
    (typeof record?.order_number === "string" && record.order_number) ||
    (typeof record?.return_number === "string" && record.return_number) ||
    (typeof record?.purchase_number === "string" && record.purchase_number) ||
    (typeof record?.name === "string" && record.name) ||
    (typeof record?.sku === "string" && record.sku) ||
    "";
  const verb =
    event === "INSERT" ? "إضافة" : event === "DELETE" ? "حذف" : "تحديث";
  return name ? `${verb} ${kind}: ${name}` : `${verb} ${kind}`;
}

export function extractRecordId(record?: Record<string, unknown> | null): string | null {
  if (!record) return null;
  const id = record.id;
  return typeof id === "string" && id ? id : null;
}

/** Skip postgres_changes that echo our own just-pushed rows. */
export function isOwnEcho(recordId: string | null, recentIds: ReadonlySet<string>): boolean {
  if (!recordId) return false;
  return recentIds.has(recordId);
}

export function rememberOwnId(
  recentIds: Set<string>,
  id: string | null | undefined,
  max = 80
): Set<string> {
  if (!id) return recentIds;
  recentIds.add(id);
  if (recentIds.size > max) {
    const first = recentIds.values().next().value;
    if (first) recentIds.delete(first);
  }
  return recentIds;
}

export function payloadId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const id = (payload as { id?: unknown }).id;
  return typeof id === "string" ? id : null;
}

export type LiveStatus =
  | "disabled"
  | "offline"
  | "connecting"
  | "live"
  | "syncing"
  | "error";

export function liveStatusLabel(status: LiveStatus): string {
  switch (status) {
    case "live":
      return "مباشر";
    case "syncing":
      return "جاري المزامنة";
    case "connecting":
      return "جاري الاتصال";
    case "offline":
      return "دون اتصال";
    case "error":
      return "خطأ سحابي";
    default:
      return "محلي";
  }
}

export function pruneStalePeers<T extends { lastSeen: string }>(
  peers: T[],
  nowMs = Date.now(),
  maxAgeMs = 90_000
): T[] {
  return peers.filter((p) => {
    const t = Date.parse(p.lastSeen);
    return Number.isFinite(t) && nowMs - t < maxAgeMs;
  });
}
