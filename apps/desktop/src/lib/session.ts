import { get, set } from "idb-keyval";

export interface Cashier {
  id: string;
  name: string;
  /** 4-digit PIN — local-only demo auth, not a substitute for cloud IAM */
  pin: string;
  role: "cashier" | "manager";
}

export interface CashierSession {
  cashier_id: string;
  cashier_name: string;
  role: Cashier["role"];
  unlocked_at: string;
}

const CASHIERS_KEY = "omni.cashiers";
const SESSION_KEY = "omni.session";

const DEFAULT_CASHIERS: Cashier[] = [
  { id: "cashier-1", name: "كاشير رئيسي", pin: "0000", role: "cashier" },
  { id: "cashier-2", name: "كاشير مناوب", pin: "1234", role: "cashier" },
  { id: "manager-1", name: "مدير الفرع", pin: "9999", role: "manager" },
];

export async function listCashiers(): Promise<Cashier[]> {
  const existing = await get<Cashier[]>(CASHIERS_KEY);
  if (!existing?.length) {
    await set(CASHIERS_KEY, DEFAULT_CASHIERS);
    return DEFAULT_CASHIERS;
  }
  return existing;
}

export async function saveCashiers(cashiers: Cashier[]): Promise<Cashier[]> {
  if (!cashiers.length) {
    throw new Error("يجب الإبقاء على مستخدم واحد على الأقل");
  }
  if (!cashiers.some((c) => c.role === "manager")) {
    throw new Error("يجب وجود مدير واحد على الأقل في المنظومة");
  }
  for (const c of cashiers) {
    if (!c.name.trim()) throw new Error("اسم المستخدم مطلوب");
    if (!/^\d{4,6}$/.test(c.pin)) {
      throw new Error(`رمز PIN لـ «${c.name}» يجب أن يكون 4–6 أرقام`);
    }
  }
  const pins = cashiers.map((c) => c.pin);
  if (new Set(pins).size !== pins.length) {
    // same PIN allowed across users is OK for small shops; skip uniqueness
  }
  await set(CASHIERS_KEY, cashiers);
  return cashiers;
}

export async function addCashier(input: {
  name: string;
  pin: string;
  role: Cashier["role"];
}): Promise<Cashier> {
  const cashiers = await listCashiers();
  const cashier: Cashier = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    pin: input.pin.trim(),
    role: input.role,
  };
  await saveCashiers([...cashiers, cashier]);
  return cashier;
}

export async function updateCashier(
  id: string,
  patch: Partial<Pick<Cashier, "name" | "pin" | "role">>
): Promise<Cashier> {
  const cashiers = await listCashiers();
  const idx = cashiers.findIndex((c) => c.id === id);
  if (idx < 0) throw new Error("المستخدم غير موجود");
  cashiers[idx] = { ...cashiers[idx], ...patch };
  await saveCashiers(cashiers);
  return cashiers[idx];
}

export async function removeCashier(id: string): Promise<void> {
  const cashiers = await listCashiers();
  const next = cashiers.filter((c) => c.id !== id);
  if (next.length === cashiers.length) throw new Error("المستخدم غير موجود");
  await saveCashiers(next);
}

export async function getSession(): Promise<CashierSession | null> {
  return (await get<CashierSession | null>(SESSION_KEY)) ?? null;
}

export async function unlockWithPin(
  cashierId: string,
  pin: string
): Promise<CashierSession> {
  const cashiers = await listCashiers();
  const cashier = cashiers.find((c) => c.id === cashierId);
  if (!cashier) throw new Error("الكاشير غير موجود");
  if (cashier.pin !== pin.trim()) throw new Error("رمز PIN غير صحيح");

  const session: CashierSession = {
    cashier_id: cashier.id,
    cashier_name: cashier.name,
    role: cashier.role,
    unlocked_at: new Date().toISOString(),
  };
  await set(SESSION_KEY, session);
  return session;
}

export async function lockSession() {
  await set(SESSION_KEY, null);
}
