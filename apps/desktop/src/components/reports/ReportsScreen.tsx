import { useMemo, useState, type ReactNode } from "react";
import {
  Money,
  TrendUp,
  Users,
  Receipt,
  ArrowUUpLeft,
  DownloadSimple,
  WarningCircle,
  ChartLine,
} from "@phosphor-icons/react";
import type {
  BranchSettings,
  Customer,
  Expense,
  Order,
  Product,
  ReturnRecord,
  Shift,
} from "../../lib/types";
import {
  computeAnalytics,
  downloadCsv,
  exportAnalyticsCsv,
  type PeriodKey,
} from "../../lib/analytics";
import { formatMoney } from "../../lib/format";
import { cn } from "../../lib/cn";
import { SalesTrendChart } from "../charts/SalesTrendChart";
import { TopProductsChart } from "../charts/TopProductsChart";
import { PaymentMixChart } from "../charts/PaymentMixChart";

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "اليوم" },
  { key: "shift", label: "الوردية" },
  { key: "7d", label: "7 أيام" },
  { key: "30d", label: "30 يوماً" },
];

export function ReportsScreen({
  orders,
  returns,
  products,
  customers,
  expenses,
  settings,
  openShift,
}: {
  orders: Order[];
  returns: ReturnRecord[];
  products: Product[];
  customers: Customer[];
  expenses: Expense[];
  settings: BranchSettings;
  openShift: Shift | null;
}) {
  const [period, setPeriod] = useState<PeriodKey>("7d");

  const snap = useMemo(
    () =>
      computeAnalytics({
        orders,
        returns,
        products,
        customers,
        expenses,
        openShift,
        period,
      }),
    [orders, returns, products, customers, expenses, openShift, period]
  );

  const exportCsv = () => {
    const csv = exportAnalyticsCsv(snap, settings.currency_symbol);
    downloadCsv(`omnisales-analytics-${snap.range.key}`, csv);
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-3 py-4 sm:px-6 sm:py-6">
      <header className="flex flex-col gap-3 border-b border-paper-line pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-ink">التحليلات والتقارير</h2>
          <p className="text-xs text-ink-mute">
            صافي المبيعات = الإجمالي − المرتجعات · {snap.range.label}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex max-w-full gap-1 overflow-x-auto rounded-xl bg-paper p-1">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPeriod(p.key)}
                className={cn(
                  "shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition",
                  period === p.key
                    ? "bg-highlight text-white shadow-soft"
                    : "text-ink-mute hover:text-ink"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 rounded-xl border border-paper-line bg-paper-raised px-3 py-2 text-xs font-bold text-ink transition hover:bg-highlight/10"
          >
            <DownloadSimple size={16} />
            CSV
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Kpi
          title="إجمالي المبيعات"
          value={formatMoney(snap.grossSales, settings.currency_symbol)}
          sub={`${snap.orderCount} فاتورة`}
          icon={<Money size={18} className="text-success" />}
        />
        <Kpi
          title="المرتجعات"
          value={formatMoney(snap.returnsTotal, settings.currency_symbol)}
          sub={`${snap.returnCount} عملية`}
          icon={<ArrowUUpLeft size={18} className="text-danger" />}
        />
        <Kpi
          title="صافي المبيعات"
          value={formatMoney(snap.netSales, settings.currency_symbol)}
          sub={`متوسط ${formatMoney(snap.aov, settings.currency_symbol)}`}
          icon={<ChartLine size={18} className="text-highlight" />}
          emphasis
        />
        <Kpi
          title="هامش تقديري"
          value={formatMoney(snap.estimatedMargin, settings.currency_symbol)}
          sub={`تكلفة ${formatMoney(snap.estimatedCost, settings.currency_symbol)}`}
          icon={<TrendUp size={18} className="text-info" />}
        />
        <Kpi
          title="المصروفات"
          value={formatMoney(snap.expensesTotal, settings.currency_symbol)}
          sub="في الفترة"
          icon={<Receipt size={18} className="text-warning" />}
        />
        <Kpi
          title="ديون مستحقة"
          value={formatMoney(snap.debtsTotal, settings.currency_symbol)}
          sub="رصيد العملاء"
          icon={<Users size={18} className="text-warning" />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <section className="panel space-y-3 p-4 lg:col-span-3">
          <h3 className="text-sm font-bold text-ink">اتجاه صافي المبيعات</h3>
          <SalesTrendChart data={snap.series} currency={settings.currency_symbol} />
        </section>
        <section className="panel space-y-3 p-4 lg:col-span-2">
          <h3 className="text-sm font-bold text-ink">توزيع طرق الدفع</h3>
          <PaymentMixChart
            data={snap.paymentMix}
            currency={settings.currency_symbol}
          />
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <section className="panel space-y-3 p-4 lg:col-span-3">
          <h3 className="text-sm font-bold text-ink">أفضل المنتجات</h3>
          <TopProductsChart
            data={snap.topProducts}
            currency={settings.currency_symbol}
          />
        </section>
        <section className="panel space-y-3 p-4 lg:col-span-2">
          <div className="flex items-center gap-2">
            <WarningCircle size={16} className="text-warning" />
            <h3 className="text-sm font-bold text-ink">تنبيهات مخزون</h3>
          </div>
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {snap.lowStock.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-paper-line bg-paper/50 px-3 py-2 text-xs"
              >
                <span className="truncate font-semibold text-ink">{p.name}</span>
                <span className="shrink-0 font-mono font-bold text-warning">
                  {p.stock_quantity}/{p.min_stock}
                </span>
              </div>
            ))}
            {!snap.lowStock.length && (
              <p className="py-8 text-center text-xs text-ink-mute">
                لا تنبيهات مخزون حالياً
              </p>
            )}
          </div>
        </section>
      </div>

      <section className="panel overflow-hidden p-0">
        <div className="border-b border-paper-line px-4 py-3">
          <h3 className="text-sm font-bold text-ink">مرتجعات الفترة</h3>
        </div>
        <div className="space-y-2 p-3 md:hidden">
          {!snap.returns.length ? (
            <p className="py-8 text-center text-xs text-ink-mute">
              لا مرتجعات في هذه الفترة
            </p>
          ) : (
            snap.returns.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-paper-line bg-paper/40 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-ink">
                    {r.return_number}
                  </p>
                  <p className="truncate text-[11px] text-ink-mute">
                    {r.order_number} ·{" "}
                    {new Date(r.created_at).toLocaleDateString("ar-LY")}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-xs font-bold text-danger">
                  −{formatMoney(r.total_refund, settings.currency_symbol)}
                </span>
              </div>
            ))
          )}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[560px] text-xs">
            <thead className="bg-paper text-ink-mute">
              <tr>
                <th className="px-3 py-2 text-start font-semibold">الرقم</th>
                <th className="px-3 py-2 text-start font-semibold">الفاتورة</th>
                <th className="px-3 py-2 text-start font-semibold">المبلغ</th>
                <th className="px-3 py-2 text-start font-semibold">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {snap.returns.map((r) => (
                <tr key={r.id} className="border-t border-paper-line">
                  <td className="px-3 py-2 font-bold">{r.return_number}</td>
                  <td className="px-3 py-2">{r.order_number}</td>
                  <td className="px-3 py-2 font-mono font-bold text-danger">
                    −{formatMoney(r.total_refund, settings.currency_symbol)}
                  </td>
                  <td className="px-3 py-2 text-ink-mute">
                    {new Date(r.created_at).toLocaleString("ar-LY")}
                  </td>
                </tr>
              ))}
              {!snap.returns.length && (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-ink-mute">
                    لا مرتجعات في هذه الفترة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Kpi({
  title,
  value,
  sub,
  icon,
  emphasis,
}: {
  title: string;
  value: string;
  sub: string;
  icon: ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-paper-line bg-paper-raised p-3 shadow-soft",
        emphasis && "ring-1 ring-highlight/30"
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-ink-mute">{title}</span>
        {icon}
      </div>
      <p className="truncate text-sm font-extrabold text-ink sm:text-base">{value}</p>
      <p className="mt-0.5 truncate text-[10px] text-ink-mute">{sub}</p>
    </div>
  );
}
