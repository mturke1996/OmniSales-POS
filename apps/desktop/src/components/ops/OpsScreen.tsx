import { useMemo, useState } from "react";
import { Percent, ShieldCheck } from "@phosphor-icons/react";
import { addPromotion, setPromotionActive } from "../../lib/api";
import { formatMoney } from "../../lib/format";
import { buildDailyOwnerSummary, openWhatsApp } from "../../lib/whatsapp";
import type {
  AuditEntry,
  BranchSettings,
  Order,
  Promotion,
  Expense,
  Customer,
} from "../../lib/types";
import { PageHeader } from "../layout/PageHeader";
import { PageContent } from "../layout/PageContent";
import { DataTable } from "../ui/DataTable";
import { MobileDataCard, MobileDataList } from "../ui/MobileDataList";
import type { ColumnDef } from "@tanstack/react-table";

export function OpsScreen({
  promotions,
  auditLog,
  settings,
  orders,
  expenses,
  customers,
  onRefreshData,
}: {
  promotions: Promotion[];
  auditLog: AuditEntry[];
  settings: BranchSettings;
  orders: Order[];
  expenses: Expense[];
  customers: Customer[];
  onRefreshData: () => void;
}) {
  const [tab, setTab] = useState<"promos" | "audit" | "daily">("promos");
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"percent" | "fixed">("percent");
  const [value, setValue] = useState(10);

  const audits = useMemo(
    () =>
      [...auditLog].sort(
        (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
      ),
    [auditLog]
  );

  const auditRows = useMemo(() => audits.slice(0, 100), [audits]);

  const auditColumns: ColumnDef<AuditEntry, unknown>[] = useMemo(
    () => [
      {
        accessorKey: "at",
        header: "الوقت",
        cell: ({ row }) => (
          <span className="text-ink-mute">
            {new Date(row.original.at).toLocaleString("ar-LY")}
          </span>
        ),
      },
      {
        id: "actor",
        header: "المستخدم",
        cell: ({ row }) => row.original.actor_name || "—",
      },
      {
        accessorKey: "action",
        header: "الإجراء",
        cell: ({ row }) => (
          <span className="font-mono text-[11px]">{row.original.action}</span>
        ),
      },
      {
        accessorKey: "summary",
        header: "الملخص",
        cell: ({ row }) => (
          <span className="font-bold text-ink">{row.original.summary}</span>
        ),
      },
    ],
    []
  );

  const todaySales = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return orders
      .filter(
        (o) =>
          o.status === "completed" && new Date(o.created_at) >= start
      )
      .reduce((s, o) => s + o.total_amount, 0);
  }, [orders]);

  const todayExpenses = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return expenses
      .filter((e) => new Date(e.created_at) >= start)
      .reduce((s, e) => s + e.amount, 0);
  }, [expenses]);

  const debts = customers.reduce((s, c) => s + c.balance, 0);

  return (
    <>
      <PageHeader
        title="العروض والتدقيق"
        description="إدارة ترويجية وحوكمة يومية وملخص المالك"
        breadcrumbs={[{ label: "OmniSales" }, { label: "الإدارة" }, { label: "عروض وتدقيق" }]}
      />
      <PageContent size="narrow" className="space-y-6">

      <div className="flex gap-1 rounded-2xl border border-paper-line bg-paper-raised p-1">
        {(
          [
            ["promos", "العروض"],
            ["audit", "سجل التدقيق"],
            ["daily", "ملخص يومي"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-xl px-4 py-2 text-xs font-bold ${
              tab === id ? "bg-ink text-paper" : "text-ink-mute"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "promos" && (
        <div className="space-y-4">
          <form
            className="panel grid gap-2 p-4 sm:grid-cols-4"
            onSubmit={(e) => {
              e.preventDefault();
              void addPromotion({
                name,
                kind,
                value,
                active: true,
                min_subtotal: 0,
              })
                .then(() => {
                  setName("");
                  onRefreshData();
                })
                .catch((err) =>
                  alert(err instanceof Error ? err.message : "فشل")
                );
            }}
          >
            <input
              className="input text-xs sm:col-span-2"
              placeholder="اسم العرض"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <select
              className="input text-xs"
              value={kind}
              onChange={(e) => setKind(e.target.value as "percent" | "fixed")}
            >
              <option value="percent">نسبة %</option>
              <option value="fixed">مبلغ ثابت</option>
            </select>
            <input
              type="number"
              className="input font-mono text-xs"
              value={value}
              min={1}
              onChange={(e) => setValue(Number(e.target.value))}
            />
            <button type="submit" className="btn-primary text-xs font-bold sm:col-span-4">
              <Percent size={14} className="inline" /> إضافة عرض
            </button>
          </form>
          <div className="space-y-2">
            {promotions.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-paper-line bg-paper-raised px-4 py-3 text-xs"
              >
                <div>
                  <p className="font-bold text-ink">{p.name}</p>
                  <p className="text-ink-mute">
                    {p.kind === "percent" ? `${p.value}%` : formatMoney(p.value, settings.currency_symbol)}
                  </p>
                </div>
                <button
                  type="button"
                  className={`rounded-full px-3 py-1 font-bold ${
                    p.active ? "bg-success/15 text-success" : "bg-paper text-ink-mute"
                  }`}
                  onClick={() =>
                    void setPromotionActive(p.id, !p.active).then(onRefreshData)
                  }
                >
                  {p.active ? "مفعّل" : "متوقف"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "audit" && (
        <>
          <MobileDataList empty={!auditRows.length} emptyLabel="لا توجد أحداث بعد">
            {auditRows.map((a) => (
              <MobileDataCard
                key={a.id}
                title={a.summary}
                subtitle={a.action}
                meta={`${a.actor_name || "—"} · ${new Date(a.at).toLocaleString("ar-LY")}`}
              />
            ))}
          </MobileDataList>
          <div className="panel hidden overflow-hidden p-0 md:block">
            <DataTable
              data={auditRows}
              columns={auditColumns}
              emptyMessage="لا توجد أحداث بعد"
              className="rounded-none border-0"
            />
          </div>
        </>
      )}

      {tab === "daily" && (
        <div className="panel space-y-4 p-5">
          <div className="flex items-center gap-2 font-bold text-ink">
            <ShieldCheck size={18} className="text-highlight" />
            ملخص اليوم للمالك
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="rounded-xl bg-paper p-3">
              <p className="text-ink-mute">مبيعات مكتملة</p>
              <p className="font-mono font-bold">
                {formatMoney(todaySales, settings.currency_symbol)}
              </p>
            </div>
            <div className="rounded-xl bg-paper p-3">
              <p className="text-ink-mute">مصروفات</p>
              <p className="font-mono font-bold">
                {formatMoney(todayExpenses, settings.currency_symbol)}
              </p>
            </div>
            <div className="rounded-xl bg-paper p-3">
              <p className="text-ink-mute">إجمالي الديون</p>
              <p className="font-mono font-bold text-danger">
                {formatMoney(debts, settings.currency_symbol)}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn-primary text-xs font-bold"
            onClick={() => {
              const phone = settings.owner_whatsapp || settings.phone;
              if (!phone) {
                alert("أضف رقم واتساب المالك من الإعدادات");
                return;
              }
              const msg = buildDailyOwnerSummary({
                branchName: settings.name,
                sales: todaySales,
                expenses: todayExpenses,
                debts,
                symbol: settings.currency_symbol,
                deliveryOpen: orders.filter(
                  (o) =>
                    o.type === "delivery" &&
                    o.status !== "completed" &&
                    o.status !== "cancelled"
                ).length,
              });
              openWhatsApp(phone, msg);
            }}
          >
            إرسال الملخص واتساب للمالك
          </button>
        </div>
      )}
      </PageContent>
    </>
  );
}
