import { useEffect, useState } from "react";
import { LockKey, ShieldCheck, UserCircle } from "@phosphor-icons/react";
import {
  Cashier,
  CashierSession,
  changeOwnPin,
  getSession,
  listCashiersForUi,
  unlockWithPin,
} from "../../lib/session";

export function CashierGate({
  onSession,
}: {
  onSession: (session: CashierSession) => void;
}) {
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [selected, setSelected] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pendingChange, setPendingChange] = useState<{
    cashierId: string;
    currentPin: string;
    name: string;
  } | null>(null);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  useEffect(() => {
    void (async () => {
      const [list, session] = await Promise.all([listCashiersForUi(), getSession()]);
      setCashiers(list);
      if (list[0]) setSelected(list[0].id);
      if (session && !session.must_change_pin) {
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

  const submitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const session = await unlockWithPin(selected, pin);
      if (session.must_change_pin) {
        const cashier = cashiers.find((c) => c.id === selected);
        setPendingChange({
          cashierId: selected,
          currentPin: pin,
          name: cashier?.name || session.cashier_name,
        });
        setPin("");
        return;
      }
      onSession(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تسجيل الدخول");
      setPin("");
    } finally {
      setBusy(false);
    }
  };

  const submitPinChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingChange) return;
    if (newPin !== confirmPin) {
      setError("رمزا PIN غير متطابقين");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const session = await changeOwnPin(
        pendingChange.cashierId,
        pendingChange.currentPin,
        newPin
      );
      onSession(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تغيير الرمز");
    } finally {
      setBusy(false);
    }
  };

  if (pendingChange) {
    return (
      <div className="relative grid min-h-[100dvh] place-items-center overflow-hidden bg-paper px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 45% at 20% 0%, rgb(var(--warning) / 0.14), transparent 55%), radial-gradient(ellipse 50% 40% at 100% 100%, rgb(var(--ink) / 0.05), transparent 50%)",
          }}
        />
        <form
          onSubmit={submitPinChange}
          className="panel relative z-[1] w-full max-w-sm space-y-5 p-6 sm:p-7"
        >
          <div className="space-y-1.5 text-center">
            <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-warning/15 text-warning">
              <ShieldCheck size={28} weight="duotone" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-ink">
              تأمين حسابك أولاً
            </h1>
            <p className="text-xs leading-relaxed text-ink-mute">
              مرحباً {pendingChange.name} — الرمز الحالي مؤقت أو ضعيف. اختر PIN
              جديداً من 4–6 أرقام غير متوقع قبل فتح المحل.
            </p>
          </div>

          <label className="block space-y-1.5 text-right">
            <span className="text-[11px] font-semibold text-ink-mute">
              PIN الجديد
            </span>
            <input
              className="input w-full text-center font-mono text-xl tracking-[0.4em]"
              inputMode="numeric"
              maxLength={6}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
              placeholder="••••"
              autoFocus
            />
          </label>

          <label className="block space-y-1.5 text-right">
            <span className="text-[11px] font-semibold text-ink-mute">
              تأكيد PIN
            </span>
            <input
              className="input w-full text-center font-mono text-xl tracking-[0.4em]"
              inputMode="numeric"
              maxLength={6}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
              placeholder="••••"
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
            disabled={busy || newPin.length < 4 || confirmPin.length < 4}
            className="btn-primary min-h-12 w-full text-sm font-bold disabled:opacity-50"
          >
            {busy ? "جاري الحفظ…" : "حفظ ودخول المحل"}
          </button>
        </form>
      </div>
    );
  }

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
        onSubmit={submitLogin}
        className="panel relative z-[1] w-full max-w-sm space-y-5 p-6 sm:p-7"
      >
        <div className="space-y-1.5 text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-highlight/12 text-highlight">
            <LockKey size={28} weight="duotone" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-ink">OmniSales</h1>
          <p className="text-xs leading-relaxed text-ink-mute">
            اختر المستخدم وأدخل رمز PIN لفتح جلسة البيع
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
                  {c.must_change_pin ? " · يتطلب تأمين" : ""}
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
          disabled={busy || pin.length < 4 || !selected}
          className="btn-primary min-h-12 w-full text-sm font-bold disabled:opacity-50"
        >
          {busy ? "جاري الفتح…" : "دخول نقطة البيع"}
        </button>
      </form>
    </div>
  );
}
