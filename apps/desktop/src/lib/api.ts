import {
  closePwaShift,
  checkoutPwa,
  loadCapacitorBootstrap,
  loadPwaBootstrap,
  openPwaShift,
  savePwaSettings,
  addHeldCartPwa,
  removeHeldCartPwa,
  addCustomerPwa,
  updateCustomerPwa,
  recordCustomerPaymentPwa,
  recordCashMovementPwa,
  addExpensePwa,
  addProductPwa,
  updateProductPwa,
  clearAllDataPwa,
  seedDemoCatalogPwa,
  createReturnPwa,
  updateOrderStatusPwa,
  addSupplierPwa,
  createPurchasePwa,
  receivePurchasePwa,
  addPromotionPwa,
  setPromotionActivePwa,
  exportBackupPwa,
  importBackupPwa,
  type CreateReturnInput,
} from "./offline-store";
import { detectRuntime } from "./native";
import { syncCloudFull, pendingOutboxCount } from "./sync-outbox";
import type {
  BranchSettings,
  CartLine,
  Customer,
  Expense,
  Order,
  OrderStatus,
  PaymentMethod,
  Product,
  Promotion,
  PurchaseLine,
  ReturnRecord,
  Shift,
  Supplier,
} from "./types";
import { INDUSTRY_PRESETS } from "./types";
import type { Bootstrap } from "./types";

/**
 * IndexedDB (PWA store) is the single source of truth across PWA / Tauri / Capacitor.
 * This avoids SQLite↔IDB split-brain and keeps the cloud outbox coherent.
 */
export async function bootstrap(): Promise<Bootstrap> {
  const runtime = detectRuntime();
  if (runtime === "capacitor") {
    return loadCapacitorBootstrap();
  }
  const data = await loadPwaBootstrap();
  if (runtime === "tauri") {
    return { ...data, runtime: "tauri" };
  }
  return data;
}

export async function saveSettings(settings: BranchSettings) {
  return savePwaSettings(settings);
}

export async function openShift(cashierId: string, openingFloat: number) {
  return openPwaShift(cashierId, openingFloat);
}

export async function closeShift(counted: number) {
  return closePwaShift(counted);
}

export async function checkout(input: {
  lines: CartLine[];
  discount: number;
  method: PaymentMethod;
  cash_tendered?: number;
  customer_id?: string;
  customer_name?: string;
  customer_phone?: string;
  note?: string;
  settings: BranchSettings;
  open_shift: Shift | null;
  cashier_id: string;
  type?: Order["type"];
  status?: OrderStatus;
  delivery_address?: string;
  delivery_date?: string;
  delivery_fee?: number;
  delivery_driver?: string;
  promotion_id?: string;
  actor_id?: string;
  actor_name?: string;
}) {
  return checkoutPwa(input);
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  opts?: { driver?: string; actor_id?: string; actor_name?: string }
) {
  return updateOrderStatusPwa(orderId, status, opts);
}

export async function addSupplier(input: Omit<Supplier, "id" | "created_at">) {
  return addSupplierPwa(input);
}

export async function createPurchase(input: {
  supplier_id: string;
  items: PurchaseLine[];
  notes?: string;
  receive?: boolean;
  actor_id?: string;
  actor_name?: string;
}) {
  return createPurchasePwa(input);
}

export async function receivePurchase(
  id: string,
  opts?: { actor_id?: string; actor_name?: string }
) {
  return receivePurchasePwa(id, opts);
}

export async function addPromotion(input: Omit<Promotion, "id" | "created_at">) {
  return addPromotionPwa(input);
}

export async function setPromotionActive(id: string, active: boolean) {
  return setPromotionActivePwa(id, active);
}

export async function exportBackup() {
  return exportBackupPwa();
}

export async function importBackup(data: Record<string, unknown>) {
  return importBackupPwa(data);
}

export async function addHeldCart(items: CartLine[], customer_name?: string, note?: string) {
  return addHeldCartPwa(items, customer_name, note);
}

export async function removeHeldCart(id: string) {
  return removeHeldCartPwa(id);
}

export async function addCustomer(customer: Omit<Customer, "id" | "created_at" | "balance">) {
  return addCustomerPwa(customer);
}

export async function updateCustomer(
  customerId: string,
  patch: Partial<Pick<Customer, "name" | "phone" | "email" | "address" | "credit_limit">>
) {
  return updateCustomerPwa(customerId, patch);
}

export async function recordCustomerPayment(customerId: string, amount: number, note?: string) {
  return recordCustomerPaymentPwa(customerId, amount, note);
}

export async function recordCashMovement(input: {
  type: "in" | "out";
  amount: number;
  reason: string;
  cashier_id?: string;
}) {
  return recordCashMovementPwa(input);
}

export async function addExpense(
  expense: Omit<Expense, "id" | "created_at" | "shift_id" | "cash_movement_id"> & {
    from_drawer?: boolean;
    cashier_id?: string;
  }
) {
  return addExpensePwa(expense);
}

export async function seedDemoCatalog() {
  return seedDemoCatalogPwa();
}

export async function addProduct(product: Omit<Product, "id" | "branch_id">) {
  return addProductPwa(product);
}

export async function updateProduct(product: Product) {
  return updateProductPwa(product);
}

export async function createReturn(
  input: CreateReturnInput
): Promise<ReturnRecord> {
  // PWA/IDB path is source of truth until Rust return command ships.
  return createReturnPwa(input);
}

export async function clearAllData() {
  return clearAllDataPwa();
}

export function industryPresets() {
  return INDUSTRY_PRESETS;
}

export async function syncCloud(settings: BranchSettings) {
  return syncCloudFull(settings);
}

export async function getPendingSyncCount() {
  return pendingOutboxCount();
}
