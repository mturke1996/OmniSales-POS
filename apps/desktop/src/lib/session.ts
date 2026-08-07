import { get, set } from "idb-keyval";
import {
  assertPinFormat,
  hashPin,
  hashPinRaw,
  isWeakPin,
  validateNewPin,
  verifyPin,
} from "./pin";

export interface Cashier {
  id: string;
  name: string;
  role: "cashier" | "manager";
  /** @deprecated plaintext — migrated automatically to pin_hash */
  pin?: string;
  pin_hash?: string;
  pin_salt?: string;
  /** Force user to set a strong PIN before using the shop */
  must_change_pin?: boolean;
}

export interface CashierSession {
  cashier_id: string;
  cashier_name: string;
  role: Cashier["role"];
  unlocked_at: string;
  must_change_pin?: boolean;
}

const CASHIERS_KEY = "omni.cashiers";
const SESSION_KEY = "omni.session";
const BOOTSTRAP_FLAG = "omni.cashiers_v2";

async function buildDefaultCashiers(): Promise<Cashier[]> {
  // Temporary bootstrap PINs — must_change_pin forces replacement on first login.
  const managerPin = await hashPinRaw("9999");
  const cashierPin = await hashPinRaw("0000");
  return [
    {
      id: crypto.randomUUID(),
      name: "مدير الفرع",
      role: "manager",
      pin_hash: managerPin.hash,
      pin_salt: managerPin.salt,
      must_change_pin: true,
    },
    {
      id: crypto.randomUUID(),
      name: "كاشير رئيسي",
      role: "cashier",
      pin_hash: cashierPin.hash,
      pin_salt: cashierPin.salt,
      must_change_pin: true,
    },
  ];
}

async function migrateCashier(c: Cashier): Promise<Cashier> {
  if (c.pin_hash && c.pin_salt) {
    const { pin: _drop, ...rest } = c;
    return {
      ...rest,
      must_change_pin:
        c.must_change_pin === true ||
        (c.pin ? isWeakPin(c.pin) : false) ||
        false,
    };
  }
  if (c.pin) {
    const hashed = await hashPinRaw(c.pin);
    return {
      id: c.id,
      name: c.name,
      role: c.role,
      pin_hash: hashed.hash,
      pin_salt: hashed.salt,
      must_change_pin: true,
    };
  }
  // Broken record — force reset
  const hashed = await hashPinRaw("0000");
  return {
    id: c.id,
    name: c.name,
    role: c.role,
    pin_hash: hashed.hash,
    pin_salt: hashed.salt,
    must_change_pin: true,
  };
}

export async function listCashiers(): Promise<Cashier[]> {
  const existing = await get<Cashier[]>(CASHIERS_KEY);
  if (!existing?.length) {
    const defaults = await buildDefaultCashiers();
    await set(CASHIERS_KEY, defaults);
    await set(BOOTSTRAP_FLAG, 2);
    return defaults;
  }

  let changed = false;
  const migrated: Cashier[] = [];
  for (const c of existing) {
    const next = await migrateCashier(c);
    if (
      next.pin_hash !== c.pin_hash ||
      next.pin_salt !== c.pin_salt ||
      next.must_change_pin !== c.must_change_pin ||
      c.pin != null
    ) {
      changed = true;
    }
    migrated.push(next);
  }
  if (changed) {
    await set(CASHIERS_KEY, migrated);
  }
  return migrated;
}

function publicCashier(c: Cashier): Cashier {
  return {
    id: c.id,
    name: c.name,
    role: c.role,
    must_change_pin: c.must_change_pin,
    pin_hash: c.pin_hash ? "••••" : undefined,
    pin_salt: c.pin_salt ? "••••" : undefined,
  };
}

/** Internal list with real hashes — not for UI dump. */
async function listCashiersRaw(): Promise<Cashier[]> {
  return listCashiers();
}

export async function listCashiersForUi(): Promise<Cashier[]> {
  const list = await listCashiersRaw();
  return list.map(publicCashier);
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
    if (!c.pin_hash || !c.pin_salt) {
      throw new Error(`رمز PIN لـ «${c.name}» غير مهيأ`);
    }
  }
  await set(CASHIERS_KEY, cashiers);
  return cashiers;
}

export async function addCashier(input: {
  name: string;
  pin: string;
  role: Cashier["role"];
}): Promise<Cashier> {
  validateNewPin(input.pin);
  const cashiers = await listCashiersRaw();
  const hashed = await hashPin(input.pin);
  const cashier: Cashier = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    role: input.role,
    pin_hash: hashed.hash,
    pin_salt: hashed.salt,
    must_change_pin: false,
  };
  await saveCashiers([...cashiers, cashier]);
  return publicCashier(cashier);
}

export async function updateCashier(
  id: string,
  patch: Partial<Pick<Cashier, "name" | "role">> & { pin?: string }
): Promise<Cashier> {
  const cashiers = await listCashiersRaw();
  const idx = cashiers.findIndex((c) => c.id === id);
  if (idx < 0) throw new Error("المستخدم غير موجود");

  const next: Cashier = { ...cashiers[idx] };
  if (patch.name != null) next.name = patch.name;
  if (patch.role != null) next.role = patch.role;
  if (patch.pin != null) {
    validateNewPin(patch.pin);
    const hashed = await hashPin(patch.pin);
    next.pin_hash = hashed.hash;
    next.pin_salt = hashed.salt;
    next.must_change_pin = false;
    delete next.pin;
  }
  cashiers[idx] = next;
  await saveCashiers(cashiers);
  return publicCashier(next);
}

export async function changeOwnPin(
  cashierId: string,
  currentPin: string,
  newPin: string
): Promise<CashierSession> {
  assertPinFormat(currentPin);
  validateNewPin(newPin);
  if (currentPin.trim() === newPin.trim()) {
    throw new Error("اختر رمزاً مختلفاً عن الرمز الحالي");
  }
  const cashiers = await listCashiersRaw();
  const cashier = cashiers.find((c) => c.id === cashierId);
  if (!cashier?.pin_hash || !cashier.pin_salt) {
    throw new Error("المستخدم غير موجود");
  }
  const ok = await verifyPin(currentPin, cashier.pin_hash, cashier.pin_salt);
  if (!ok) throw new Error("رمز PIN الحالي غير صحيح");

  const hashed = await hashPin(newPin);
  cashier.pin_hash = hashed.hash;
  cashier.pin_salt = hashed.salt;
  cashier.must_change_pin = false;
  delete cashier.pin;
  await saveCashiers(cashiers);

  const session: CashierSession = {
    cashier_id: cashier.id,
    cashier_name: cashier.name,
    role: cashier.role,
    unlocked_at: new Date().toISOString(),
    must_change_pin: false,
  };
  await set(SESSION_KEY, session);
  return session;
}

export async function removeCashier(id: string): Promise<void> {
  const cashiers = await listCashiersRaw();
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
  assertPinFormat(pin);
  const cashiers = await listCashiersRaw();
  const cashier = cashiers.find((c) => c.id === cashierId);
  if (!cashier?.pin_hash || !cashier.pin_salt) {
    throw new Error("الكاشير غير موجود");
  }
  const ok = await verifyPin(pin, cashier.pin_hash, cashier.pin_salt);
  if (!ok) throw new Error("رمز PIN غير صحيح");

  const mustChange =
    cashier.must_change_pin === true || isWeakPin(pin.trim());

  const session: CashierSession = {
    cashier_id: cashier.id,
    cashier_name: cashier.name,
    role: cashier.role,
    unlocked_at: new Date().toISOString(),
    must_change_pin: mustChange,
  };

  // Do not persist a session that still requires PIN change
  if (!mustChange) {
    await set(SESSION_KEY, session);
  }
  return session;
}

export async function lockSession() {
  await set(SESSION_KEY, null);
}
