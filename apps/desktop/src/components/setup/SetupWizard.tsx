import { useState } from "react";
import {
  Buildings,
  CheckCircle,
  Printer,
  ShieldCheck,
  Storefront,
} from "@phosphor-icons/react";
import { saveSettings } from "../../lib/api";
import { changeOwnPin, listCashiers } from "../../lib/session";
import {
  canUseWebSerial,
  connectSerialPrinter,
  printTestSlip,
  serialSupportMessage,
} from "../../lib/print/escpos";
import { type BranchSettings } from "../../lib/types";
import { cn } from "../../lib/cn";

export function SetupWizard({
  settings,
  onComplete,
}: {
  settings: BranchSettings;
  onComplete: (next: BranchSettings) => void;
}) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(
    settings.name === "محلي" ? "" : settings.name
  );
  const [phone, setPhone] = useState(settings.phone || "");
  const [address, setAddress] = useState(settings.address || "");
  const [industry] = useState(
    settings.industry || "general_retail"
  );
  const [widthMm, setWidthMm] = useState(settings.thermal_width_mm || 80);
  const [autoPrint, setAutoPrint] = useState(
    settings.auto_print_thermal !== false
  );
  const [tempPin, setTempPin] = useState("9999");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [printerOk, setPrinterOk] = useState(false);

  const steps = ["المحل", "الأمان", "الطابعة", "تم"];

  const saveShop = async () => {
    if (!name.trim()) {
      setMsg("اسم المحل مطلوب");
      return false;
    }
    setBusy(true);
    setMsg(null);
    try {
      const next: BranchSettings = {
        ...settings,
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        industry,
        thermal_width_mm: widthMm,
        auto_print_thermal: autoPrint,
        pos_layout: settings.pos_layout,
      };
      await saveSettings(next);
      onComplete(next);
      return true;
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "فشل الحفظ");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const savePin = async () => {
    if (newPin !== confirmPin) {
      setMsg("رمزا PIN غير متطابقين");
      return false;
    }
    setBusy(true);
    setMsg(null);
    try {
      const cashiers = await listCashiers();
      const manager =
        cashiers.find((c) => c.role === "manager") || cashiers[0];
      if (!manager) throw new Error("لا يوجد مستخدم مدير");
      await changeOwnPin(manager.id, tempPin, newPin);
      setMsg("تم تأمين حساب المدير");
      return true;
    } catch (e) {
      setMsg(
        e instanceof Error
          ? `${e.message} — إن غيّرت PIN سابقاً أدخل الرمز الحالي في الحقل الأول`
          : "فشل تأمين PIN"
      );
      return false;
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    setBusy(true);
    try {
      const next: BranchSettings = {
        ...settings,
        name: name.trim() || settings.name,
        phone: phone.trim(),
        address: address.trim(),
        industry,
        thermal_width_mm: widthMm,
        auto_print_thermal: autoPrint,
        setup_complete: true,
      };
      await saveSettings(next);
      onComplete(next);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "فشل إنهاء الإعداد");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="screen-fill px-4 py-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 45% at 50% -5%, rgb(var(--highlight) / 0.14), transparent 55%), radial-gradient(ellipse 50% 40% at 100% 100%, rgb(var(--ink) / 0.04), transparent 50%)",
        }}
      />
      <div className="panel relative z-[1] w-full max-w-lg space-y-5 p-6 sm:p-7">
        <div className="text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-highlight/12 text-highlight">
            <Storefront size={28} weight="duotone" />
          </div>
          <h1 className="text-xl font-bold text-ink">إعداد OmniSales</h1>
          <p className="mt-1 text-xs text-ink-mute">
            خطوة سريعة لتهيئة محلك والطابعة الحرارية
          </p>
        </div>

        <div className="grid grid-cols-4 gap-1">
          {steps.map((label, i) => (
            <div
              key={label}
              className={cn(
                "rounded-full py-1 text-center text-[10px] font-bold",
                i === step
                  ? "bg-ink text-paper"
                  : i < step
                    ? "bg-success/15 text-success"
                    : "bg-paper text-ink-mute"
              )}
            >
              {label}
            </div>
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-3">
            <label className="block space-y-1 text-right">
              <span className="text-[11px] font-semibold text-ink-mute">
                اسم المحل *
              </span>
              <input
                className="input w-full text-sm font-bold"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: بقالة النور"
                autoFocus
              />
            </label>
            <label className="block space-y-1 text-right">
              <span className="text-[11px] font-semibold text-ink-mute">الهاتف</span>
              <input
                className="input w-full font-mono text-sm"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>
            <label className="block space-y-1 text-right">
              <span className="text-[11px] font-semibold text-ink-mute">العنوان</span>
              <input
                className="input w-full text-sm"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </label>
            <div className="rounded-xl border border-highlight/30 bg-highlight/8 p-3 text-right">
              <span className="text-[11px] font-bold text-highlight">نظام متكامل شامل</span>
              <p className="mt-0.5 text-[10px] text-ink-mute">
                جميع خيارات المبيعات والمخزون (IMEI، السيريال، الصلاحية، الموازين، وقطع الغيار) مفعّلة بمرونة كاملة في محلك.
              </p>
            </div>
            <button
              type="button"
              className="btn-primary min-h-11 w-full text-sm font-bold"
              disabled={busy}
              onClick={() =>
                void saveShop().then((ok) => {
                  if (ok) setStep(1);
                })
              }
            >
              <Buildings size={16} className="inline" /> متابعة
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <p className="rounded-xl bg-warning/10 px-3 py-2 text-[11px] text-warning">
              الرمز الافتراضي للمدير غالباً <strong>9999</strong> — استبدله الآن.
            </p>
            <label className="block space-y-1">
              <span className="text-[11px] font-semibold text-ink-mute">
                PIN الحالي (المؤقت)
              </span>
              <input
                className="input w-full text-center font-mono text-lg tracking-[0.35em]"
                inputMode="numeric"
                maxLength={6}
                value={tempPin}
                onChange={(e) => setTempPin(e.target.value.replace(/\D/g, ""))}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] font-semibold text-ink-mute">
                PIN الجديد
              </span>
              <input
                className="input w-full text-center font-mono text-lg tracking-[0.35em]"
                inputMode="numeric"
                maxLength={6}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] font-semibold text-ink-mute">تأكيد</span>
              <input
                className="input w-full text-center font-mono text-lg tracking-[0.35em]"
                inputMode="numeric"
                maxLength={6}
                value={confirmPin}
                onChange={(e) =>
                  setConfirmPin(e.target.value.replace(/\D/g, ""))
                }
              />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-ghost flex-1 text-xs"
                onClick={() => setStep(2)}
              >
                تخطي الآن
              </button>
              <button
                type="button"
                className="btn-primary flex-1 text-xs font-bold"
                disabled={busy || newPin.length < 4}
                onClick={() =>
                  void savePin().then((ok) => {
                    if (ok) setStep(2);
                  })
                }
              >
                <ShieldCheck size={14} className="inline" /> حفظ PIN
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <p className="text-xs leading-relaxed text-ink-mute">
              اربط طابعة USB حرارية ESC/POS عبر Chrome/Edge. بعد الربط اطبع ورقة
              اختبار للتأكد قبل أول بيع.
            </p>
            <p className="text-[11px] font-semibold text-ink">
              الدعم: {serialSupportMessage()}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <select
                className="input text-xs"
                value={widthMm}
                onChange={(e) => setWidthMm(Number(e.target.value))}
              >
                <option value={80}>80 ملم</option>
                <option value={58}>58 ملم</option>
              </select>
              <label className="flex items-center gap-2 rounded-xl border border-paper-line px-3 text-[11px]">
                <input
                  type="checkbox"
                  checked={autoPrint}
                  onChange={(e) => setAutoPrint(e.target.checked)}
                />
                طباعة تلقائية بعد البيع
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-primary text-xs font-bold"
                disabled={!canUseWebSerial() || busy}
                onClick={() => {
                  setBusy(true);
                  setMsg(null);
                  void connectSerialPrinter(undefined, { forcePicker: true })
                    .then(() => {
                      setPrinterOk(true);
                      setMsg("تم ربط الطابعة — جرّب ورقة الاختبار");
                    })
                    .catch((e) =>
                      setMsg(e instanceof Error ? e.message : "فشل الربط")
                    )
                    .finally(() => setBusy(false));
                }}
              >
                <Printer size={14} className="inline" /> ربط طابعة USB
              </button>
              <button
                type="button"
                className="btn-ghost text-xs font-bold"
                disabled={!canUseWebSerial() || busy}
                onClick={() => {
                  setBusy(true);
                  void printTestSlip(widthMm === 58 ? 58 : 80)
                    .then(() => {
                      setPrinterOk(true);
                      setMsg("طُبعت ورقة الاختبار بنجاح");
                    })
                    .catch((e) =>
                      setMsg(e instanceof Error ? e.message : "فشلت الطباعة")
                    )
                    .finally(() => setBusy(false));
                }}
              >
                طباعة اختبار
              </button>
            </div>
            {printerOk && (
              <p className="text-xs font-bold text-success">
                <CheckCircle size={14} className="inline" /> الطابعة جاهزة
              </p>
            )}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                className="btn-ghost flex-1 text-xs"
                onClick={() => setStep(3)}
              >
                تخطي
              </button>
              <button
                type="button"
                className="btn-primary flex-1 text-xs font-bold"
                onClick={() => setStep(3)}
              >
                متابعة
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 text-center">
            <CheckCircle
              size={40}
              weight="duotone"
              className="mx-auto text-success"
            />
            <div>
              <h2 className="text-lg font-bold text-ink">محلك جاهز</h2>
              <p className="mt-1 text-xs text-ink-mute">
                {name || settings.name} — افتح وردية وابدأ البيع من نقطة البيع
              </p>
            </div>
            <button
              type="button"
              className="btn-primary min-h-11 w-full text-sm font-bold"
              disabled={busy}
              onClick={() => void finish()}
            >
              دخول المنظومة
            </button>
          </div>
        )}

        {msg && (
          <p
            role="alert"
            className="rounded-xl bg-paper px-3 py-2 text-center text-xs font-medium text-ink"
          >
            {msg}
          </p>
        )}
      </div>
    </div>
  );
}
