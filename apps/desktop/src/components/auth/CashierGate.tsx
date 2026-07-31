import { useEffect, useState } from "react";
import { LockKey, UserCircle } from "@phosphor-icons/react";
import {
  Cashier,
  CashierSession,
  getSession,
  listCashiers,
  unlockWithPin,
} from "../../lib/session";

export function CashierGate({
  onSession,
}: {
  onSession: (session: CashierSession) => void;
}) {
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [selected, setSelected] = useState("cashier-1");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const [list, session] = await Promise.all([listCashiers(), getSession()]);
      setCashiers(list);
      if (list[0]) setSelected(list[0].id);
      if (session) {
        onSession(session);
      }
      setChecking(false);
    })();
  }, [onSession]);

  if (checking) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-paper px-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        <p className="text-sm text-ink-mute">جاري التحقق من جلسة الكاشير…</p>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const session = await unlockWithPin(selected, pin);
      onSession(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تسجيل الدخول");
      setPin("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative grid min-h-[100dvh] place-items-center overflow-hidden bg-paper px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgb(var(--highlight) / 0.12), transparent 55%), radial-gradient(ellipse 60% 40% at 100% 100%, rgb(var(--ink) / 0.04), transparent 50%)",
        }}
      />
      <form
        onSubmit={submit}
        className="panel relative z-[1] w-full max-w-sm space-y-5 p-6 sm:p-7"
      >
        <div className="space-y-1.5 text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-highlight/12 text-highlight">
            <LockKey size={28} weight="duotone" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-ink">
            فتح جلسة الكاشير
          </h1>
          <p className="text-xs leading-relaxed text-ink-mute">
            اختر المستخدم وأدخل رمز PIN الخاص به للمتابعة
          </p>
        </div>

        <label className="block space-y-1.5 text-right">
          <span className="text-[11px] font-semibold text-ink-mute">المستخدم</span>
          <div className="relative">
            <UserCircle
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-mute"
            />
            <select
              className="input w-full appearance-none pl-10 text-sm"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              {cashiers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.role === "manager" ? "مدير" : "كاشير"})
                </option>
              ))}
            </select>
          </div>
        </label>

        <label className="block space-y-1.5 text-right">
          <span className="text-[11px] font-semibold text-ink-mute">رمز PIN</span>
          <input
            className="input w-full text-center font-mono text-xl tracking-[0.4em]"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            placeholder="••••"
            autoFocus
          />
        </label>

        {error && (
          <p
            role="alert"
            className="rounded-xl bg-danger/10 px-3 py-2.5 text-center text-xs font-medium text-danger"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy || pin.length < 4}
          className="btn-primary min-h-12 w-full text-sm font-bold disabled:opacity-50"
        >
          {busy ? "جاري الفتح…" : "دخول نقطة البيع"}
        </button>
      </form>
    </div>
  );
}
