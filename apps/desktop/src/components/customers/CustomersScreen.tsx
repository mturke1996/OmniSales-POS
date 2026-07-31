import { useState } from "react";
import {
  UserPlus,
  MagnifyingGlass,
  PlusCircle,
  X,
  UserCircle,
} from "@phosphor-icons/react";
import { addCustomer, recordCustomerPayment } from "../../lib/api";
import { formatMoney } from "../../lib/format";
import { debtReminderMessage, paymentReceiptMessage } from "../../lib/whatsapp";
import { WhatsAppButton } from "../ui/WhatsAppButton";
import { MobileDataCard, MobileDataList } from "../ui/MobileDataList";
import type { BranchSettings, Customer } from "../../lib/types";

interface CustomersScreenProps {
  customers: Customer[];
  settings: BranchSettings;
  onRefreshData: () => void;
  onOpenProfile: (customerId: string) => void;
}

export function CustomersScreen({
  customers,
  settings,
  onRefreshData,
  onOpenProfile,
}: CustomersScreenProps) {
  const [query, setQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [paymentCustomer, setPaymentCustomer] = useState<Customer | null>(null);

  const filtered = customers.filter(
    (c) =>
      c.name.includes(query) ||
      c.phone.includes(query) ||
      (c.email && c.email.includes(query))
  );

  const totalDebts = customers.reduce((sum, c) => sum + c.balance, 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-paper-line pb-4">
        <div>
          <h2 className="text-xl font-bold text-ink">العملاء والديون</h2>
          <p className="text-xs text-ink-mute">
            ملف لكل عميل · كشف حساب · مبيعات · واتساب · تحصيل
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="btn-primary inline-flex items-center gap-1.5 text-xs font-bold"
        >
          <UserPlus size={16} />
          إضافة عميل جديد
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-paper-line bg-paper-raised p-4 shadow-xs">
          <div className="text-xs text-ink-mute">عدد العملاء</div>
          <div className="mt-1 font-mono text-xl font-bold text-ink">
            {customers.length}
          </div>
        </div>
        <div className="rounded-2xl border border-danger/30 bg-danger/5 p-4 shadow-xs">
          <div className="text-xs font-semibold text-danger">إجمالي الديون</div>
          <div className="mt-1 font-mono text-xl font-bold text-danger">
            {formatMoney(totalDebts, settings.currency_symbol)}
          </div>
        </div>
        <div className="rounded-2xl border border-paper-line bg-paper-raised p-4 shadow-xs">
          <div className="text-xs text-ink-mute">عملاء عليهم دين</div>
          <div className="mt-1 font-mono text-xl font-bold text-ink">
            {customers.filter((c) => c.balance > 0).length}
          </div>
        </div>
      </div>

      <div className="relative">
        <MagnifyingGlass
          size={18}
          className="absolute end-3.5 top-3 text-ink-mute"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث بالاسم أو الهاتف..."
          className="w-full rounded-full border border-paper-line bg-paper-raised py-2.5 pe-10 ps-4 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ink"
        />
      </div>

      <MobileDataList empty={!filtered.length} emptyLabel="لا يوجد عملاء مطابقون">
        {filtered.map((cust) => (
          <MobileDataCard
            key={cust.id}
            title={cust.name}
            subtitle={cust.phone}
            meta={
              <>
                <span>{cust.address || "بدون عنوان"}</span>
                <span className="font-mono">
                  حد: {formatMoney(cust.credit_limit, settings.currency_symbol)}
                </span>
              </>
            }
            badge={
              <span
                className={
                  cust.balance > 0
                    ? "rounded-lg bg-danger/10 px-2 py-1 font-mono text-[11px] font-bold text-danger"
                    : "rounded-lg bg-success/10 px-2 py-1 font-mono text-[11px] font-bold text-success"
                }
              >
                {formatMoney(cust.balance, settings.currency_symbol)}
              </span>
            }
            onClick={() => onOpenProfile(cust.id)}
            actions={
              <>
                <button
                  type="button"
                  onClick={() => onOpenProfile(cust.id)}
                  className="touch-chip bg-ink text-paper"
                >
                  <UserCircle size={15} />
                  الملف
                </button>
                <WhatsAppButton
                  phone={cust.phone}
                  message={
                    cust.balance > 0
                      ? debtReminderMessage(
                          cust.name,
                          cust.balance,
                          settings.currency_symbol,
                          settings.name
                        )
                      : undefined
                  }
                  variant="ghost"
                />
                {cust.balance > 0 && (
                  <button
                    type="button"
                    onClick={() => setPaymentCustomer(cust)}
                    className="touch-chip bg-success text-white"
                  >
                    <PlusCircle size={15} />
                    تسديد
                  </button>
                )}
              </>
            }
          />
        ))}
      </MobileDataList>

      <div className="hidden overflow-x-auto rounded-2xl border border-paper-line bg-paper-raised shadow-xs md:block">
        <table className="w-full text-right text-xs">
          <thead className="border-b border-paper-line bg-paper font-bold text-ink-mute">
            <tr>
              <th className="p-3">اسم العميل</th>
              <th className="p-3">الهاتف</th>
              <th className="p-3">العنوان</th>
              <th className="p-3">حد الائتمان</th>
              <th className="p-3">الدين</th>
              <th className="p-3 text-left">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-paper-line">
            {!filtered.length ? (
              <tr>
                <td colSpan={6} className="p-10 text-center text-ink-mute">
                  لا يوجد عملاء مطابقون
                </td>
              </tr>
            ) : (
              filtered.map((cust) => (
                <tr key={cust.id} className="hover:bg-paper/50">
                  <td className="p-3">
                    <button
                      type="button"
                      onClick={() => onOpenProfile(cust.id)}
                      className="font-bold text-ink hover:text-highlight hover:underline"
                    >
                      {cust.name}
                    </button>
                  </td>
                  <td className="p-3 font-mono text-ink-mute">{cust.phone}</td>
                  <td className="p-3 text-ink-mute">{cust.address || "—"}</td>
                  <td className="p-3 font-mono">
                    {formatMoney(cust.credit_limit, settings.currency_symbol)}
                  </td>
                  <td className="p-3 font-mono">
                    <span
                      className={
                        cust.balance > 0
                          ? "rounded bg-danger/10 px-2 py-0.5 font-bold text-danger"
                          : "font-bold text-success"
                      }
                    >
                      {formatMoney(cust.balance, settings.currency_symbol)}
                    </span>
                  </td>
                  <td className="p-3 text-left">
                    <div className="inline-flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onOpenProfile(cust.id)}
                        className="inline-flex items-center gap-1 rounded-full bg-ink px-3 py-1 text-[11px] font-bold text-paper"
                      >
                        <UserCircle size={14} />
                        الملف
                      </button>
                      <WhatsAppButton
                        phone={cust.phone}
                        message={
                          cust.balance > 0
                            ? debtReminderMessage(
                                cust.name,
                                cust.balance,
                                settings.currency_symbol,
                                settings.name
                              )
                            : undefined
                        }
                        variant="ghost"
                      />
                      {cust.balance > 0 && (
                        <button
                          type="button"
                          onClick={() => setPaymentCustomer(cust)}
                          className="inline-flex items-center gap-1 rounded-full bg-success px-3 py-1 text-[11px] font-semibold text-white"
                        >
                          <PlusCircle size={14} />
                          تسديد
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {paymentCustomer && (
        <RecordPaymentModal
          customer={paymentCustomer}
          settings={settings}
          onClose={() => setPaymentCustomer(null)}
          onSuccess={() => {
            setPaymentCustomer(null);
            onRefreshData();
          }}
        />
      )}

      {showAddModal && (
        <AddCustomerModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            onRefreshData();
          }}
        />
      )}
    </div>
  );
}

function RecordPaymentModal({
  customer,
  settings,
  onClose,
  onSuccess,
}: {
  customer: Customer;
  settings: BranchSettings;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState(customer.balance);
  const [note, setNote] = useState("سداد دفعة حساب نقداً");
  const [saving, setSaving] = useState(false);
  const [sendWa, setSendWa] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) return;
    setSaving(true);
    try {
      const updated = await recordCustomerPayment(
        customer.id,
        Number(amount),
        note
      );
      if (sendWa) {
        const { openWhatsApp } = await import("../../lib/whatsapp");
        openWhatsApp(
          customer.phone,
          paymentReceiptMessage(
            customer.name,
            Number(amount),
            updated.balance,
            settings.currency_symbol,
            settings.name
          )
        );
      }
      onSuccess();
    } catch (err) {
      alert(err instanceof Error ? err.message : "فشل تسجيل الدفعة");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app-modal-backdrop">
      <div className="app-modal-panel">
        <div className="flex items-center justify-between border-b border-paper-line pb-3">
          <h3 className="font-bold text-ink">تسجيل دفعة سداد</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-ink-mute hover:bg-paper"
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div className="space-y-1 rounded-xl bg-paper p-3 text-xs">
            <div>
              العميل: <span className="font-bold">{customer.name}</span>
            </div>
            <div>
              الدين:{" "}
              <span className="font-mono font-bold text-danger">
                {formatMoney(customer.balance, settings.currency_symbol)}
              </span>
            </div>
          </div>
          <input
            type="number"
            step="0.01"
            required
            max={customer.balance}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full rounded-xl border border-paper-line bg-paper px-3 py-2 font-mono text-sm font-bold"
          />
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-xl border border-paper-line bg-paper px-3 py-2 text-xs"
          />
          <label className="flex items-center gap-2 text-xs font-semibold">
            <input
              type="checkbox"
              checked={sendWa}
              onChange={(e) => setSendWa(e.target.checked)}
            />
            إرسال واتساب بعد السداد
          </label>
          <div className="flex justify-end gap-2 border-t border-paper-line pt-3">
            <button type="button" onClick={onClose} className="btn-ghost text-xs">
              إلغاء
            </button>
            <button type="submit" disabled={saving} className="btn-primary text-xs font-bold">
              {saving ? "جاري…" : "تأكيد"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddCustomerModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [creditLimit, setCreditLimit] = useState(1000);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;
    setSaving(true);
    try {
      await addCustomer({
        name,
        phone,
        address: address || undefined,
        credit_limit: Number(creditLimit),
      });
      onSuccess();
    } catch (err) {
      alert(err instanceof Error ? err.message : "فشل إضافة العميل");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app-modal-backdrop">
      <div className="app-modal-panel">
        <div className="flex items-center justify-between border-b border-paper-line pb-3">
          <h3 className="font-bold text-ink">إضافة عميل جديد</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-ink-mute hover:bg-paper"
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="اسم العميل *"
            className="w-full rounded-xl border border-paper-line bg-paper px-3 py-2 text-xs font-bold"
          />
          <input
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="رقم الهاتف *"
            className="w-full rounded-xl border border-paper-line bg-paper px-3 py-2 font-mono text-xs"
          />
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="العنوان"
            className="w-full rounded-xl border border-paper-line bg-paper px-3 py-2 text-xs"
          />
          <input
            type="number"
            value={creditLimit}
            onChange={(e) => setCreditLimit(Number(e.target.value))}
            placeholder="حد الائتمان"
            className="w-full rounded-xl border border-paper-line bg-paper px-3 py-2 font-mono text-xs"
          />
          <div className="flex justify-end gap-2 border-t border-paper-line pt-3">
            <button type="button" onClick={onClose} className="btn-ghost text-xs">
              إلغاء
            </button>
            <button type="submit" disabled={saving} className="btn-primary text-xs font-bold">
              {saving ? "جاري…" : "حفظ"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
