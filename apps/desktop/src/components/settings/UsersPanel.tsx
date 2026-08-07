import { useEffect, useState } from "react";
import { Plus, Trash, UserGear } from "@phosphor-icons/react";
import {
  addCashier,
  listCashiersForUi,
  removeCashier,
  updateCashier,
  type Cashier,
} from "../../lib/session";

export function UsersPanel({ currentUserId }: { currentUserId?: string }) {
  const [users, setUsers] = useState<Cashier[]>([]);
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [role, setRole] = useState<Cashier["role"]>("cashier");
  const [busy, setBusy] = useState(false);

  const reload = () => void listCashiersForUi().then(setUsers);

  useEffect(() => {
    reload();
  }, []);

  return (
    <div className="panel space-y-4 p-5">
      <div className="flex items-center gap-2 border-b border-paper-line pb-2">
        <UserGear size={20} className="text-highlight" weight="duotone" />
        <div>
          <h2 className="text-sm font-bold text-ink">المستخدمون والصلاحيات</h2>
          <p className="text-[11px] text-ink-mute">
            أضف كاشير أو مدير · كل مستخدم يدخل برمز PIN خاص
          </p>
        </div>
      </div>

      <form
        className="grid gap-2 sm:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          setBusy(true);
          void addCashier({ name, pin, role })
            .then(() => {
              setName("");
              setPin("");
              setRole("cashier");
              reload();
            })
            .catch((err) =>
              alert(err instanceof Error ? err.message : "فشل الإضافة")
            )
            .finally(() => setBusy(false));
        }}
      >
        <input
          className="input text-xs sm:col-span-2"
          placeholder="اسم المستخدم"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="input font-mono text-xs tracking-widest"
          placeholder="PIN (4–6)"
          inputMode="numeric"
          required
          minLength={4}
          maxLength={6}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
        />
        <select
          className="input text-xs"
          value={role}
          onChange={(e) => setRole(e.target.value as Cashier["role"])}
        >
          <option value="cashier">كاشير</option>
          <option value="manager">مدير</option>
        </select>
        <button
          type="submit"
          disabled={busy || pin.length < 4}
          className="btn-primary text-xs font-bold sm:col-span-4"
        >
          <Plus size={14} className="inline" /> إضافة مستخدم
        </button>
      </form>

      <div className="space-y-2">
        {users.map((u) => (
          <div
            key={u.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-paper-line bg-paper px-3 py-2.5 text-xs"
          >
            <div className="min-w-0">
              <p className="font-bold text-ink">
                {u.name}
                {u.id === currentUserId ? (
                  <span className="ms-2 text-[10px] font-semibold text-highlight">
                    (أنت)
                  </span>
                ) : null}
              </p>
              <p className="text-[11px] text-ink-mute">
                {u.role === "manager" ? "مدير" : "كاشير"} · PIN مخفي
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <select
                className="rounded-full border border-paper-line bg-paper-raised px-2 py-1 text-[11px] font-bold"
                value={u.role}
                onChange={(e) =>
                  void updateCashier(u.id, {
                    role: e.target.value as Cashier["role"],
                  })
                    .then(reload)
                    .catch((err) =>
                      alert(err instanceof Error ? err.message : "فشل")
                    )
                }
              >
                <option value="cashier">كاشير</option>
                <option value="manager">مدير</option>
              </select>
              <button
                type="button"
                className="rounded-full border border-paper-line px-2 py-1 text-[11px] font-bold"
                onClick={() => {
                  const next = prompt("رمز PIN الجديد (4–6 أرقام)");
                  if (!next) return;
                  void updateCashier(u.id, { pin: next.replace(/\D/g, "") })
                    .then(reload)
                    .catch((err) =>
                      alert(err instanceof Error ? err.message : "فشل")
                    );
                }}
              >
                تغيير PIN
              </button>
              <button
                type="button"
                disabled={u.id === currentUserId}
                title={
                  u.id === currentUserId
                    ? "لا يمكن حذف حسابك الحالي"
                    : "حذف"
                }
                className="rounded-full border border-danger/30 p-1.5 text-danger disabled:opacity-30"
                onClick={() => {
                  if (!confirm(`حذف المستخدم «${u.name}»؟`)) return;
                  void removeCashier(u.id)
                    .then(reload)
                    .catch((err) =>
                      alert(err instanceof Error ? err.message : "فشل الحذف")
                    );
                }}
              >
                <Trash size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
