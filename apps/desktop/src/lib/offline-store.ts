import { get, set } from "idb-keyval";
import {
  AuditEntry,
  BranchSettings,
  CartLine,
  CashMovement,
  Customer,
  CustomerLedgerEntry,
  Expense,
  HeldCart,
  Order,
  OrderStatus,
  OrderType,
  Product,
  ProductCategory,
  Promotion,
  Purchase,
  PurchaseLine,
  RefundMethod,
  ReturnItem,
  ReturnRecord,
  Shift,
  StockMovement,
  StockMovementReason,
  Supplier,
  defaultSettings,
} from "./types";
import { remainingReturnQty } from "./analytics";
import { formatNextDoc } from "./sequences";
import { assertStockAvailable } from "./stock";
import { unitNetRefund } from "./returns-math";
import {
  applyStockDelta,
  countDelta,
  mergeProductInventory,
} from "./stock-ledger";

const KEYS = {
  settings: "omni.settings",
  products: "omni.products",
  categories: "omni.categories",
  stock_movements: "omni.stock_movements",
  shift: "omni.open_shift",
  shift_history: "omni.shift_history",
  customers: "omni.customers",
  ledger: "omni.customer_ledger",
  cash_movements: "omni.cash_movements",
  expenses: "omni.expenses",
  orders: "omni.orders",
  returns: "omni.returns",
  held_carts: "omni.held_carts",
  suppliers: "omni.suppliers",
  purchases: "omni.purchases",
  promotions: "omni.promotions",
  audit: "omni.audit",
  outbox: "omni.outbox",
} as const;

const BACKUP_VERSION = 1;

function demoProducts(): Product[] {
  return [
    {
      id: "prod-1",
      branch_id: "branch-1",
      category_id: "chocolate",
      sku: "VAL-001",
      barcode: "6291001001",
      name: "علبة فاخرة شوكولاتة مكسرات (500 جرام)",
      cost_price: 35.0,
      retail_price: 75.0,
      wholesale_price: 60.0,
      unit_type: "box",
      track_stock: true,
      stock_quantity: 45,
      min_stock: 10,
      is_active: true,
      image_url: null,
      expiry_days: 180,
    },
    {
      id: "prod-2",
      branch_id: "branch-1",
      category_id: "chocolate",
      sku: "VAL-002",
      barcode: "6291001002",
      name: "شوكولاتة بالحليب والتراقل (كيلو)",
      cost_price: 45.0,
      retail_price: 95.0,
      wholesale_price: 80.0,
      unit_type: "kilo",
      track_stock: true,
      stock_quantity: 30,
      min_stock: 5,
      is_active: true,
      expiry_days: 120,
    },
    {
      id: "prod-3",
      branch_id: "branch-1",
      category_id: "gifts",
      sku: "VAL-003",
      barcode: "6291001003",
      name: "بوكس هدايا مناسبات ذهبي فاخر",
      cost_price: 80.0,
      retail_price: 180.0,
      wholesale_price: 150.0,
      unit_type: "piece",
      track_stock: true,
      stock_quantity: 15,
      min_stock: 3,
      is_active: true,
    },
    {
      id: "prod-4",
      branch_id: "branch-1",
      category_id: "electronics",
      sku: "ELEC-01",
      barcode: "6901001004",
      name: "سماعة بلوتوث لاسلكية Pro",
      cost_price: 40.0,
      retail_price: 85.0,
      wholesale_price: 70.0,
      unit_type: "piece",
      track_stock: true,
      stock_quantity: 25,
      min_stock: 5,
      is_active: true,
    },
    {
      id: "prod-5",
      branch_id: "branch-1",
      category_id: "electronics",
      sku: "ELEC-02",
      barcode: "6901001005",
      name: "شاحن سريع 65W GaN Dual Port",
      cost_price: 25.0,
      retail_price: 55.0,
      wholesale_price: 45.0,
      unit_type: "piece",
      track_stock: true,
      stock_quantity: 50,
      min_stock: 10,
      is_active: true,
    },
    {
      id: "prod-6",
      branch_id: "branch-1",
      category_id: "spare_parts",
      sku: "SP-901",
      barcode: "7801001006",
      name: "زيت محرك 5W30 تخليقي بالكامل 4 لتر",
      cost_price: 60.0,
      retail_price: 110.0,
      wholesale_price: 90.0,
      unit_type: "piece",
      track_stock: true,
      stock_quantity: 40,
      min_stock: 8,
      is_active: true,
      oem_code: "OEM-5W30-4L",
      vehicle_fitment: "تويوتا / هوندا / نيسان",
    },
    {
      id: "prod-7",
      branch_id: "branch-1",
      category_id: "grocery",
      sku: "GROC-01",
      barcode: "6281001007",
      name: "قهوة عربية بالهيل فاخرة 500g",
      cost_price: 15.0,
      retail_price: 32.0,
      wholesale_price: 26.0,
      unit_type: "piece",
      track_stock: true,
      stock_quantity: 60,
      min_stock: 12,
      is_active: true,
      expiry_days: 365,
    },
  ];
}

function demoCustomers(): Customer[] {
  return [
    {
      id: "cust-1",
      name: "شركة الأفق للمناسبات",
      phone: "091-2345678",
      email: "contact@alofoq.ly",
      address: "طرابلس - النوفليين",
      balance: 450.0,
      credit_limit: 2000.0,
      created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
    },
    {
      id: "cust-2",
      name: "محمد علي الفيتوري",
      phone: "092-8765432",
      email: "mohamed@example.com",
      address: "طرابلس - زاوية الدهماني",
      balance: 120.0,
      credit_limit: 500.0,
      created_at: new Date(Date.now() - 86400000 * 15).toISOString(),
    },
    {
      id: "cust-3",
      name: "سارة عبدالسلام (عميل VIP)",
      phone: "091-1122334",
      email: "sara@example.com",
      address: "طرابلس - بن عاشور",
      balance: 0,
      credit_limit: 1000.0,
      created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
  ];
}

async function ensureArrayKey<T>(key: string, fallback: T[] = []): Promise<T[]> {
  const existing = await get<T[]>(key);
  if (existing == null) {
    await set(key, fallback);
    return fallback;
  }
  return existing;
}

/** Initialize empty shop stores — no demo clutter in production path. */
export async function ensurePwaSeed(): Promise<void> {
  const existingSettings = await get<BranchSettings>(KEYS.settings);
  if (!existingSettings) {
    await set(KEYS.settings, defaultSettings());
  }

  await ensureArrayKey<Product>(KEYS.products, []);
  await ensureArrayKey<ProductCategory>(KEYS.categories, []);
  await ensureArrayKey<StockMovement>(KEYS.stock_movements, []);
  await ensureArrayKey<Customer>(KEYS.customers, []);
  await ensureArrayKey<Expense>(KEYS.expenses, []);
  await ensureArrayKey<Order>(KEYS.orders, []);
  await ensureArrayKey<HeldCart>(KEYS.held_carts, []);
  await ensureArrayKey<ReturnRecord>(KEYS.returns, []);
  await ensureArrayKey<Supplier>(KEYS.suppliers, []);
  await ensureArrayKey<Purchase>(KEYS.purchases, []);
  await ensureArrayKey<Promotion>(KEYS.promotions, []);
  await ensureArrayKey<AuditEntry>(KEYS.audit, []);
  await ensureArrayKey<CustomerLedgerEntry>(KEYS.ledger, []);
  await ensureArrayKey<CashMovement>(KEYS.cash_movements, []);

  if ((await get<Shift | null>(KEYS.shift)) === undefined) {
    await set(KEYS.shift, null);
  }

  // Ensure default categories exist when catalog is empty of categories
  const cats = (await get<ProductCategory[]>(KEYS.categories)) ?? [];
  if (!cats.length) {
    const settings =
      (await get<BranchSettings>(KEYS.settings)) ?? defaultSettings();
    const defaults: ProductCategory[] = [
      {
        id: crypto.randomUUID(),
        branch_id: settings.branch_id,
        name: "عام",
        sort_order: 0,
        created_at: new Date().toISOString(),
      },
    ];
    await set(KEYS.categories, defaults);
  }
}

/** Optional sample catalog for demos / training — manager-triggered only. */
export async function seedDemoCatalogPwa(): Promise<void> {
  const products = (await get<Product[]>(KEYS.products)) ?? [];
  if (products.length > 0) {
    throw new Error(
      "المخزون يحتوي أصنافاً بالفعل — امسح البيانات أولاً إن أردت البذرة التجريبية"
    );
  }
  const settings =
    (await get<BranchSettings>(KEYS.settings)) ?? defaultSettings();
  const demo = demoProducts().map((p) => ({
    ...p,
    id: crypto.randomUUID(),
    branch_id: settings.branch_id,
  }));
  const customers = demoCustomers().map((c) => ({
    ...c,
    id: crypto.randomUUID(),
  }));
  await set(KEYS.products, demo);
  await set(KEYS.customers, customers);
  for (const p of demo) await enqueue("product.upsert", p);
  for (const c of customers) await enqueue("customer.upsert", c);
  await appendAudit(
    "demo.seed",
    `بذرة تجريبية: ${demo.length} أصناف · ${customers.length} عملاء`
  );
}

async function appendAudit(
  action: string,
  summary: string,
  meta?: Record<string, unknown>,
  actor?: { actor_id?: string; actor_name?: string }
) {
  const entry: AuditEntry = {
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    actor_id: actor?.actor_id,
    actor_name: actor?.actor_name,
    action,
    summary,
    meta,
  };
  const log = ((await get<AuditEntry[]>(KEYS.audit)) ?? []).concat(entry);
  await set(KEYS.audit, log);
  await enqueue("audit.append", entry);
  return entry;
}

/** Best active promotion for a cart subtotal (highest absolute discount). */
export function applyBestPromotion(
  subtotal: number,
  promotions: Promotion[]
): { promotion: Promotion; amount: number } | null {
  if (subtotal <= 0 || !promotions?.length) return null;
  let best: { promotion: Promotion; amount: number } | null = null;
  for (const promo of promotions) {
    if (!promo.active) continue;
    if (promo.min_subtotal != null && subtotal < promo.min_subtotal) continue;
    let amount = 0;
    if (promo.kind === "percent") {
      amount = (subtotal * Math.min(100, Math.max(0, promo.value))) / 100;
    } else {
      amount = Math.max(0, promo.value);
    }
    amount = Math.min(subtotal, Math.round(amount * 100) / 100);
    if (!best || amount > best.amount) {
      best = { promotion: promo, amount };
    }
  }
  return best;
}

export async function loadPwaBootstrap() {
  await ensurePwaSeed();
  const settings = (await get<BranchSettings>(KEYS.settings)) ?? defaultSettings();
  const products = (await get<Product[]>(KEYS.products)) ?? [];
  const categories = (await get<ProductCategory[]>(KEYS.categories)) ?? [];
  const stock_movements = (await get<StockMovement[]>(KEYS.stock_movements)) ?? [];
  const open_shift = (await get<Shift | null>(KEYS.shift)) ?? null;
  const customers = (await get<Customer[]>(KEYS.customers)) ?? [];
  const customer_ledger = (await get<CustomerLedgerEntry[]>(KEYS.ledger)) ?? [];
  const cash_movements = (await get<CashMovement[]>(KEYS.cash_movements)) ?? [];
  const expenses = (await get<Expense[]>(KEYS.expenses)) ?? [];
  const orders = (await get<Order[]>(KEYS.orders)) ?? [];
  const returns = (await get<ReturnRecord[]>(KEYS.returns)) ?? [];
  const held_carts = (await get<HeldCart[]>(KEYS.held_carts)) ?? [];
  const suppliers = (await get<Supplier[]>(KEYS.suppliers)) ?? [];
  const purchases = (await get<Purchase[]>(KEYS.purchases)) ?? [];
  const promotions = (await get<Promotion[]>(KEYS.promotions)) ?? [];
  const audit_log = (await get<AuditEntry[]>(KEYS.audit)) ?? [];

  return {
    settings,
    products,
    categories,
    stock_movements: stock_movements
      .slice()
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
      .slice(0, 500),
    open_shift,
    customers,
    customer_ledger,
    cash_movements,
    expenses,
    orders,
    returns,
    held_carts,
    suppliers,
    purchases,
    promotions,
    audit_log,
    online: navigator.onLine,
    runtime: "pwa" as const,
  };
}

/**
 * Central stock mutation: updates product qty/version, appends ledger row, enqueues sync.
 */
export async function recordStockChangePwa(input: {
  product_id: string;
  delta: number;
  reason: StockMovementReason;
  reference_type?: string;
  reference_id?: string;
  note?: string;
  actor_id?: string;
  allowNegative?: boolean;
  /** When set, mutates this in-memory products array instead of re-reading */
  productsRef?: Product[];
}): Promise<{ product: Product; movement: StockMovement }> {
  const settings =
    (await get<BranchSettings>(KEYS.settings)) ?? defaultSettings();
  const products =
    input.productsRef ?? ((await get<Product[]>(KEYS.products)) ?? []);
  const idx = products.findIndex((p) => p.id === input.product_id);
  if (idx < 0) throw new Error("الصنف غير موجود");

  const { product, movement } = applyStockDelta({
    product: products[idx],
    delta: input.delta,
    reason: input.reason,
    branch_id: settings.branch_id,
    reference_type: input.reference_type,
    reference_id: input.reference_id,
    note: input.note,
    actor_id: input.actor_id,
    allowNegative: input.allowNegative,
  });

  products[idx] = product;
  if (!input.productsRef) {
    await set(KEYS.products, products);
  }

  const movements = ((await get<StockMovement[]>(KEYS.stock_movements)) ?? []).concat(
    movement
  );
  // Cap local history
  const trimmed =
    movements.length > 3000 ? movements.slice(movements.length - 3000) : movements;
  await set(KEYS.stock_movements, trimmed);

  await enqueue("product.upsert", product);
  await enqueue("stock_movement.append", movement);
  return { product, movement };
}

export async function countStockPwa(input: {
  product_id: string;
  counted_qty: number;
  note?: string;
  actor_id?: string;
}): Promise<{ product: Product; movement: StockMovement }> {
  const products = (await get<Product[]>(KEYS.products)) ?? [];
  const product = products.find((p) => p.id === input.product_id);
  if (!product) throw new Error("الصنف غير موجود");
  const counted = Math.max(0, Number(input.counted_qty));
  if (!Number.isFinite(counted)) throw new Error("كمية الجرد غير صالحة");
  const delta = countDelta(product.stock_quantity, counted);
  if (Math.abs(delta) < 1e-9) {
    throw new Error("لا فرق بين الكمية النظامية والجرد");
  }
  return recordStockChangePwa({
    product_id: input.product_id,
    delta,
    reason: "count",
    reference_type: "stock_count",
    note:
      input.note ||
      `جرد فعلي: نظامي ${product.stock_quantity} → معدود ${counted}`,
    actor_id: input.actor_id,
  });
}

export async function adjustStockPwa(input: {
  product_id: string;
  delta: number;
  reason?: Extract<StockMovementReason, "adjustment" | "damage" | "opening">;
  note?: string;
  actor_id?: string;
}): Promise<{ product: Product; movement: StockMovement }> {
  return recordStockChangePwa({
    product_id: input.product_id,
    delta: input.delta,
    reason: input.reason || "adjustment",
    reference_type: "stock_adjust",
    note: input.note,
    actor_id: input.actor_id,
  });
}

export async function addCategoryPwa(name: string): Promise<ProductCategory> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("اسم التصنيف مطلوب");
  const settings =
    (await get<BranchSettings>(KEYS.settings)) ?? defaultSettings();
  const categories = (await get<ProductCategory[]>(KEYS.categories)) ?? [];
  if (categories.some((c) => c.name === trimmed)) {
    throw new Error("التصنيف موجود بالفعل");
  }
  const cat: ProductCategory = {
    id: crypto.randomUUID(),
    branch_id: settings.branch_id,
    name: trimmed,
    sort_order: categories.length,
    created_at: new Date().toISOString(),
  };
  categories.push(cat);
  await set(KEYS.categories, categories);
  await enqueue("category.upsert", cat);
  return cat;
}

export async function renameCategoryPwa(
  id: string,
  name: string
): Promise<ProductCategory> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("اسم التصنيف مطلوب");
  const categories = (await get<ProductCategory[]>(KEYS.categories)) ?? [];
  const idx = categories.findIndex((c) => c.id === id);
  if (idx < 0) throw new Error("التصنيف غير موجود");
  categories[idx] = { ...categories[idx], name: trimmed };
  await set(KEYS.categories, categories);
  await enqueue("category.upsert", categories[idx]);
  return categories[idx];
}

export async function listStockMovementsPwa(productId?: string, limit = 100) {
  const all = (await get<StockMovement[]>(KEYS.stock_movements)) ?? [];
  const filtered = productId
    ? all.filter((m) => m.product_id === productId)
    : all;
  return filtered
    .slice()
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    .slice(0, limit);
}

export async function loadCapacitorBootstrap() {
  const data = await loadPwaBootstrap();
  return { ...data, runtime: "capacitor" as const };
}

export async function savePwaSettings(settings: BranchSettings) {
  await set(KEYS.settings, settings);
  await enqueue("settings.upsert", settings);
  return settings;
}

export async function openPwaShift(cashierId: string, openingFloat: number) {
  const current = await get<Shift | null>(KEYS.shift);
  if (current?.status === "open") {
    throw new Error("توجد وردية مفتوحة بالفعل");
  }
  const settings = (await get<BranchSettings>(KEYS.settings)) ?? defaultSettings();
  const float = Math.max(0, Number(openingFloat) || 0);
  const shift: Shift = {
    id: crypto.randomUUID(),
    branch_id: settings.branch_id || crypto.randomUUID(),
    cashier_id: cashierId,
    opened_at: new Date().toISOString(),
    opening_float: float,
    cash_sales: 0,
    card_sales: 0,
    debt_sales: 0,
    cash_returns: 0,
    expected_cash: float,
    status: "open",
  };
  await set(KEYS.shift, shift);
  await enqueue("shift.open", shift);
  return shift;
}

export async function closePwaShift(counted: number) {
  const shift = await get<Shift | null>(KEYS.shift);
  if (!shift || shift.status !== "open") {
    throw new Error("لا توجد وردية مفتوحة");
  }
  const closed: Shift = {
    ...shift,
    closed_at: new Date().toISOString(),
    closing_count: counted,
    variance: counted - shift.expected_cash,
    status: "closed",
  };
  await set(KEYS.shift, null);

  const history = ((await get<Shift[]>(KEYS.shift_history)) ?? []).concat(closed);
  await set(KEYS.shift_history, history);

  await enqueue("shift.close", closed);
  return closed;
}

function lineTotal(line: CartLine) {
  return line.unit_price * line.quantity;
}

export function calcTotals(lines: CartLine[], discount: number, taxRate: number) {
  const subtotal = lines.reduce((s, l) => s + lineTotal(l), 0);
  const d = Math.min(discount, subtotal);
  const taxable = Math.max(0, subtotal - d);
  const tax = taxable * taxRate;
  return { subtotal, discount: d, tax, total: taxable + tax };
}

function applyShiftSale(
  shift: Shift,
  method: string,
  total: number,
  cash_tendered?: number
): Shift {
  const next = { ...shift };
  if (method === "cash") {
    next.cash_sales += total;
    next.expected_cash += total;
  } else if (method === "card" || method === "transfer") {
    next.card_sales += total;
  } else if (method === "debt") {
    next.debt_sales += total;
  } else if (method === "mixed") {
    const cashPart = Math.min(cash_tendered ?? total, total);
    next.cash_sales += cashPart;
    next.card_sales += total - cashPart;
    next.expected_cash += cashPart;
  }
  return next;
}

export async function checkoutPwa(input: {
  lines: CartLine[];
  discount: number;
  method: string;
  cash_tendered?: number;
  customer_id?: string;
  customer_name?: string;
  customer_phone?: string;
  note?: string;
  settings: BranchSettings;
  open_shift: Shift | null;
  cashier_id: string;
  type?: OrderType;
  status?: OrderStatus;
  delivery_address?: string;
  delivery_date?: string;
  delivery_fee?: number;
  delivery_driver?: string;
  promotion_id?: string;
  actor_id?: string;
  actor_name?: string;
}) {
  const {
    settings,
    lines,
    discount,
    method,
    cash_tendered,
    customer_id,
    customer_name,
    customer_phone,
    note,
    open_shift,
    type: orderType = "pos_walk_in",
    delivery_address,
    delivery_date,
    delivery_driver,
    promotion_id,
    actor_id,
    actor_name,
  } = input;

  if (!settings.walk_in_sales_enabled) {
    throw new Error("البيع الفوري معطّل من الإعدادات");
  }
  if (settings.work_mode === "shift_based" && !open_shift) {
    throw new Error("يرجى فتح الوردية قبل بدء عملية البيع");
  }
  if (!lines.length) throw new Error("السلة فارغة");

  const isDeliveryLike = orderType === "delivery" || orderType === "special_event";
  const status: OrderStatus = input.status ?? (isDeliveryLike ? "new" : "completed");

  if (isDeliveryLike) {
    if (!customer_phone?.trim()) {
      throw new Error("رقم هاتف العميل مطلوب لطلبات التوصيل");
    }
    if (!delivery_address?.trim()) {
      throw new Error("عنوان التوصيل مطلوب لطلبات التوصيل");
    }
  }

  const delivery_fee = isDeliveryLike ? Math.max(0, input.delivery_fee || 0) : 0;

  const subtotalRaw = lines.reduce((s, l) => s + lineTotal(l), 0);
  const promotions = (await get<Promotion[]>(KEYS.promotions)) ?? [];
  let promoDiscount = 0;
  let appliedPromo: Promotion | null = null;
  if (promotion_id) {
    const manual = promotions.find((p) => p.id === promotion_id && p.active);
    if (manual) {
      const hit = applyBestPromotion(subtotalRaw, [manual]);
      if (hit) {
        promoDiscount = hit.amount;
        appliedPromo = hit.promotion;
      }
    }
  } else {
    const best = applyBestPromotion(subtotalRaw, promotions);
    if (best) {
      promoDiscount = best.amount;
      appliedPromo = best.promotion;
    }
  }

  const cartDiscount = Math.max(0, discount || 0);
  const effectiveDiscount = Math.min(subtotalRaw, cartDiscount + promoDiscount);
  const totals = calcTotals(lines, effectiveDiscount, settings.tax_rate);
  const total_amount = Math.round((totals.total + delivery_fee) * 100) / 100;

  let change_due = 0;
  const deferShift = isDeliveryLike && status === "new";

  if (method === "cash" && !deferShift) {
    const tendered = cash_tendered ?? total_amount;
    if (tendered + 1e-9 < total_amount) {
      throw new Error("المبلغ النقدي المكتوب أقل من إجمالي المطلوب");
    }
    change_due = tendered - total_amount;
  }

  if (method === "mixed" && !deferShift) {
    const cashPart = Math.max(0, cash_tendered ?? 0);
    if (cashPart <= 0) {
      throw new Error("حدد الجزء النقدي للدفع المختلط");
    }
    if (cashPart + 1e-9 >= total_amount) {
      throw new Error("للدفع المختلط يجب أن يكون النقد أقل من الإجمالي");
    }
  }

  // Stock gate before mutating balances / shift
  const products = (await get<Product[]>(KEYS.products)) ?? [];
  assertStockAvailable(lines, products);

  const orderNum = await formatNextDoc("order", settings.order_prefix || "ORD");
  const invoiceRef = await formatNextDoc(
    "invoice",
    settings.invoice_prefix || "INV"
  );

  // If debt payment, check customer balance/limit
  if (method === "debt") {
    if (!customer_id) {
      throw new Error("يرجى تحديد العميل لإتمام عملية البيع على الحساب (آجل)");
    }
    const customers = (await get<Customer[]>(KEYS.customers)) ?? [];
    const customer = customers.find((c) => c.id === customer_id);
    if (customer) {
      if (customer.balance + total_amount > customer.credit_limit) {
        throw new Error(
          `تجاوز حد الائتمان للعميل (${customer.name}). الحد الأقصى: ${customer.credit_limit} ${settings.currency_symbol}`
        );
      }
      customer.balance = Math.round((customer.balance + total_amount) * 100) / 100;
      await set(KEYS.customers, customers);
      await enqueue("customer.upsert", customer);

      const ledgerEntry: CustomerLedgerEntry = {
        id: crypto.randomUUID(),
        customer_id,
        type: "debit",
        amount: total_amount,
        reference: invoiceRef,
        description: `فاتورة مبيعات ${orderNum}`,
        created_at: new Date().toISOString(),
      };
      const ledger = (await get<CustomerLedgerEntry[]>(KEYS.ledger)) ?? [];
      ledger.push(ledgerEntry);
      await set(KEYS.ledger, ledger);
      await enqueue("ledger.append", ledgerEntry);
    }
  }

  let settled_to_shift = false;
  let nextShift: Shift | null = null;

  // Update shift figures (skip for new delivery / special_event until completed)
  if (open_shift && !deferShift) {
    nextShift = applyShiftSale(open_shift, method, total_amount, cash_tendered);
    await set(KEYS.shift, nextShift);
    settled_to_shift = true;
  }

  const order: Order = {
    id: crypto.randomUUID(),
    order_number: orderNum,
    type: orderType,
    status,
    customer_id,
    customer_name: customer_name || "عميل نقدي",
    customer_phone,
    delivery_address: isDeliveryLike ? delivery_address : undefined,
    delivery_date: isDeliveryLike ? delivery_date : undefined,
    delivery_fee: isDeliveryLike ? delivery_fee : undefined,
    delivery_driver: isDeliveryLike ? delivery_driver : undefined,
    items: lines,
    subtotal: totals.subtotal,
    discount_amount: totals.discount,
    tax_amount: totals.tax,
    total_amount,
    payment_method: method as Order["payment_method"],
    created_at: new Date().toISOString(),
    notes: note,
    settled_to_shift,
  };

  // Deduct inventory via stock ledger
  for (const line of lines) {
    const p = products.find((item) => item.id === line.product_id);
    if (p && p.track_stock) {
      await recordStockChangePwa({
        product_id: p.id,
        delta: -line.quantity,
        reason: "sale",
        reference_type: "order",
        reference_id: order.id,
        actor_id: actor_id || input.cashier_id,
        productsRef: products,
      });
    }
  }
  await set(KEYS.products, products);

  const orders = ((await get<Order[]>(KEYS.orders)) ?? []).concat(order);
  await set(KEYS.orders, orders);

  await appendAudit(
    "order.create",
    `إنشاء طلب ${order.order_number} (${order.type}) — ${order.total_amount}`,
    {
      order_id: order.id,
      status: order.status,
      promotion_id: appliedPromo?.id,
      delivery_fee,
      invoice_ref: invoiceRef,
    },
    { actor_id: actor_id || input.cashier_id, actor_name }
  );

  await enqueue("order.create", order);
  if (nextShift) {
    await enqueue("shift.update", nextShift);
  }
  return { order, change_due };
}

export async function updateOrderStatusPwa(
  orderId: string,
  status: OrderStatus,
  opts?: { driver?: string; actor_id?: string; actor_name?: string }
) {
  const orders = (await get<Order[]>(KEYS.orders)) ?? [];
  const idx = orders.findIndex((o) => o.id === orderId);
  if (idx < 0) throw new Error("الطلب غير موجود");

  const prev = orders[idx];
  const order: Order = {
    ...prev,
    status,
    delivery_driver: opts?.driver !== undefined ? opts.driver : prev.delivery_driver,
  };

  const wasCompleted = prev.status === "completed";
  const nowCompleted = status === "completed";
  const nowCancelled = status === "cancelled";

  if (nowCompleted && !wasCompleted && !order.settled_to_shift) {
    const method = order.payment_method;
    if (
      method === "cash" ||
      method === "card" ||
      method === "debt" ||
      method === "transfer" ||
      method === "mixed"
    ) {
      const liveShift = (await get<Shift | null>(KEYS.shift)) ?? null;
      if (liveShift?.status === "open") {
        const nextShift = applyShiftSale(liveShift, method, order.total_amount);
        await set(KEYS.shift, nextShift);
        order.settled_to_shift = true;
      }
    }
  }

  if (nowCancelled && prev.status !== "cancelled") {
    const products = (await get<Product[]>(KEYS.products)) ?? [];
    for (const line of order.items) {
      const p = products.find((item) => item.id === line.product_id);
      if (p && p.track_stock) {
        await recordStockChangePwa({
          product_id: p.id,
          delta: line.quantity,
          reason: "return",
          reference_type: "order_cancel",
          reference_id: order.id,
          actor_id: opts?.actor_id,
          note: `إلغاء طلب ${order.order_number}`,
          productsRef: products,
        });
      }
    }
    await set(KEYS.products, products);
  }

  orders[idx] = order;
  await set(KEYS.orders, orders);

  await appendAudit(
    "order.update",
    `تحديث حالة الطلب ${order.order_number} → ${status}`,
    { order_id: order.id, from: prev.status, to: status, driver: opts?.driver },
    { actor_id: opts?.actor_id, actor_name: opts?.actor_name }
  );

  await enqueue("order.update", order);
  return order;
}

export interface CreateReturnInput {
  order_id: string;
  items: { line_index: number; quantity: number; restock?: boolean }[];
  refund_method: RefundMethod;
  notes?: string;
  cashier_id?: string;
  settings: BranchSettings;
  open_shift: Shift | null;
}

export async function createReturnPwa(input: CreateReturnInput): Promise<ReturnRecord> {
  const orders = (await get<Order[]>(KEYS.orders)) ?? [];
  const order = orders.find((o) => o.id === input.order_id);
  if (!order) throw new Error("الفاتورة غير موجودة");
  if (order.status === "cancelled") {
    throw new Error("لا يمكن إرجاع فاتورة ملغاة");
  }
  if (!input.items.length) throw new Error("اختر بنوداً للإرجاع");

  const existingReturns = (await get<ReturnRecord[]>(KEYS.returns)) ?? [];
  const returnItems: ReturnItem[] = [];
  let totalRefund = 0;
  const round = (n: number) => Math.round(n * 100) / 100;

  for (const sel of input.items) {
    if (sel.quantity <= 0) continue;
    const line = order.items[sel.line_index];
    if (!line) throw new Error("بند الفاتورة غير موجود");
    const remaining = remainingReturnQty(order, existingReturns, sel.line_index);
    if (sel.quantity > remaining) {
      throw new Error(
        `الكمية المتاحة للإرجاع من «${line.name}» هي ${remaining} فقط`
      );
    }
    // Distribute order discount/tax so refund ≤ what customer actually paid
    const unitRefund = unitNetRefund(order, sel.line_index);
    totalRefund += unitRefund * sel.quantity;
    returnItems.push({
      product_id: line.product_id,
      name: line.name,
      quantity: sel.quantity,
      unit_refund: unitRefund,
      restock: sel.restock !== false,
      line_index: sel.line_index,
    });
  }

  if (!returnItems.length) throw new Error("اختر كميات صالحة للإرجاع");
  if (input.refund_method === "credit" && !order.customer_id) {
    throw new Error("رصيد العميل يتطلب عميلاً مرتبطاً بالفاتورة");
  }

  totalRefund = round(totalRefund);
  const returnNumber = await formatNextDoc("return", "RET");

  const record: ReturnRecord = {
    id: crypto.randomUUID(),
    return_number: returnNumber,
    order_id: order.id,
    order_number: order.order_number,
    shift_id: input.open_shift?.id,
    refund_method: input.refund_method,
    total_refund: totalRefund,
    notes: input.notes,
    created_at: new Date().toISOString(),
    cashier_id: input.cashier_id,
    customer_id: order.customer_id,
    customer_name: order.customer_name,
    items: returnItems,
  };

  // Restock via stock ledger
  const products = (await get<Product[]>(KEYS.products)) ?? [];
  for (const item of returnItems) {
    if (!item.restock) continue;
    const p = products.find((x) => x.id === item.product_id);
    if (p && p.track_stock) {
      await recordStockChangePwa({
        product_id: p.id,
        delta: item.quantity,
        reason: "return",
        reference_type: "return",
        reference_id: record.id,
        actor_id: input.cashier_id,
        note: `مرتجع ${record.return_number}`,
        productsRef: products,
      });
    }
  }
  await set(KEYS.products, products);

  // Cash → reduce expected drawer (re-read shift to avoid stale App state)
  if (input.refund_method === "cash") {
    const liveShift =
      ((await get<Shift | null>(KEYS.shift)) ?? input.open_shift) || null;
    if (liveShift?.status === "open") {
      const shift: Shift = {
        ...liveShift,
        cash_returns: round((liveShift.cash_returns ?? 0) + totalRefund),
        expected_cash: Math.max(
          0,
          round(liveShift.expected_cash - totalRefund)
        ),
      };
      await set(KEYS.shift, shift);
      record.shift_id = shift.id;
      await enqueue("shift.update", shift);
    }
  }

  const returnCustomerId = order.customer_id;
  async function creditCustomerDebt(description: string) {
    if (!returnCustomerId) return;
    const customers = (await get<Customer[]>(KEYS.customers)) ?? [];
    const customer = customers.find((c) => c.id === returnCustomerId);
    if (!customer) return;
    customer.balance = Math.max(0, round(customer.balance - totalRefund));
    await set(KEYS.customers, customers);
    await enqueue("customer.upsert", customer);
    const ledgerEntry: CustomerLedgerEntry = {
      id: crypto.randomUUID(),
      customer_id: returnCustomerId,
      type: "credit",
      amount: totalRefund,
      reference: record.return_number,
      description,
      created_at: record.created_at,
    };
    const ledger = (await get<CustomerLedgerEntry[]>(KEYS.ledger)) ?? [];
    ledger.push(ledgerEntry);
    await set(KEYS.ledger, ledger);
    await enqueue("ledger.append", ledgerEntry);
  }

  // Store credit / reverse debt balance
  if (input.refund_method === "credit" && order.customer_id) {
    await creditCustomerDebt(`مرتجع على فاتورة ${order.order_number}`);
  }

  // Debt sale refunded as cash/card still reduces customer debt
  if (
    order.payment_method === "debt" &&
    order.customer_id &&
    input.refund_method !== "credit"
  ) {
    await creditCustomerDebt(`عكس آجل — مرتجع ${order.order_number}`);
  }

  const nextReturns = existingReturns.concat(record);
  await set(KEYS.returns, nextReturns);
  await enqueue("return.create", record);
  await appendAudit(
    "return.create",
    `مرتجع ${record.return_number} — ${totalRefund}`,
    { order_id: order.id, refund_method: input.refund_method },
    { actor_id: input.cashier_id }
  );
  return record;
}

export async function listReturnsPwa() {
  return (await get<ReturnRecord[]>(KEYS.returns)) ?? [];
}

export async function addHeldCartPwa(items: CartLine[], customer_name?: string, note?: string) {
  const carts = (await get<HeldCart[]>(KEYS.held_carts)) ?? [];
  const newCart: HeldCart = {
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    customer_name,
    items,
    note,
  };
  carts.push(newCart);
  await set(KEYS.held_carts, carts);
  return carts;
}

export async function removeHeldCartPwa(id: string) {
  const carts = (await get<HeldCart[]>(KEYS.held_carts)) ?? [];
  const filtered = carts.filter((c) => c.id !== id);
  await set(KEYS.held_carts, filtered);
  return filtered;
}

export async function addCustomerPwa(customer: Omit<Customer, "id" | "created_at" | "balance">) {
  const customers = (await get<Customer[]>(KEYS.customers)) ?? [];
  const newCustomer: Customer = {
    ...customer,
    id: crypto.randomUUID(),
    balance: 0,
    created_at: new Date().toISOString(),
  };
  customers.push(newCustomer);
  await set(KEYS.customers, customers);
  await enqueue("customer.upsert", newCustomer);
  return newCustomer;
}

export async function updateCustomerPwa(
  customerId: string,
  patch: Partial<Pick<Customer, "name" | "phone" | "email" | "address" | "credit_limit">>
) {
  const customers = (await get<Customer[]>(KEYS.customers)) ?? [];
  const idx = customers.findIndex((c) => c.id === customerId);
  if (idx < 0) throw new Error("العميل غير موجود");
  customers[idx] = { ...customers[idx], ...patch };
  await set(KEYS.customers, customers);
  await enqueue("customer.upsert", customers[idx]);
  return customers[idx];
}

export async function recordCustomerPaymentPwa(customerId: string, amount: number, note?: string) {
  const customers = (await get<Customer[]>(KEYS.customers)) ?? [];
  const customer = customers.find((c) => c.id === customerId);
  if (!customer) throw new Error("العميل غير موجود");
  if (amount <= 0) throw new Error("مبلغ الدفعة غير صالح");
  if (amount > customer.balance + 0.001) {
    throw new Error("المبلغ أكبر من رصيد الدين الحالي");
  }

  customer.balance = Math.max(0, Math.round((customer.balance - amount) * 100) / 100);
  await set(KEYS.customers, customers);
  await enqueue("customer.upsert", customer);

  const ledgerEntry: CustomerLedgerEntry = {
    id: crypto.randomUUID(),
    customer_id: customerId,
    type: "credit",
    amount,
    reference: await formatNextDoc("payment", "PAY"),
    description: note || "سداد دفعة من الحساب",
    created_at: new Date().toISOString(),
  };
  const ledger = (await get<CustomerLedgerEntry[]>(KEYS.ledger)) ?? [];
  ledger.push(ledgerEntry);
  await set(KEYS.ledger, ledger);
  await enqueue("ledger.append", ledgerEntry);
  return customer;
}

export async function recordCashMovementPwa(input: {
  type: "in" | "out";
  amount: number;
  reason: string;
  cashier_id?: string;
}) {
  const shift = await get<Shift | null>(KEYS.shift);
  if (!shift || shift.status !== "open") {
    throw new Error("افتح وردية قبل تسجيل حركة صندوق");
  }
  if (!input.amount || input.amount <= 0) {
    throw new Error("المبلغ غير صالح");
  }

  const movement: CashMovement = {
    id: crypto.randomUUID(),
    shift_id: shift.id,
    type: input.type,
    amount: input.amount,
    reason: input.reason.trim() || (input.type === "in" ? "إيداع صندوق" : "سحب صندوق"),
    created_at: new Date().toISOString(),
    cashier_id: input.cashier_id,
  };

  const list = (await get<CashMovement[]>(KEYS.cash_movements)) ?? [];
  list.push(movement);
  await set(KEYS.cash_movements, list);

  const delta = input.type === "in" ? input.amount : -input.amount;
  const next: Shift = {
    ...shift,
    expected_cash: Math.max(0, Math.round((shift.expected_cash + delta) * 100) / 100),
  };
  await set(KEYS.shift, next);
  await enqueue("cash_movement.create", movement);
  await enqueue("shift.update", next);
  return { movement, shift: next };
}

export async function addExpensePwa(
  expense: Omit<Expense, "id" | "created_at" | "shift_id" | "cash_movement_id"> & {
    from_drawer?: boolean;
    cashier_id?: string;
  }
) {
  const amount = Math.round(Number(expense.amount) * 100) / 100;
  if (!(amount > 0)) throw new Error("مبلغ المصروف غير صالح");

  let shift_id: string | undefined;
  let cash_movement_id: string | undefined;

  if (expense.from_drawer) {
    const shift = await get<Shift | null>(KEYS.shift);
    if (!shift || shift.status !== "open") {
      throw new Error("لا يمكن خصم المصروف من الصندوق بدون وردية مفتوحة");
    }
    const moved = await recordCashMovementPwa({
      type: "out",
      amount,
      reason: `مصروف: ${expense.category}${expense.note ? ` — ${expense.note}` : ""}`,
      cashier_id: expense.cashier_id,
    });
    shift_id = moved.shift.id;
    cash_movement_id = moved.movement.id;
  }

  const expenses = (await get<Expense[]>(KEYS.expenses)) ?? [];
  const newExp: Expense = {
    category: expense.category,
    amount,
    note: expense.note,
    from_drawer: !!expense.from_drawer,
    shift_id,
    cash_movement_id,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };
  expenses.push(newExp);
  await set(KEYS.expenses, expenses);
  await enqueue("expense.create", newExp);
  return newExp;
}

export async function addProductPwa(product: Omit<Product, "id" | "branch_id">) {
  const settings = (await get<BranchSettings>(KEYS.settings)) ?? defaultSettings();
  const products = (await get<Product[]>(KEYS.products)) ?? [];
  const openingQty = Math.max(0, Number(product.stock_quantity) || 0);
  const now = new Date().toISOString();
  const newProd: Product = {
    ...product,
    id: crypto.randomUUID(),
    branch_id: settings.branch_id,
    stock_quantity: 0,
    stock_version: 0,
    updated_at: now,
  };
  products.push(newProd);
  await set(KEYS.products, products);
  await enqueue("product.upsert", newProd);

  if (openingQty > 0 && newProd.track_stock) {
    const { product: withStock } = await recordStockChangePwa({
      product_id: newProd.id,
      delta: openingQty,
      reason: "opening",
      reference_type: "product_open",
      note: "رصيد افتتاح عند إنشاء الصنف",
    });
    return withStock;
  }
  return newProd;
}

export async function updateProductPwa(product: Product) {
  const products = (await get<Product[]>(KEYS.products)) ?? [];
  const idx = products.findIndex((p) => p.id === product.id);
  if (idx < 0) throw new Error("الصنف غير موجود");
  const prev = products[idx];
  // Catalog edits must not silently rewrite stock — use count/adjust APIs
  const next: Product = {
    ...prev,
    ...product,
    stock_quantity: prev.stock_quantity,
    stock_version: prev.stock_version ?? 0,
    updated_at: new Date().toISOString(),
  };
  products[idx] = next;
  await set(KEYS.products, products);
  await enqueue("product.upsert", next);
  return next;
}

async function enqueue(action: string, payload: unknown) {
  const outbox = ((await get<unknown[]>(KEYS.outbox)) ?? []).concat({
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    action,
    payload,
  });
  await set(KEYS.outbox, outbox);
}

export async function addSupplierPwa(
  input: Omit<Supplier, "id" | "created_at">
): Promise<Supplier> {
  const suppliers = (await get<Supplier[]>(KEYS.suppliers)) ?? [];
  const supplier: Supplier = {
    ...input,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };
  suppliers.push(supplier);
  await set(KEYS.suppliers, suppliers);
  await appendAudit("supplier.create", `إضافة مورد ${supplier.name}`, {
    supplier_id: supplier.id,
  });
  await enqueue("supplier.upsert", supplier);
  return supplier;
}

export async function createPurchasePwa(input: {
  supplier_id: string;
  items: PurchaseLine[];
  notes?: string;
  receive?: boolean;
  actor_id?: string;
  actor_name?: string;
}): Promise<Purchase> {
  if (!input.items?.length) throw new Error("أضف بنوداً لأمر الشراء");
  const suppliers = (await get<Supplier[]>(KEYS.suppliers)) ?? [];
  const supplier = suppliers.find((s) => s.id === input.supplier_id);
  if (!supplier) throw new Error("المورد غير موجود");

  const total_cost = Math.round(
    input.items.reduce((s, l) => s + l.quantity * l.unit_cost, 0) * 100
  ) / 100;

  let purchase: Purchase = {
    id: crypto.randomUUID(),
    purchase_number: await formatNextDoc("purchase", "PO"),
    supplier_id: supplier.id,
    supplier_name: supplier.name,
    items: input.items,
    total_cost,
    status: "draft",
    notes: input.notes,
    created_at: new Date().toISOString(),
  };

  const purchases = ((await get<Purchase[]>(KEYS.purchases)) ?? []).concat(purchase);
  await set(KEYS.purchases, purchases);
  await enqueue("purchase.upsert", purchase);
  await appendAudit(
    "purchase.create",
    `إنشاء أمر شراء ${purchase.purchase_number}`,
    { purchase_id: purchase.id },
    { actor_id: input.actor_id, actor_name: input.actor_name }
  );

  if (input.receive) {
    purchase = await receivePurchasePwa(purchase.id, {
      actor_id: input.actor_id,
      actor_name: input.actor_name,
    });
  }
  return purchase;
}

export async function receivePurchasePwa(
  id: string,
  opts?: { actor_id?: string; actor_name?: string }
): Promise<Purchase> {
  const purchases = (await get<Purchase[]>(KEYS.purchases)) ?? [];
  const idx = purchases.findIndex((p) => p.id === id);
  if (idx < 0) throw new Error("أمر الشراء غير موجود");
  const purchase = purchases[idx];
  if (purchase.status === "received") {
    throw new Error("تم استلام أمر الشراء مسبقاً");
  }

  const products = (await get<Product[]>(KEYS.products)) ?? [];
  for (const line of purchase.items) {
    const idx = products.findIndex((x) => x.id === line.product_id);
    if (idx < 0) continue;
    products[idx] = {
      ...products[idx],
      cost_price: line.unit_cost,
      updated_at: new Date().toISOString(),
    };
    if (products[idx].track_stock && line.quantity > 0) {
      await recordStockChangePwa({
        product_id: products[idx].id,
        delta: line.quantity,
        reason: "purchase",
        reference_type: "purchase",
        reference_id: purchase.id,
        actor_id: opts?.actor_id,
        note: `استلام ${purchase.purchase_number}`,
        productsRef: products,
      });
    } else {
      await enqueue("product.upsert", products[idx]);
    }
  }
  await set(KEYS.products, products);

  const received: Purchase = {
    ...purchase,
    status: "received",
    received_at: new Date().toISOString(),
  };
  purchases[idx] = received;
  await set(KEYS.purchases, purchases);

  await appendAudit(
    "purchase.receive",
    `استلام أمر شراء ${received.purchase_number}`,
    { purchase_id: received.id, total_cost: received.total_cost },
    { actor_id: opts?.actor_id, actor_name: opts?.actor_name }
  );
  await enqueue("purchase.receive", received);
  await enqueue("purchase.upsert", received);
  return received;
}

export async function savePromotionsPwa(promotions: Promotion[]) {
  await set(KEYS.promotions, promotions);
  return promotions;
}

export async function addPromotionPwa(
  input: Omit<Promotion, "id" | "created_at">
): Promise<Promotion> {
  const promotions = (await get<Promotion[]>(KEYS.promotions)) ?? [];
  const promo: Promotion = {
    ...input,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };
  promotions.push(promo);
  await set(KEYS.promotions, promotions);
  await enqueue("promotion.upsert", promo);
  await appendAudit("promotion.create", `إضافة عرض ${promo.name}`, {
    promotion_id: promo.id,
  });
  return promo;
}

export async function setPromotionActivePwa(id: string, active: boolean) {
  const promotions = (await get<Promotion[]>(KEYS.promotions)) ?? [];
  const idx = promotions.findIndex((p) => p.id === id);
  if (idx < 0) throw new Error("العرض غير موجود");
  promotions[idx] = { ...promotions[idx], active };
  await set(KEYS.promotions, promotions);
  await enqueue("promotion.upsert", promotions[idx]);
  await appendAudit(
    "promotion.toggle",
    `${active ? "تفعيل" : "إيقاف"} عرض ${promotions[idx].name}`,
    { promotion_id: id, active }
  );
  return promotions[idx];
}

export async function exportBackupPwa() {
  await ensurePwaSeed();
  const data: Record<string, unknown> = {
    version: BACKUP_VERSION,
    exported_at: new Date().toISOString(),
  };
  for (const [name, key] of Object.entries(KEYS)) {
    data[name] = (await get(key)) ?? null;
  }
  return data;
}

export async function importBackupPwa(data: Record<string, unknown>) {
  if (!data || typeof data !== "object") {
    throw new Error("ملف النسخة الاحتياطية غير صالح");
  }
  const version = Number(data.version);
  if (!Number.isFinite(version) || version < 1) {
    throw new Error("إصدار النسخة الاحتياطية غير مدعوم");
  }
  for (const [name, key] of Object.entries(KEYS)) {
    if (name in data) {
      await set(key, data[name]);
    }
  }
  await appendAudit("backup.import", "استيراد نسخة احتياطية", {
    version,
    exported_at: data.exported_at,
  });
  return loadPwaBootstrap();
}

export async function clearAllDataPwa() {
  await set(KEYS.products, []);
  await set(KEYS.categories, []);
  await set(KEYS.stock_movements, []);
  await set(KEYS.customers, []);
  await set(KEYS.expenses, []);
  await set(KEYS.orders, []);
  await set(KEYS.returns, []);
  await set(KEYS.held_carts, []);
  await set(KEYS.shift, null);
  await set(KEYS.shift_history, []);
  await set(KEYS.ledger, []);
  await set(KEYS.cash_movements, []);
  await set(KEYS.suppliers, []);
  await set(KEYS.purchases, []);
  await set(KEYS.promotions, []);
  await set(KEYS.audit, []);
  await set(KEYS.outbox, []);
  await set(KEYS.settings, defaultSettings());
}

export async function readOutboxRaw() {
  return ((await get<unknown[]>(KEYS.outbox)) ?? []) as unknown[];
}

function asTime(v: unknown): number {
  if (typeof v !== "string") return 0;
  const t = Date.parse(v);
  return Number.isFinite(t) ? t : 0;
}

function mergeById<T extends { id: string }>(
  local: T[],
  remote: T[],
  timeOf: (row: T) => number
): T[] {
  const map = new Map<string, T>();
  for (const row of local) map.set(row.id, row);
  for (const row of remote) {
    const prev = map.get(row.id);
    if (!prev || timeOf(row) >= timeOf(prev)) {
      map.set(row.id, row);
    }
  }
  return [...map.values()];
}

function moneyField(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number(v) || 0;
  return 0;
}

/** Merge a pulled cloud snapshot into IndexedDB (after push). Returns rows touched. */
export async function applyCloudPull(input: {
  localSettings: BranchSettings;
  settings: Record<string, unknown> | null;
  products: Record<string, unknown>[];
  customers: Record<string, unknown>[];
  ledger: Record<string, unknown>[];
  orders: Record<string, unknown>[];
  expenses: Record<string, unknown>[];
  returns: Record<string, unknown>[];
  suppliers: Record<string, unknown>[];
  purchases: Record<string, unknown>[];
  promotions: Record<string, unknown>[];
  cash_movements: Record<string, unknown>[];
  audit_log: Record<string, unknown>[];
  open_shifts: Record<string, unknown>[];
  stock_movements?: Record<string, unknown>[];
  categories?: Record<string, unknown>[];
}): Promise<number> {
  await ensurePwaSeed();
  let touched = 0;

  if (input.settings) {
    const remote = input.settings;
    const merged: BranchSettings = {
      ...input.localSettings,
      name: String(remote.name ?? input.localSettings.name),
      address: String(remote.address ?? input.localSettings.address),
      phone: String(remote.phone ?? input.localSettings.phone),
      currency: String(remote.currency ?? input.localSettings.currency),
      currency_symbol: String(
        remote.currency_symbol ?? input.localSettings.currency_symbol
      ),
      locale: String(remote.locale ?? input.localSettings.locale),
      tax_rate: moneyField(remote.tax_rate ?? input.localSettings.tax_rate),
      industry: (remote.industry as BranchSettings["industry"]) ||
        input.localSettings.industry,
      work_mode: (remote.work_mode as BranchSettings["work_mode"]) ||
        input.localSettings.work_mode,
      pos_layout: (remote.pos_layout as BranchSettings["pos_layout"]) ||
        input.localSettings.pos_layout,
      theme_key: (remote.theme_key as BranchSettings["theme_key"]) ||
        input.localSettings.theme_key,
      walk_in_sales_enabled:
        remote.walk_in_sales_enabled != null
          ? Boolean(remote.walk_in_sales_enabled)
          : input.localSettings.walk_in_sales_enabled,
      thermal_width_mm:
        Number(remote.thermal_width_mm) || input.localSettings.thermal_width_mm,
      order_prefix: String(
        remote.order_prefix ?? input.localSettings.order_prefix
      ),
      invoice_prefix: String(
        remote.invoice_prefix ?? input.localSettings.invoice_prefix
      ),
      receipt_footer: String(
        remote.receipt_footer ?? input.localSettings.receipt_footer
      ),
      default_delivery_fee: moneyField(
        remote.default_delivery_fee ?? input.localSettings.default_delivery_fee
      ),
      owner_whatsapp: String(
        remote.owner_whatsapp ?? input.localSettings.owner_whatsapp ?? ""
      ),
      // Keep device cloud credentials local
      supabase_url: input.localSettings.supabase_url,
      supabase_anon_key: input.localSettings.supabase_anon_key,
      cloud_sync_enabled: input.localSettings.cloud_sync_enabled,
      branch_id: String(remote.branch_id ?? input.localSettings.branch_id),
    };
    await set(KEYS.settings, merged);
    touched += 1;
  }

  const localProducts = (await get<Product[]>(KEYS.products)) ?? [];
  const remoteProducts = input.products.map(
    (p) =>
      ({
        id: String(p.id),
        branch_id: String(p.branch_id || "branch-1"),
        category_id: String(p.category_id || "cat-1"),
        sku: String(p.sku || ""),
        barcode: String(p.barcode || ""),
        name: String(p.name || ""),
        cost_price: moneyField(p.cost_price),
        retail_price: moneyField(p.retail_price),
        wholesale_price: moneyField(p.wholesale_price),
        unit_type: String(p.unit_type || "piece"),
        track_stock: p.track_stock !== false,
        stock_quantity: moneyField(p.stock_quantity),
        min_stock: moneyField(p.min_stock),
        is_active: p.is_active !== false,
        stock_version: Number(p.stock_version) || 0,
        updated_at: String(p.updated_at || p.created_at || ""),
        image_url: (p.image_url as string) || null,
        imei: (p.imei as string) || null,
        serial: (p.serial as string) || null,
        oem_code: (p.oem_code as string) || null,
        vehicle_fitment: (p.vehicle_fitment as string) || null,
        expiry_days: p.expiry_days != null ? Number(p.expiry_days) : null,
      }) as Product
  );
  const byLocal = new Map(localProducts.map((p) => [p.id, p]));
  const byRemote = new Map(remoteProducts.map((p) => [p.id, p]));
  const allIds = new Set([...byLocal.keys(), ...byRemote.keys()]);
  const productsFinal: Product[] = [];
  for (const id of allIds) {
    const local = byLocal.get(id);
    const remote = byRemote.get(id);
    if (local && remote) {
      productsFinal.push(mergeProductInventory(local, remote));
    } else {
      productsFinal.push((remote || local)!);
    }
  }
  await set(KEYS.products, productsFinal);
  touched += remoteProducts.length;

  if (input.categories?.length) {
    const localCats = (await get<ProductCategory[]>(KEYS.categories)) ?? [];
    const remoteCats = input.categories.map(
      (c) =>
        ({
          id: String(c.id),
          branch_id: String(c.branch_id || ""),
          name: String(c.name || ""),
          sort_order: Number(c.sort_order) || 0,
          created_at: String(c.created_at || new Date().toISOString()),
        }) as ProductCategory
    );
    await set(
      KEYS.categories,
      mergeById(localCats, remoteCats, (c) => asTime(c.created_at))
    );
    touched += remoteCats.length;
  }

  if (input.stock_movements?.length) {
    const localMoves = (await get<StockMovement[]>(KEYS.stock_movements)) ?? [];
    const remoteMoves = input.stock_movements.map(
      (m) =>
        ({
          id: String(m.id),
          product_id: String(m.product_id),
          branch_id: String(m.branch_id || ""),
          reason: String(m.reason || "adjustment") as StockMovement["reason"],
          delta: moneyField(m.delta),
          qty_before: moneyField(m.qty_before),
          qty_after: moneyField(m.qty_after),
          reference_type: (m.reference_type as string) || undefined,
          reference_id: (m.reference_id as string) || undefined,
          note: (m.note as string) || undefined,
          actor_id: (m.actor_id as string) || undefined,
          created_at: String(m.created_at || new Date().toISOString()),
        }) as StockMovement
    );
    const mergedMoves = mergeById(localMoves, remoteMoves, (m) =>
      asTime(m.created_at)
    );
    const trimmed =
      mergedMoves.length > 3000
        ? mergedMoves
            .slice()
            .sort((a, b) => asTime(a.created_at) - asTime(b.created_at))
            .slice(-3000)
        : mergedMoves;
    await set(KEYS.stock_movements, trimmed);
    touched += remoteMoves.length;
  }

  const localCustomers = (await get<Customer[]>(KEYS.customers)) ?? [];
  const remoteCustomers = input.customers.map(
    (c) =>
      ({
        id: String(c.id),
        name: String(c.name || ""),
        phone: String(c.phone || ""),
        email: (c.email as string) || undefined,
        address: (c.address as string) || undefined,
        balance: moneyField(c.balance),
        credit_limit: moneyField(c.credit_limit),
        created_at: String(c.created_at || new Date().toISOString()),
      }) as Customer
  );
  await set(
    KEYS.customers,
    mergeById(localCustomers, remoteCustomers, (c) => asTime(c.created_at))
  );
  touched += remoteCustomers.length;

  const localLedger =
    (await get<CustomerLedgerEntry[]>(KEYS.ledger)) ?? [];
  const remoteLedger = input.ledger.map(
    (e) =>
      ({
        id: String(e.id),
        customer_id: String(e.customer_id),
        type: e.type as CustomerLedgerEntry["type"],
        amount: moneyField(e.amount),
        reference: String(e.reference || ""),
        description: String(e.description || ""),
        created_at: String(e.created_at || new Date().toISOString()),
      }) as CustomerLedgerEntry
  );
  await set(
    KEYS.ledger,
    mergeById(localLedger, remoteLedger, (e) => asTime(e.created_at))
  );
  touched += remoteLedger.length;

  const localOrders = (await get<Order[]>(KEYS.orders)) ?? [];
  const remoteOrders = input.orders.map((o) => normalizePulledOrder(o));
  await set(
    KEYS.orders,
    mergeById(localOrders, remoteOrders, (o) => asTime(o.created_at))
  );
  touched += remoteOrders.length;

  const localExpenses = (await get<Expense[]>(KEYS.expenses)) ?? [];
  const remoteExpenses = input.expenses.map(
    (e) =>
      ({
        id: String(e.id),
        category: String(e.category || ""),
        amount: moneyField(e.amount),
        note: String(e.note || ""),
        created_at: String(e.created_at || new Date().toISOString()),
      }) as Expense
  );
  await set(
    KEYS.expenses,
    mergeById(localExpenses, remoteExpenses, (e) => asTime(e.created_at))
  );
  touched += remoteExpenses.length;

  const localReturns = (await get<ReturnRecord[]>(KEYS.returns)) ?? [];
  const remoteReturns = input.returns.map(
    (r) =>
      ({
        id: String(r.id),
        return_number: String(r.return_number || ""),
        order_id: String(r.order_id || ""),
        order_number: String(r.order_number || ""),
        shift_id: (r.shift_id as string) || undefined,
        refund_method: (r.refund_method as RefundMethod) || "cash",
        total_refund: moneyField(r.total_refund),
        notes: (r.notes as string) || undefined,
        created_at: String(r.created_at || new Date().toISOString()),
        cashier_id: (r.cashier_id as string) || undefined,
        customer_id: (r.customer_id as string) || undefined,
        customer_name: (r.customer_name as string) || undefined,
        items: (Array.isArray(r.items) ? r.items : []) as ReturnItem[],
      }) as ReturnRecord
  );
  await set(
    KEYS.returns,
    mergeById(localReturns, remoteReturns, (r) => asTime(r.created_at))
  );
  touched += remoteReturns.length;

  const localSuppliers = (await get<Supplier[]>(KEYS.suppliers)) ?? [];
  const remoteSuppliers = input.suppliers.map(
    (s) =>
      ({
        id: String(s.id),
        name: String(s.name || ""),
        phone: String(s.phone || ""),
        address: (s.address as string) || undefined,
        notes: (s.notes as string) || undefined,
        created_at: String(s.created_at || new Date().toISOString()),
      }) as Supplier
  );
  await set(
    KEYS.suppliers,
    mergeById(localSuppliers, remoteSuppliers, (s) => asTime(s.created_at))
  );
  touched += remoteSuppliers.length;

  const localPurchases = (await get<Purchase[]>(KEYS.purchases)) ?? [];
  const remotePurchases = input.purchases.map(
    (p) =>
      ({
        id: String(p.id),
        purchase_number: String(p.purchase_number || ""),
        supplier_id: String(p.supplier_id || ""),
        supplier_name: String(p.supplier_name || ""),
        items: (Array.isArray(p.items) ? p.items : []) as PurchaseLine[],
        total_cost: moneyField(p.total_cost),
        status: (p.status as Purchase["status"]) || "draft",
        notes: (p.notes as string) || undefined,
        created_at: String(p.created_at || new Date().toISOString()),
        received_at: (p.received_at as string) || undefined,
      }) as Purchase
  );
  await set(
    KEYS.purchases,
    mergeById(localPurchases, remotePurchases, (p) => asTime(p.created_at))
  );
  touched += remotePurchases.length;

  const localPromos = (await get<Promotion[]>(KEYS.promotions)) ?? [];
  const remotePromos = input.promotions.map(
    (p) =>
      ({
        id: String(p.id),
        name: String(p.name || ""),
        kind: (p.kind as Promotion["kind"]) || "percent",
        value: moneyField(p.value),
        active: p.active !== false,
        min_subtotal: moneyField(p.min_subtotal),
        created_at: String(p.created_at || new Date().toISOString()),
      }) as Promotion
  );
  await set(
    KEYS.promotions,
    mergeById(localPromos, remotePromos, (p) => asTime(p.created_at))
  );
  touched += remotePromos.length;

  const localCash = (await get<CashMovement[]>(KEYS.cash_movements)) ?? [];
  const remoteCash = input.cash_movements.map(
    (m) =>
      ({
        id: String(m.id),
        shift_id: String(m.shift_id || ""),
        type: m.type as CashMovement["type"],
        amount: moneyField(m.amount),
        reason: String(m.reason || ""),
        created_at: String(m.created_at || new Date().toISOString()),
        cashier_id: (m.cashier_id as string) || undefined,
      }) as CashMovement
  );
  await set(
    KEYS.cash_movements,
    mergeById(localCash, remoteCash, (m) => asTime(m.created_at))
  );
  touched += remoteCash.length;

  const localAudit = (await get<AuditEntry[]>(KEYS.audit)) ?? [];
  const remoteAudit = input.audit_log.map(
    (a) =>
      ({
        id: String(a.id),
        at: String(a.at || new Date().toISOString()),
        actor_id: (a.actor_id as string) || undefined,
        actor_name: (a.actor_name as string) || undefined,
        action: String(a.action || ""),
        summary: String(a.summary || ""),
        meta: (a.meta as Record<string, unknown>) || undefined,
      }) as AuditEntry
  );
  await set(
    KEYS.audit,
    mergeById(localAudit, remoteAudit, (a) => asTime(a.at))
  );
  touched += remoteAudit.length;

  const localOpen = await get<Shift | null>(KEYS.shift);
  if (!localOpen && input.open_shifts[0]) {
    const s = input.open_shifts[0];
    const shift: Shift = {
      id: String(s.id),
      branch_id: String(s.branch_id || "branch-1"),
      cashier_id: String(s.cashier_id || ""),
      opened_at: String(s.opened_at || new Date().toISOString()),
      closed_at: (s.closed_at as string) || null,
      opening_float: moneyField(s.opening_float),
      cash_sales: moneyField(s.cash_sales),
      card_sales: moneyField(s.card_sales),
      debt_sales: moneyField(s.debt_sales),
      cash_returns: moneyField(s.cash_returns),
      expected_cash: moneyField(s.expected_cash),
      closing_count:
        s.closing_count != null ? moneyField(s.closing_count) : null,
      variance: s.variance != null ? moneyField(s.variance) : null,
      status: (s.status as Shift["status"]) || "open",
    };
    await set(KEYS.shift, shift);
    touched += 1;
  }

  return touched;
}

function normalizePulledOrder(o: Record<string, unknown>): Order {
  return {
    id: String(o.id),
    order_number: String(o.order_number || ""),
    type: (o.type as Order["type"]) || "pos_walk_in",
    status: (o.status as Order["status"]) || "completed",
    customer_id: (o.customer_id as string) || undefined,
    customer_name: (o.customer_name as string) || undefined,
    customer_phone: (o.customer_phone as string) || undefined,
    delivery_address: (o.delivery_address as string) || undefined,
    delivery_date: (o.delivery_date as string) || undefined,
    delivery_fee: moneyField(o.delivery_fee),
    delivery_driver: (o.delivery_driver as string) || undefined,
    items: (Array.isArray(o.items) ? o.items : []) as CartLine[],
    subtotal: moneyField(o.subtotal),
    tax_amount: moneyField(o.tax_amount),
    discount_amount: moneyField(o.discount_amount),
    total_amount: moneyField(o.total_amount),
    payment_method: (o.payment_method as Order["payment_method"]) || "cash",
    created_at: String(o.created_at || new Date().toISOString()),
    notes: (o.notes as string) || undefined,
    settled_to_shift: Boolean(o.settled_to_shift),
  };
}
