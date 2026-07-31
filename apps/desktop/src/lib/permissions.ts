import type { CashierSession } from "./session";

export type Permission =
  | "settings.manage"
  | "products.edit"
  | "products.delete"
  | "customers.edit"
  | "purchases.manage"
  | "promotions.manage"
  | "audit.view"
  | "backup.manage"
  | "orders.cancel"
  | "shifts.close"
  | "reports.export"
  | "data.clear";

const MANAGER_ONLY: Permission[] = [
  "settings.manage",
  "products.edit",
  "products.delete",
  "purchases.manage",
  "promotions.manage",
  "audit.view",
  "backup.manage",
  "orders.cancel",
  "data.clear",
];

export function can(
  session: CashierSession | null | undefined,
  permission: Permission
): boolean {
  if (!session) return false;
  if (session.role === "manager") return true;
  return !MANAGER_ONLY.includes(permission);
}

export function requireManager(session: CashierSession | null | undefined): boolean {
  return session?.role === "manager";
}
