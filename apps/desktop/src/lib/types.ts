export type IndustryKey =
  | "general_retail"
  | "electronics"
  | "spare_parts"
  | "grocery"
  | "food_service"
  | "confectionery";

export type WorkMode = "shift_based" | "open_sales";
export type PosLayout =
  | "grid_cart"
  | "list_barcode"
  | "touch_tiles"
  | "compact_split";

export type PaymentMethod = "cash" | "card" | "transfer" | "debt" | "mixed";

export type RefundMethod = "cash" | "card" | "credit";

export interface ReturnItem {
  product_id: string;
  name: string;
  quantity: number;
  unit_refund: number;
  restock: boolean;
  /** Index into the original order.items array */
  line_index: number;
}

export interface ReturnRecord {
  id: string;
  return_number: string;
  order_id: string;
  order_number: string;
  shift_id?: string;
  refund_method: RefundMethod;
  total_refund: number;
  notes?: string;
  created_at: string;
  cashier_id?: string;
  customer_id?: string;
  customer_name?: string;
  items: ReturnItem[];
}

export interface Money {
  amount: number;
}

export interface Product {
  id: string;
  branch_id: string;
  category_id: string;
  sku: string;
  barcode: string;
  name: string;
  cost_price: number;
  retail_price: number;
  wholesale_price: number;
  unit_type: string;
  track_stock: boolean;
  stock_quantity: number;
  min_stock: number;
  is_active: boolean;
  image_url?: string | null;
  imei?: string | null;
  serial?: string | null;
  oem_code?: string | null;
  vehicle_fitment?: string | null;
  expiry_days?: number | null;
}

export interface CartLine {
  product_id: string;
  name: string;
  unit_price: number;
  quantity: number;
  unit_type: string;
  note?: string | null;
  serial?: string | null;
  imei?: string | null;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  balance: number; // positive = debt owed to us
  credit_limit: number;
  created_at: string;
}

export interface CustomerLedgerEntry {
  id: string;
  customer_id: string;
  type: "debit" | "credit"; // debit = sale on debt, credit = payment received
  amount: number;
  reference: string;
  description: string;
  created_at: string;
}

/** Cash drawer movement during an open shift (not a sale). */
export interface CashMovement {
  id: string;
  shift_id: string;
  type: "in" | "out";
  amount: number;
  reason: string;
  created_at: string;
  cashier_id?: string;
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  note: string;
  created_at: string;
}

export interface HeldCart {
  id: string;
  created_at: string;
  customer_name?: string;
  items: CartLine[];
  note?: string;
}

export type OrderStatus =
  | "new"
  | "in_prep"
  | "ready"
  | "delivering"
  | "completed"
  | "cancelled";

export type OrderType = "pos_walk_in" | "special_event" | "delivery" | "wholesale";

export interface Order {
  id: string;
  order_number: string;
  type: OrderType;
  status: OrderStatus;
  customer_id?: string;
  customer_name?: string;
  customer_phone?: string;
  delivery_address?: string;
  delivery_date?: string;
  /** Extra fee added on top of cart total for delivery orders */
  delivery_fee?: number;
  /** Driver / courier label */
  delivery_driver?: string;
  items: CartLine[];
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  payment_method: PaymentMethod;
  created_at: string;
  notes?: string;
  /** True once sale totals were posted to the open shift (avoids double-count on delivery complete) */
  settled_to_shift?: boolean;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  address?: string;
  notes?: string;
  created_at: string;
}

export interface PurchaseLine {
  product_id: string;
  name: string;
  quantity: number;
  unit_cost: number;
}

export interface Purchase {
  id: string;
  purchase_number: string;
  supplier_id: string;
  supplier_name: string;
  items: PurchaseLine[];
  total_cost: number;
  status: "draft" | "received";
  notes?: string;
  created_at: string;
  received_at?: string;
}

export type PromotionKind = "percent" | "fixed";

export interface Promotion {
  id: string;
  name: string;
  kind: PromotionKind;
  /** percent 1-100 or fixed LYD amount */
  value: number;
  active: boolean;
  /** Optional min cart subtotal to apply */
  min_subtotal?: number;
  created_at: string;
}

export interface AuditEntry {
  id: string;
  at: string;
  actor_id?: string;
  actor_name?: string;
  action: string;
  summary: string;
  meta?: Record<string, unknown>;
}

export interface BranchSettings {
  branch_id: string;
  name: string;
  address: string;
  phone: string;
  currency: string;
  currency_symbol: string;
  locale: string;
  tax_rate: number;
  industry: IndustryKey;
  work_mode: WorkMode;
  pos_layout: PosLayout;
  theme_key: "scout" | "slate" | "forest" | "coral" | "mono";
  walk_in_sales_enabled: boolean;
  thermal_width_mm: number;
  order_prefix: string;
  invoice_prefix: string;
  receipt_footer: string;
  supabase_url?: string;
  supabase_anon_key?: string;
  cloud_sync_enabled?: boolean;
  /** Default delivery fee suggested in POS delivery mode */
  default_delivery_fee?: number;
  /** Owner phone for daily WhatsApp summary */
  owner_whatsapp?: string;
}

export interface Shift {
  id: string;
  branch_id: string;
  cashier_id: string;
  opened_at: string;
  closed_at?: string | null;
  opening_float: number;
  cash_sales: number;
  card_sales: number;
  debt_sales: number;
  /** Cumulative cash refunds issued during this shift */
  cash_returns?: number;
  expected_cash: number;
  closing_count?: number | null;
  variance?: number | null;
  status: "open" | "closed";
}

export interface Bootstrap {
  settings: BranchSettings;
  products: Product[];
  open_shift: Shift | null;
  customers: Customer[];
  customer_ledger: CustomerLedgerEntry[];
  cash_movements: CashMovement[];
  expenses: Expense[];
  orders: Order[];
  returns: ReturnRecord[];
  held_carts: HeldCart[];
  suppliers: Supplier[];
  purchases: Purchase[];
  promotions: Promotion[];
  audit_log: AuditEntry[];
  online: boolean;
  runtime: "tauri" | "capacitor" | "pwa";
}

export interface IndustryPreset {
  key: IndustryKey;
  label_ar: string;
  suggested_layout: PosLayout;
  capabilities: {
    track_serial: boolean;
    track_imei: boolean;
    track_expiry: boolean;
    weight_scale: boolean;
    vehicle_fitment: boolean;
    modifiers: boolean;
    tables: boolean;
  };
}

export const INDUSTRY_PRESETS: IndustryPreset[] = [
  {
    key: "general_retail",
    label_ar: "تجزئة عامة",
    suggested_layout: "grid_cart",
    capabilities: {
      track_serial: false,
      track_imei: false,
      track_expiry: false,
      weight_scale: false,
      vehicle_fitment: false,
      modifiers: false,
      tables: false,
    },
  },
  {
    key: "electronics",
    label_ar: "هواتف وإلكترونيات",
    suggested_layout: "grid_cart",
    capabilities: {
      track_serial: true,
      track_imei: true,
      track_expiry: false,
      weight_scale: false,
      vehicle_fitment: false,
      modifiers: false,
      tables: false,
    },
  },
  {
    key: "spare_parts",
    label_ar: "قطع غيار",
    suggested_layout: "list_barcode",
    capabilities: {
      track_serial: true,
      track_imei: false,
      track_expiry: false,
      weight_scale: false,
      vehicle_fitment: true,
      modifiers: false,
      tables: false,
    },
  },
  {
    key: "grocery",
    label_ar: "مواد غذائية",
    suggested_layout: "grid_cart",
    capabilities: {
      track_serial: false,
      track_imei: false,
      track_expiry: true,
      weight_scale: true,
      vehicle_fitment: false,
      modifiers: false,
      tables: false,
    },
  },
  {
    key: "food_service",
    label_ar: "مطاعم وكافيه",
    suggested_layout: "touch_tiles",
    capabilities: {
      track_serial: false,
      track_imei: false,
      track_expiry: true,
      weight_scale: false,
      vehicle_fitment: false,
      modifiers: true,
      tables: true,
    },
  },
  {
    key: "confectionery",
    label_ar: "حلويات ومناسبات (Valentino Style)",
    suggested_layout: "touch_tiles",
    capabilities: {
      track_serial: false,
      track_imei: false,
      track_expiry: true,
      weight_scale: true,
      vehicle_fitment: false,
      modifiers: true,
      tables: false,
    },
  },
];

export function defaultSettings(): BranchSettings {
  return {
    branch_id: "branch-1",
    name: "OmniSales POS",
    address: "طرابلس - المركز الرئيسي",
    phone: "091-0000000",
    currency: "LYD",
    currency_symbol: "د.ل",
    locale: "ar-LY",
    tax_rate: 0,
    industry: "confectionery",
    work_mode: "shift_based",
    pos_layout: "grid_cart",
    theme_key: "scout",
    walk_in_sales_enabled: true,
    thermal_width_mm: 80,
    order_prefix: "ORD",
    invoice_prefix: "INV",
    receipt_footer: "شكراً لزيارتكم! نعتز بخدمتكم دائماً.",
    default_delivery_fee: 5,
    owner_whatsapp: "",
  };
}
