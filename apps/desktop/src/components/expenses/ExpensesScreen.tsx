import { useState } from "react";
import { Plus, X } from "@phosphor-icons/react";
import { addExpense } from "../../lib/api";
import type { BranchSettings, Expense } from "../../lib/types";
import { MobileDataCard, MobileDataList } from "../ui/MobileDataList";

interface ExpensesScreenProps {
  expenses: Expense[];
  settings: BranchSettings;
  onRefreshData: () => void;
}

export function ExpensesScreen({ expenses, settings, onRefreshData }: ExpensesScreenProps) {
  const [query, setQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  const filtered = expenses.filter(
    (e) => e.category.includes(query) || e.note.includes(query)
  );

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-paper-line pb-4 gap-3">
        <div>
          <h2 className="text-xl font-bold text-ink">إدارة المصروفات والتكاليف (Expenses Ledger)</h2>
          <p className="text-xs text-ink-mute">
            تسجيل المصروفات التشغيلية اليومية وتتبع التكاليف.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="btn-primary text-xs inline-flex items-center gap-1.5 font-bold"
        >
          <Plus size={16} />
          تسجيل مصروف جديد
        </button>
      </div>

      {/* Stats Box */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-paper-line bg-paper-raised p-4 shadow-xs">
          <div className="text-xs text-ink-mute">إجمالي المصروفات المسجلة</div>
          <div className="mt-1 text-2xl font-bold font-mono text-ink">
            {totalExpenses.toFixed(2)} {settings.currency_symbol}
          </div>
        </div>

        <div className="rounded-2xl border border-paper-line bg-paper-raised p-4 shadow-xs">
          <div className="text-xs text-ink-mute">عدد الفواتير/السندات</div>
          <div className="mt-1 text-2xl font-bold font-mono text-ink">{expenses.length} سند</div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث بتصنيف المصروف أو البيان..."
          className="w-full rounded-full border border-paper-line bg-paper-raised px-4 py-2.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ink"
        />
      </div>

      <MobileDataList empty={!filtered.length} emptyLabel="لا توجد مصروفات مسجلة">
        {filtered.map((exp) => (
          <MobileDataCard
            key={exp.id}
            title={exp.category}
            subtitle={exp.note || "بدون بيان"}
            meta={
              <span>{new Date(exp.created_at).toLocaleString("ar-LY")}</span>
            }
            badge={
              <span className="font-mono text-sm font-bold text-danger">
                −{exp.amount.toFixed(2)} {settings.currency_symbol}
              </span>
            }
          />
        ))}
      </MobileDataList>

      <div className="hidden overflow-x-auto rounded-2xl border border-paper-line bg-paper-raised shadow-xs md:block">
        <table className="w-full text-right text-xs">
          <thead className="bg-paper text-ink-mute font-bold border-b border-paper-line">
            <tr>
              <th className="p-3">التصنيف</th>
              <th className="p-3">المبلغ</th>
              <th className="p-3">البيان / الملاحظة</th>
              <th className="p-3">التاريخ والوقت</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-paper-line">
            {!filtered.length ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-ink-mute">
                  لا توجد مصروفات مسجلة
                </td>
              </tr>
            ) : (
              filtered.map((exp) => (
                <tr key={exp.id} className="hover:bg-paper/50">
                  <td className="p-3 font-bold text-ink">{exp.category}</td>
                  <td className="p-3 font-mono font-bold text-red-600">
                    -{exp.amount.toFixed(2)} {settings.currency_symbol}
                  </td>
                  <td className="p-3 text-ink-mute">{exp.note || "-"}</td>
                  <td className="p-3 text-ink-mute">
                    {new Date(exp.created_at).toLocaleString("ar-LY")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Expense Modal */}
      {showAddModal && (
        <AddExpenseModal
          settings={settings}
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

function AddExpenseModal({
  settings,
  onClose,
  onSuccess,
}: {
  settings: BranchSettings;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [category, setCategory] = useState("كهرباء ومرافق");
  const [amount, setAmount] = useState(50);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) return;
    setSaving(true);
    try {
      await addExpense({
        category,
        amount: Number(amount),
        note,
      });
      onSuccess();
    } catch (err) {
      alert(err instanceof Error ? err.message : "فشل تسجيل المصروف");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app-modal-backdrop">
      <div className="app-modal-panel">
        <div className="flex items-center justify-between border-b border-paper-line pb-3">
          <h3 className="font-bold text-ink">تسجيل مصروف جديد</h3>
          <button type="button" onClick={onClose} className="rounded-full p-1 text-ink-mute hover:bg-paper">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-bold text-ink">تصنيف المصروف</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded-xl border border-paper-line bg-paper px-3 py-2 text-xs font-bold"
            >
              <option value="إيجار المحل">إيجار المحل</option>
              <option value="كهرباء ومرافق">كهرباء ومرافق</option>
              <option value="مستلزمات تغليف">مستلزمات تغليف وطباعة</option>
              <option value="أجور ومكافآت">أجور ومكافآت موظفين</option>
              <option value="صيانة ومعدات">صيانة ومعدات</option>
              <option value="مصروفات نثرية">مصروفات نثرية أخرى</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-ink">المبلغ ({settings.currency_symbol}) *</label>
            <input
              type="number"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-paper-line bg-paper px-3 py-2 text-sm font-mono font-bold"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-ink">البيان / الملاحظات</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1 w-full rounded-xl border border-paper-line bg-paper px-3 py-2 text-xs"
              placeholder="مثال: فاتورة كهرباء شهر يوليو"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-paper-line">
            <button type="button" onClick={onClose} className="btn-ghost text-xs">
              إلغاء
            </button>
            <button type="submit" disabled={saving} className="btn-primary text-xs font-bold">
              {saving ? "جاري الحفظ..." : "حفظ المصروف"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
