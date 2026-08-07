import { get, set } from "idb-keyval";
import { getSupabaseClient, resetSupabaseClient } from "./supabase";
import { applyCloudPull } from "./offline-store";
import type { BranchSettings } from "./types";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface OutboxEntry {
  id: string;
  created_at: string;
  action: string;
  payload: unknown;
  attempts?: number;
  last_error?: string | null;
}

export interface SyncResult {
  flushed: number;
  remaining: number;
  pulled: number;
  error?: string;
}

const OUTBOX_KEY = "omni.outbox";

export async function readOutbox(): Promise<OutboxEntry[]> {
  return ((await get<OutboxEntry[]>(OUTBOX_KEY)) ?? []) as OutboxEntry[];
}

export async function pendingOutboxCount(): Promise<number> {
  return (await readOutbox()).length;
}

/**
 * Full cloud sync: push local outbox, then pull remote snapshot and merge.
 */
export async function syncCloudFull(settings: BranchSettings): Promise<SyncResult> {
  if (!settings.cloud_sync_enabled) {
    return {
      flushed: 0,
      remaining: await pendingOutboxCount(),
      pulled: 0,
      error: "المزامنة السحابية غير مفعّلة",
    };
  }

  const url = settings.supabase_url?.trim();
  const key = settings.supabase_anon_key?.trim();
  if (!url || !key) {
    return {
      flushed: 0,
      remaining: await pendingOutboxCount(),
      pulled: 0,
      error: "أدخل رابط Supabase ومفتاح anon من الإعدادات",
    };
  }

  resetSupabaseClient();
  const client = getSupabaseClient(url, key);
  if (!client) {
    return {
      flushed: 0,
      remaining: await pendingOutboxCount(),
      pulled: 0,
      error: "عميل Supabase غير مهيأ",
    };
  }

  // After migration 009, anon can no longer read/write — require signed-in user
  const session = await client.auth.getSession();
  if (!session.data.session) {
    return {
      flushed: 0,
      remaining: await pendingOutboxCount(),
      pulled: 0,
      error:
        "المزامنة تتطلب تسجيل دخول سحابي (بريد/كلمة مرور) من الإعدادات — مفتاح anon لم يعد يكتب في القاعدة",
    };
  }

  // Verify OmniSales schema exists (not a foreign project)
  const probe = await client.from("settings").select("branch_id").limit(1);
  if (probe.error) {
    const msg = probe.error.message || "";
    const missing =
      msg.includes("does not exist") ||
      msg.includes("schema cache") ||
      probe.error.code === "42P01" ||
      probe.error.code === "PGRST205";
    const denied =
      probe.error.code === "42501" ||
      msg.toLowerCase().includes("permission") ||
      msg.toLowerCase().includes("rls") ||
      msg.toLowerCase().includes("row-level");
    return {
      flushed: 0,
      remaining: await pendingOutboxCount(),
      pulled: 0,
      error: missing
        ? "هذا المشروع ليس مخطط OmniSales — أنشئ مشروعاً جديداً وطبق الهجرات 001→009"
        : denied
          ? "رفض الصلاحيات — سجّل دخول مستخدم authenticated وطبق الهجرة 009"
          : `فشل الاتصال: ${msg}`,
    };
  }

  const push = await flushOutboxWithClient(client);
  let pulled = 0;
  let pullError: string | undefined;
  try {
    pulled = await pullAndMerge(client, settings);
  } catch (err) {
    pullError = err instanceof Error ? err.message : String(err);
  }

  return {
    flushed: push.flushed,
    remaining: push.remaining,
    pulled,
    error: push.error || pullError,
  };
}

/** @deprecated prefer syncCloudFull — kept for call sites */
export async function flushOutbox(settings: BranchSettings) {
  const r = await syncCloudFull(settings);
  return {
    flushed: r.flushed,
    remaining: r.remaining,
    error: r.error,
  };
}

async function flushOutboxWithClient(client: SupabaseClient): Promise<{
  flushed: number;
  remaining: number;
  error?: string;
}> {
  const outbox = await readOutbox();
  if (!outbox.length) return { flushed: 0, remaining: 0 };

  const kept: OutboxEntry[] = [];
  let flushed = 0;
  let lastError: string | undefined;

  for (const entry of outbox) {
    try {
      await pushEntry(client, entry);
      flushed += 1;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      const attempts = (entry.attempts ?? 0) + 1;
      // Drop poison pills after many failures so the queue cannot stall forever
      if (attempts >= 12) {
        lastError = `تم إسقاط عملية بعد فشل متكرر: ${entry.action} — ${lastError}`;
        continue;
      }
      kept.push({
        ...entry,
        attempts,
        last_error: lastError,
      });
    }
  }

  await set(OUTBOX_KEY, kept);
  return { flushed, remaining: kept.length, error: lastError };
}

async function pushEntry(client: SupabaseClient, entry: OutboxEntry) {
  const payload = entry.payload as Record<string, unknown>;

  switch (entry.action) {
    case "settings.upsert": {
      const { error } = await client
        .from("settings")
        .upsert(mapSettings(payload));
      if (error) throw error;
      return;
    }
    case "order.create":
    case "order.update": {
      const { error } = await client.from("orders").upsert(mapOrder(payload));
      if (error) throw error;
      return;
    }
    case "shift.open":
    case "shift.close":
    case "shift.update": {
      const { error } = await client.from("shifts").upsert(mapShift(payload));
      if (error) throw error;
      return;
    }
    case "return.create": {
      const { error } = await client.from("returns").upsert(mapReturn(payload));
      if (error) throw error;
      return;
    }
    case "customer.upsert": {
      const { error } = await client
        .from("customers")
        .upsert(mapCustomer(payload));
      if (error) throw error;
      return;
    }
    case "ledger.append": {
      const { error } = await client
        .from("customer_ledger")
        .upsert(mapLedger(payload));
      if (error) throw error;
      return;
    }
    case "supplier.upsert": {
      const { error } = await client
        .from("suppliers")
        .upsert(mapSupplier(payload));
      if (error) throw error;
      return;
    }
    case "purchase.upsert":
    case "purchase.receive": {
      const { error } = await client
        .from("purchases")
        .upsert(mapPurchase(payload));
      if (error) throw error;
      return;
    }
    case "product.upsert": {
      const { error } = await client
        .from("products")
        .upsert(mapProduct(payload));
      if (error) throw error;
      return;
    }
    case "expense.create": {
      const { error } = await client
        .from("expenses")
        .upsert(mapExpense(payload));
      if (error) throw error;
      return;
    }
    case "cash_movement.create": {
      const { error } = await client
        .from("cash_movements")
        .upsert(mapCashMovement(payload));
      if (error) throw error;
      return;
    }
    case "promotion.upsert": {
      const { error } = await client
        .from("promotions")
        .upsert(mapPromotion(payload));
      if (error) throw error;
      return;
    }
    case "audit.append": {
      const { error } = await client
        .from("audit_log")
        .upsert(mapAudit(payload));
      if (error) throw error;
      return;
    }
    case "stock_movement.append": {
      const { error } = await client
        .from("stock_movements")
        .upsert(mapStockMovement(payload));
      if (error) throw error;
      return;
    }
    case "category.upsert": {
      const { error } = await client
        .from("categories")
        .upsert(mapCategory(payload));
      if (error) throw error;
      return;
    }
    default:
      throw new Error(`عملية مزامنة غير معروفة: ${entry.action}`);
  }
}

async function pullAndMerge(
  client: SupabaseClient,
  localSettings: BranchSettings
): Promise<number> {
  const [
    settingsRes,
    productsRes,
    customersRes,
    ledgerRes,
    ordersRes,
    expensesRes,
    returnsRes,
    suppliersRes,
    purchasesRes,
    promotionsRes,
    cashRes,
    auditRes,
    shiftsRes,
    stockRes,
    categoriesRes,
  ] = await Promise.all([
    client.from("settings").select("*"),
    client.from("products").select("*"),
    client.from("customers").select("*"),
    client.from("customer_ledger").select("*"),
    client.from("orders").select("*").order("created_at", { ascending: false }).limit(2000),
    client.from("expenses").select("*").order("created_at", { ascending: false }).limit(2000),
    client.from("returns").select("*").order("created_at", { ascending: false }).limit(2000),
    client.from("suppliers").select("*"),
    client.from("purchases").select("*").order("created_at", { ascending: false }).limit(1000),
    client.from("promotions").select("*"),
    client.from("cash_movements").select("*").order("created_at", { ascending: false }).limit(2000),
    client.from("audit_log").select("*").order("at", { ascending: false }).limit(500),
    client.from("shifts").select("*").eq("status", "open").limit(5),
    client
      .from("stock_movements")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(3000),
    client.from("categories").select("*"),
  ]);

  // stock_movements / categories may be missing until migration 010 — soft-fail
  const softOptional = new Set(["stock_movements", "categories"]);
  const firstError = [
    settingsRes,
    productsRes,
    customersRes,
    ledgerRes,
    ordersRes,
    expensesRes,
    returnsRes,
    suppliersRes,
    purchasesRes,
    promotionsRes,
    cashRes,
    auditRes,
    shiftsRes,
  ].find((r) => r.error)?.error;

  if (firstError) throw firstError;

  const stockOk = !stockRes.error;
  const catsOk = !categoriesRes.error;
  if (stockRes.error && !softOptional.has("stock_movements")) throw stockRes.error;
  if (categoriesRes.error && !softOptional.has("categories")) throw categoriesRes.error;

  return applyCloudPull({
    localSettings,
    settings: (settingsRes.data?.[0] as Record<string, unknown>) || null,
    products: (productsRes.data || []) as Record<string, unknown>[],
    customers: (customersRes.data || []) as Record<string, unknown>[],
    ledger: (ledgerRes.data || []) as Record<string, unknown>[],
    orders: (ordersRes.data || []) as Record<string, unknown>[],
    expenses: (expensesRes.data || []) as Record<string, unknown>[],
    returns: (returnsRes.data || []) as Record<string, unknown>[],
    suppliers: (suppliersRes.data || []) as Record<string, unknown>[],
    purchases: (purchasesRes.data || []) as Record<string, unknown>[],
    promotions: (promotionsRes.data || []) as Record<string, unknown>[],
    cash_movements: (cashRes.data || []) as Record<string, unknown>[],
    audit_log: (auditRes.data || []) as Record<string, unknown>[],
    open_shifts: (shiftsRes.data || []) as Record<string, unknown>[],
    stock_movements: stockOk
      ? ((stockRes.data || []) as Record<string, unknown>[])
      : [],
    categories: catsOk
      ? ((categoriesRes.data || []) as Record<string, unknown>[])
      : [],
  });
}

function mapSettings(payload: Record<string, unknown>) {
  return {
    branch_id: payload.branch_id || "branch-1",
    name: payload.name,
    address: payload.address ?? null,
    phone: payload.phone ?? null,
    currency: payload.currency ?? "LYD",
    currency_symbol: payload.currency_symbol ?? "د.ل",
    locale: payload.locale ?? "ar-LY",
    tax_rate: money(payload.tax_rate),
    industry: payload.industry ?? "general_retail",
    work_mode: payload.work_mode ?? "shift_based",
    pos_layout: payload.pos_layout ?? "grid_cart",
    theme_key: payload.theme_key ?? "scout",
    walk_in_sales_enabled: payload.walk_in_sales_enabled !== false,
    thermal_width_mm: Number(payload.thermal_width_mm) || 80,
    order_prefix: payload.order_prefix ?? "ORD",
    invoice_prefix: payload.invoice_prefix ?? "INV",
    receipt_footer: payload.receipt_footer ?? null,
    default_delivery_fee: money(payload.default_delivery_fee),
    owner_whatsapp: payload.owner_whatsapp ?? null,
    updated_at: new Date().toISOString(),
  };
}

function mapReturn(payload: Record<string, unknown>) {
  return {
    id: payload.id,
    return_number: payload.return_number,
    order_id: payload.order_id,
    order_number: payload.order_number,
    shift_id: payload.shift_id ?? null,
    refund_method: payload.refund_method ?? "cash",
    total_refund: money(payload.total_refund),
    notes: payload.notes ?? null,
    cashier_id: payload.cashier_id ?? null,
    customer_id: payload.customer_id ?? null,
    customer_name: payload.customer_name ?? null,
    items: payload.items ?? [],
    created_at: payload.created_at,
  };
}

function mapOrder(payload: Record<string, unknown>) {
  return {
    id: payload.id,
    order_number: payload.order_number,
    type: payload.type ?? "pos_walk_in",
    status: payload.status ?? "completed",
    customer_id: payload.customer_id ?? null,
    customer_name: payload.customer_name ?? null,
    customer_phone: payload.customer_phone ?? null,
    delivery_address: payload.delivery_address ?? null,
    delivery_date: payload.delivery_date ?? null,
    delivery_fee: money(payload.delivery_fee),
    delivery_driver: payload.delivery_driver ?? null,
    items: payload.items ?? payload.lines ?? [],
    subtotal: money(payload.subtotal),
    discount_amount: money(payload.discount_amount ?? payload.discount),
    tax_amount: money(payload.tax_amount ?? payload.tax),
    total_amount: money(payload.total_amount ?? payload.total),
    payment_method: payload.payment_method ?? "cash",
    created_at: payload.created_at,
    notes: payload.notes ?? payload.note ?? null,
    settled_to_shift: Boolean(payload.settled_to_shift),
  };
}

function mapShift(payload: Record<string, unknown>) {
  return {
    id: payload.id,
    branch_id: payload.branch_id,
    cashier_id: payload.cashier_id,
    opened_at: payload.opened_at,
    closed_at: payload.closed_at ?? null,
    opening_float: money(payload.opening_float),
    cash_sales: money(payload.cash_sales),
    card_sales: money(payload.card_sales),
    debt_sales: money(payload.debt_sales),
    cash_returns: money(payload.cash_returns),
    expected_cash: money(payload.expected_cash),
    closing_count:
      payload.closing_count != null ? money(payload.closing_count) : null,
    variance: payload.variance != null ? money(payload.variance) : null,
    status: payload.status,
  };
}

function mapCustomer(payload: Record<string, unknown>) {
  return {
    id: payload.id,
    name: payload.name,
    phone: payload.phone ?? null,
    email: payload.email ?? null,
    address: payload.address ?? null,
    balance: money(payload.balance),
    credit_limit: money(payload.credit_limit),
    created_at: payload.created_at,
  };
}

function mapLedger(payload: Record<string, unknown>) {
  return {
    id: payload.id,
    customer_id: payload.customer_id,
    type: payload.type,
    amount: money(payload.amount),
    reference: payload.reference ?? null,
    description: payload.description ?? null,
    created_at: payload.created_at,
  };
}

function mapSupplier(payload: Record<string, unknown>) {
  return {
    id: payload.id,
    name: payload.name,
    phone: payload.phone ?? null,
    address: payload.address ?? null,
    notes: payload.notes ?? null,
    created_at: payload.created_at,
  };
}

function mapPurchase(payload: Record<string, unknown>) {
  return {
    id: payload.id,
    purchase_number: payload.purchase_number,
    supplier_id: payload.supplier_id,
    supplier_name: payload.supplier_name ?? null,
    items: payload.items ?? [],
    total_cost: money(payload.total_cost),
    status: payload.status ?? "draft",
    notes: payload.notes ?? null,
    created_at: payload.created_at,
    received_at: payload.received_at ?? null,
  };
}

function mapProduct(payload: Record<string, unknown>) {
  return {
    id: payload.id,
    branch_id: payload.branch_id || "branch-1",
    category_id: payload.category_id || "cat-1",
    sku: payload.sku,
    barcode: payload.barcode,
    name: payload.name,
    cost_price: money(payload.cost_price),
    retail_price: money(payload.retail_price),
    wholesale_price: money(payload.wholesale_price),
    unit_type: payload.unit_type || "piece",
    track_stock: Boolean(payload.track_stock),
    stock_quantity: money(payload.stock_quantity),
    min_stock: money(payload.min_stock),
    is_active: payload.is_active !== false,
    stock_version: Number(payload.stock_version) || 0,
    updated_at: payload.updated_at || new Date().toISOString(),
    image_url: payload.image_url ?? null,
    imei: payload.imei ?? null,
    serial: payload.serial ?? null,
    oem_code: payload.oem_code ?? null,
    vehicle_fitment: payload.vehicle_fitment ?? null,
    expiry_days: payload.expiry_days ?? null,
  };
}

function mapStockMovement(payload: Record<string, unknown>) {
  return {
    id: payload.id,
    product_id: payload.product_id,
    branch_id: payload.branch_id || "branch-1",
    reason: payload.reason || "adjustment",
    delta: money(payload.delta),
    qty_before: money(payload.qty_before),
    qty_after: money(payload.qty_after),
    reference_type: payload.reference_type ?? null,
    reference_id: payload.reference_id ?? null,
    note: payload.note ?? null,
    actor_id: payload.actor_id ?? null,
    created_at: payload.created_at || new Date().toISOString(),
  };
}

function mapCategory(payload: Record<string, unknown>) {
  return {
    id: payload.id,
    branch_id: payload.branch_id || "branch-1",
    name: payload.name,
    sort_order: Number(payload.sort_order) || 0,
    created_at: payload.created_at || new Date().toISOString(),
  };
}

function mapExpense(payload: Record<string, unknown>) {
  return {
    id: payload.id,
    category: payload.category,
    amount: money(payload.amount),
    note: payload.note ?? null,
    created_at: payload.created_at,
  };
}

function mapCashMovement(payload: Record<string, unknown>) {
  return {
    id: payload.id,
    shift_id: payload.shift_id,
    type: payload.type,
    amount: money(payload.amount),
    reason: payload.reason ?? "",
    cashier_id: payload.cashier_id ?? null,
    created_at: payload.created_at,
  };
}

function mapPromotion(payload: Record<string, unknown>) {
  return {
    id: payload.id,
    name: payload.name,
    kind: payload.kind ?? "percent",
    value: money(payload.value),
    active: payload.active !== false,
    min_subtotal: money(payload.min_subtotal),
    created_at: payload.created_at,
  };
}

function mapAudit(payload: Record<string, unknown>) {
  return {
    id: payload.id,
    at: payload.at,
    actor_id: payload.actor_id ?? null,
    actor_name: payload.actor_name ?? null,
    action: payload.action,
    summary: payload.summary,
    meta: payload.meta ?? null,
  };
}

function money(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number(v) || 0;
  if (v && typeof v === "object" && "amount" in (v as object)) {
    return Number((v as { amount: number }).amount) || 0;
  }
  return 0;
}
