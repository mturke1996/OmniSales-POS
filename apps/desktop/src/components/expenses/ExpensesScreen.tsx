import { useMemo, useState } from "react";
import { Plus, X } from "@phosphor-icons/react";
import { addExpense } from "../../lib/api";
import type { BranchSettings, Expense } from "../../lib/types";
import { MobileDataCard, MobileDataList } from "../ui/MobileDataList";
import { PageHeader } from "../layout/PageHeader";
import { PageContent } from "../layout/PageContent";
import { SearchField } from "../ui/SearchField";
import { DataTable } from "../ui/DataTable";
import type { ColumnDef } from "@tanstack/react-table";

interface ExpensesScreenProps {
  expenses: Expense[];
  settings: BranchSettings;
  onRefreshData: () => void;
  hasOpenShift?: boolean;
  cashierId?: string;
}

export function ExpensesScreen({
  expenses,
  settings,
  onRefreshData,
  hasOpenShift = false,
  cashierId,
}: ExpensesScreenProps) {
  const [query, setQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  const filtered = expenses.filter(
    (e) => e.category.includes(query) || e.note.includes(query)
  );

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const columns: ColumnDef<Expense, unknown>[] = useMemo(
    () => [
      {
        accessorKey: "category",
        header: "التصنيف",
        cell: ({ row }) => (
          <span className="font-bold text-ink">{row.original.category}</span>
        ),
      },
      {
        accessorKey: "amount",
        header: "المبلغ",
        cell: ({ row }) => (
          <span className="money-big font-bold text-danger">
            −{row.original.amount.toFixed(2)} {settings.currency_symbol}
          </span>
        ),
      },
      {
        accessorKey: "note",
        header: "البيان",
        cell: ({ row }) => row.original.note || "—",
      },
      {
        accessorKey: "created_at",
        header: "التاريخ",
        cell: ({ row }) =>
          new Date(row.original.created_at).toLocaleString("ar-LY"),
      },
    ],
    [settings.currency_symbol]
  );

  return (
    <>
      <PageHeader
        title="المصروفات"
        description="تسجيل المصروفات التشغيلية اليومية وتتبع التكاليف"
        breadcrumbs={[{ label: "OmniSales" }, { label: "المالية" }, { label: "المصروفات" }]}
        actions={
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="btn-primary inline-flex items-center gap-1.5 text-xs font-bold"
          >
            <Plus size={16} />
            تسجيل مصروف
          </button>
        }
      />
      <PageContent size="narrow" className="space-y-6">

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

      <SearchField
        value={query}
        onChange={setQuery}
        placeholder="ابحث بتصنيف المصروف أو البيان…"
      />

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
              <span className="inline-flex flex-col items-end gap-0.5">
                <span className="font-mono text-sm font-bold text-danger">
                  −{exp.amount.toFixed(2)} {settings.currency_symbol}
                </span>
                {exp.from_drawer ? (
                  <span className="text-[10px] font-bold text-warning">من الصندوق</span>
                ) : (
                  <span className="text-[10px] text-ink-mute">خارج الصندوق</span>
                )}
              </span>
            }
          />
        ))}
      </MobileDataList>

      <div className="hidden md:block">
        <DataTable
          data={filtered}
          columns={columns}
          emptyMessage="لا توجد مصروفات مسجلة"
        />
      </div>

      {/* Add Expense Modal */}
      {showAddModal && (
        <AddExpenseModal
          settings={settings}
          hasOpenShift={hasOpenShift}
          cashierId={cashierId}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            onRefreshData();
          }}
        />
      )}
      </PageContent>
    </>
  );
}

function AddExpenseModal({
  settings,
  hasOpenShift,
  cashierId,
  onClose,
  onSuccess,
}: {
  settings: BranchSettings;
  hasOpenShift: boolean;
  cashierId?: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [category, setCategory] = useState("كهرباء ومرافق");
  const [amount, setAmount] = useState(50);
  const [note, setNote] = useState("");
  const [fromDrawer, setFromDrawer] = useState(hasOpenShift);
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
        from_drawer: fromDrawer,
        cashier_id: cashierId,
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

          <label className="flex items-start gap-2 rounded-xl border border-paper-line bg-paper px-3 py-2.5">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={fromDrawer}
              disabled={!hasOpenShift}
              onChange={(e) => setFromDrawer(e.target.checked)}
            />
            <span className="text-xs leading-relaxed">
              <span className="font-bold text-ink">خصم من درج الصندوق</span>
              <span className="mt-0.5 block text-[11px] text-ink-mute">
                {hasOpenShift
                  ? "يُسجَّل كسحب صندوق ويُحدّث النقد المتوقع في الوردية"
                  : "افتح وردية أولاً لتفعيل الخصم من الصندوق"}
              </span>
            </span>
          </label>

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
