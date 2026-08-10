import { useState } from "react";
import { User, UserPlus, MagnifyingGlass, Check } from "@phosphor-icons/react";
import type { Customer } from "../../lib/types";
import { BottomSheet } from "../ui/BottomSheet";

interface CustomerSelectModalProps {
  customers: Customer[];
  selectedCustomer: Customer | null;
  onSelect: (customer: Customer | null) => void;
  onAddCustomer: (customer: Omit<Customer, "id" | "created_at" | "balance">) => Promise<Customer>;
  onClose: () => void;
  mobile?: boolean;
}

export function CustomerSelectModal({
  customers,
  selectedCustomer,
  onSelect,
  onAddCustomer,
  onClose,
  mobile = false,
}: CustomerSelectModalProps) {
  const [query, setQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [creditLimit, setCreditLimit] = useState(1000);
  const [saving, setSaving] = useState(false);

  const filtered = customers.filter(
    (c) => c.name.includes(query) || c.phone.includes(query) || (c.email && c.email.includes(query))
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;
    setSaving(true);
    try {
      const created = await onAddCustomer({
        name,
        phone,
        email: email || undefined,
        credit_limit: Number(creditLimit),
      });
      onSelect(created);
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : "فشل إضافة العميل");
    } finally {
      setSaving(false);
    }
  };

  const body = !showAddForm ? (
    <div className="space-y-3 p-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <MagnifyingGlass size={16} className="absolute end-3 top-3 text-ink-mute" />
          <input
            type="text"
            placeholder="ابحث بالاسم أو رقم الهاتف..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input-field text-xs"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="btn-primary inline-flex shrink-0 items-center gap-1 text-xs"
        >
          <UserPlus size={16} />
          جديد
        </button>
      </div>

      <div className="max-h-[50vh] space-y-2 overflow-y-auto">
        <button
          type="button"
          onClick={() => {
            onSelect(null);
            onClose();
          }}
          className={`flex w-full items-center justify-between rounded-xl border p-3 text-xs transition ${
            selectedCustomer === null
              ? "border-highlight bg-highlight/8 font-bold"
              : "border-paper-line hover:border-highlight/30"
          }`}
        >
          <div className="text-start">
            <div className="font-bold text-ink">عميل نقدي عام</div>
            <div className="text-[11px] text-ink-mute">بدون حساب مؤجل</div>
          </div>
          {selectedCustomer === null && <Check size={16} className="text-success" />}
        </button>

        {filtered.map((cust) => {
          const isSelected = selectedCustomer?.id === cust.id;
          return (
            <button
              key={cust.id}
              type="button"
              onClick={() => {
                onSelect(cust);
                onClose();
              }}
              className={`flex w-full items-center justify-between rounded-xl border p-3 text-xs transition ${
                isSelected
                  ? "border-highlight bg-highlight/8 font-bold"
                  : "border-paper-line hover:border-highlight/30"
              }`}
            >
              <div className="text-start">
                <div className="font-bold text-ink">{cust.name}</div>
                <div className="text-[11px] text-ink-mute">
                  {cust.phone} • الديون:{" "}
                  <span className={cust.balance > 0 ? "font-bold text-danger" : ""}>
                    {cust.balance.toFixed(2)} د.ل
                  </span>
                </div>
              </div>
              {isSelected && <Check size={16} className="text-success" />}
            </button>
          );
        })}
      </div>
    </div>
  ) : (
    <form onSubmit={handleCreate} className="space-y-3 p-4">
      <div>
        <label className="text-xs font-semibold text-ink">اسم العميل *</label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input-field mt-1 text-xs"
          placeholder="مثال: شركة الأفق"
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-ink">رقم الهاتف *</label>
        <input
          type="text"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="input-field mt-1 text-xs"
          placeholder="091-0000000"
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-ink">البريد الإلكتروني</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-field mt-1 text-xs"
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-ink">حد الائتمان</label>
        <input
          type="number"
          value={creditLimit}
          onChange={(e) => setCreditLimit(Number(e.target.value))}
          className="input-field mt-1 text-xs"
        />
      </div>

      <div className="flex justify-end gap-2 border-t border-paper-line pt-3">
        <button type="button" onClick={() => setShowAddForm(false)} className="btn-ghost text-xs">
          إلغاء
        </button>
        <button type="submit" disabled={saving} className="btn-primary text-xs">
          {saving ? "جاري الحفظ..." : "حفظ العميل"}
        </button>
      </div>
    </form>
  );

  if (mobile) {
    return (
      <BottomSheet open onOpenChange={(v) => !v && onClose()} title="تحديد العميل">
        {body}
      </BottomSheet>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-paper-line bg-paper-raised shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-paper-line px-6 py-4">
          <User size={20} className="text-highlight" />
          <h2 className="text-lg font-bold text-ink">تحديد العميل</h2>
        </div>
        {body}
      </div>
    </div>
  );
}
