import { useState } from "react";
import { User, UserPlus, X, MagnifyingGlass, Check } from "@phosphor-icons/react";
import type { Customer } from "../../lib/types";

interface CustomerSelectModalProps {
  customers: Customer[];
  selectedCustomer: Customer | null;
  onSelect: (customer: Customer | null) => void;
  onAddCustomer: (customer: Omit<Customer, "id" | "created_at" | "balance">) => Promise<Customer>;
  onClose: () => void;
}

export function CustomerSelectModal({
  customers,
  selectedCustomer,
  onSelect,
  onAddCustomer,
  onClose,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-paper-line bg-paper-raised p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-paper-line pb-4">
          <div className="flex items-center gap-2">
            <User size={20} className="text-amber-600" />
            <h2 className="text-lg font-bold text-ink">تحديد العميل</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1 text-ink-mute hover:bg-paper">
            <X size={20} />
          </button>
        </div>

        {!showAddForm ? (
          <div className="mt-4 space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <MagnifyingGlass size={16} className="absolute right-3 top-3 text-ink-mute" />
                <input
                  type="text"
                  placeholder="ابحث بالاسم أو رقم الهاتف..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full rounded-full border border-paper-line bg-paper pr-9 pl-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-ink"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="btn-primary text-xs inline-flex items-center gap-1 shrink-0"
              >
                <UserPlus size={16} />
                عميل جديد
              </button>
            </div>

            <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
              <button
                type="button"
                onClick={() => {
                  onSelect(null);
                  onClose();
                }}
                className={`flex w-full items-center justify-between rounded-xl border p-3 text-right text-xs transition ${
                  selectedCustomer === null
                    ? "border-ink bg-paper font-bold"
                    : "border-paper-line hover:border-ink/30"
                }`}
              >
                <div>
                  <div className="font-bold text-ink">عميل نقدي عام</div>
                  <div className="text-[11px] text-ink-mute">بدون حساب مؤجل</div>
                </div>
                {selectedCustomer === null && <Check size={16} className="text-emerald-600" />}
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
                    className={`flex w-full items-center justify-between rounded-xl border p-3 text-right text-xs transition ${
                      isSelected
                        ? "border-ink bg-paper font-bold"
                        : "border-paper-line hover:border-ink/30"
                    }`}
                  >
                    <div>
                      <div className="font-bold text-ink">{cust.name}</div>
                      <div className="text-[11px] text-ink-mute">
                        {cust.phone} • الديون:{" "}
                        <span className={cust.balance > 0 ? "text-red-600 font-bold" : ""}>
                          {cust.balance.toFixed(2)} د.ل
                        </span>
                      </div>
                    </div>
                    {isSelected && <Check size={16} className="text-emerald-600" />}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="mt-4 space-y-3">
            <div>
              <label className="text-xs font-semibold text-ink">اسم العميل *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-paper-line bg-paper px-3 py-2 text-xs"
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
                className="mt-1 w-full rounded-xl border border-paper-line bg-paper px-3 py-2 text-xs"
                placeholder="091-0000000"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink">البريد الإلكتروني</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-paper-line bg-paper px-3 py-2 text-xs"
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink">حد الائتمان (الأقصى للآجل)</label>
              <input
                type="number"
                value={creditLimit}
                onChange={(e) => setCreditLimit(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-paper-line bg-paper px-3 py-2 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-paper-line">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="btn-ghost text-xs"
              >
                إلغاء
              </button>
              <button type="submit" disabled={saving} className="btn-primary text-xs">
                {saving ? "جاري الحفظ..." : "حفظ وحساب العميل"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
