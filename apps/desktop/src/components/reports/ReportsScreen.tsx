import { useMemo, useState, lazy, Suspense, type ReactNode } from "react";
import {
  Money,
  TrendUp,
  Users,
  Receipt,
  ArrowUUpLeft,
  DownloadSimple,
  WarningCircle,
  ChartLine,
  Handshake,
  Truck,
} from "@phosphor-icons/react";
import type {
  BranchSettings,
  Customer,
  Expense,
  Order,
  Product,
  Purchase,
  ReturnRecord,
  Shift,
  Supplier,
} from "../../lib/types";
import {
  computeAnalytics,
  downloadCsv,
  exportAnalyticsCsv,
  type PeriodKey,
} from "../../lib/analytics";
import { formatMoney } from "../../lib/format";
import { cn } from "../../lib/cn";
import { PageHeader } from "../layout/PageHeader";
import { PageContent } from "../layout/PageContent";
import { DataTable } from "../ui/DataTable";
import { MobileDataCard, MobileDataList } from "../ui/MobileDataList";
import { ChartSkeleton } from "../ui/ChartSkeleton";
import type { ColumnDef } from "@tanstack/react-table";
import type { SidebarTab } from "../Sidebar";
import { PosSyncBar } from "../pos/PosSyncBar";
import { usePageSync } from "../../hooks/use-page-sync";

const SalesTrendChart = lazy(() =>
  import("../charts/SalesTrendChart").then((m) => ({ default: m.SalesTrendChart }))
);
const TopProductsChart = lazy(() =>
  import("../charts/TopProductsChart").then((m) => ({ default: m.TopProductsChart }))
);
const PaymentMixChart = lazy(() =>
  import("../charts/PaymentMixChart").then((m) => ({ default: m.PaymentMixChart }))
);

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
  purchases = [],
  suppliers = [],
  settings,
  openShift,
  pendingSync = 0,
  onSync,
  onNavigate,
  onOpenInventory,
  onOpenReturn,
}: {
  orders: Order[];
  returns: ReturnRecord[];
  products: Product[];
  customers: Customer[];
  expenses: Expense[];
  purchases?: Purchase[];
  suppliers?: Supplier[];
  settings: BranchSettings;
  openShift: Shift | null;
  pendingSync?: number;
  onSync?: () => void | Promise<void>;
  onNavigate?: (tab: SidebarTab) => void;
  onOpenInventory?: (search: string) => void;
  onOpenReturn?: (orderId: string) => void;
}) {
  const { online, syncing, handleSyncNow } = usePageSync(onSync);
  const [period, setPeriod] = useState<PeriodKey>("7d");

  const snap = useMemo(
    () =>
      computeAnalytics({
        orders,
        returns,
        products,
        customers,
        expenses,
        purchases,
        suppliers,
        openShift,
        period,
      }),
    [orders, returns, products, customers, expenses, purchases, suppliers, openShift, period]
  );

  const exportCsv = () => {
    const csv = exportAnalyticsCsv(snap, settings.currency_symbol);
    downloadCsv(`omnisales-analytics-${snap.range.key}`, csv);
  };

  const returnColumns: ColumnDef<ReturnRecord, unknown>[] = useMemo(
    () => [
      {
        accessorKey: "return_number",
        header: "الرقم",
        cell: ({ row }) => (
          <span className="font-bold text-ink">{row.original.return_number}</span>
        ),
      },
      {
        accessorKey: "order_number",
        header: "الفاتورة",
        cell: ({ row }) => row.original.order_number,
      },
      {
        accessorKey: "total_refund",
        header: "المبلغ",
        cell: ({ row }) => (
          <span className="font-mono font-bold text-danger">
            −{formatMoney(row.original.total_refund, settings.currency_symbol)}
          </span>
        ),
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
      <PosSyncBar
        online={online}
        pendingSync={pendingSync}
        cloudEnabled={settings.cloud_sync_enabled}
        syncing={syncing}
        onSync={onSync ? handleSyncNow : undefined}
        compact
      />
      <PageHeader
        title="التحليلات والتقارير"
        description={`صافي المبيعات = الإجمالي − المرتجعات · ${snap.range.label}`}
        breadcrumbs={[{ label: "OmniSales" }, { label: "الإدارة" }, { label: "التقارير" }]}
        actions={
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
        }
      />
      <PageContent size="wide" className="space-y-5">

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-5">
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
          onClick={onNavigate ? () => onNavigate("returns") : undefined}
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
          title="صافي الربح"
          value={formatMoney(snap.netProfit, settings.currency_symbol)}
          sub="هامش − مصروفات"
          icon={<TrendUp size={18} className="text-success" />}
          emphasis
        />
        <Kpi
          title="الضريبة المحصّلة"
          value={formatMoney(snap.taxCollected, settings.currency_symbol)}
          sub="مجموع ضريبة الفواتير"
          icon={<Receipt size={18} className="text-info" />}
        />
        <Kpi
          title="المصروفات"
          value={formatMoney(snap.expensesTotal, settings.currency_symbol)}
          sub="في الفترة"
          icon={<Receipt size={18} className="text-warning" />}
          onClick={onNavigate ? () => onNavigate("expenses") : undefined}
        />
        <Kpi
          title="ديون مستحقة"
          value={formatMoney(snap.debtsTotal, settings.currency_symbol)}
          sub="رصيد العملاء"
          icon={<Users size={18} className="text-warning" />}
          onClick={onNavigate ? () => onNavigate("customers") : undefined}
        />
        <Kpi
          title="مشتريات مستلمة"
          value={formatMoney(snap.purchasesTotal, settings.currency_symbol)}
          sub={`${snap.purchasesCount} أمر · ${snap.draftPurchaseCount} مسودة`}
          icon={<Handshake size={18} className="text-info" />}
          onClick={onNavigate ? () => onNavigate("purchases") : undefined}
        />
        <Kpi
          title="ذمم الموردين"
          value={formatMoney(snap.supplierPayables, settings.currency_symbol)}
          sub={`${snap.unpaidPurchaseCount} فاتورة شراء مفتوحة`}
          icon={<Truck size={18} className="text-warning" />}
          onClick={onNavigate ? () => onNavigate("purchases") : undefined}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <section className="panel space-y-3 p-4 lg:col-span-3">
          <h3 className="text-sm font-bold text-ink">اتجاه صافي المبيعات</h3>
          <Suspense fallback={<ChartSkeleton className="h-56" />}>
            <SalesTrendChart data={snap.series} currency={settings.currency_symbol} />
          </Suspense>
        </section>
        <section className="panel space-y-3 p-4 lg:col-span-2">
          <h3 className="text-sm font-bold text-ink">توزيع طرق الدفع</h3>
          <Suspense fallback={<ChartSkeleton className="h-56" />}>
            <PaymentMixChart
              data={snap.paymentMix}
              currency={settings.currency_symbol}
            />
          </Suspense>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <section className="panel space-y-3 p-4 lg:col-span-3">
          <h3 className="text-sm font-bold text-ink">أفضل المنتجات</h3>
          <Suspense fallback={<ChartSkeleton className="h-56" />}>
            <TopProductsChart
              data={snap.topProducts}
              currency={settings.currency_symbol}
            />
          </Suspense>
        </section>
        <section className="panel space-y-3 p-4 lg:col-span-2">
          <div className="flex items-center gap-2">
            <WarningCircle size={16} className="text-warning" />
            <h3 className="text-sm font-bold text-ink">تنبيهات مخزون</h3>
          </div>
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {snap.lowStock.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() =>
                  onOpenInventory
                    ? onOpenInventory(p.barcode || p.sku || p.name)
                    : onNavigate?.("inventory")
                }
                className="flex w-full items-center justify-between gap-2 rounded-xl border border-paper-line bg-paper/50 px-3 py-2 text-start text-xs transition hover:border-highlight/40"
              >
                <span className="truncate font-semibold text-ink">{p.name}</span>
                <span className="shrink-0 font-mono font-bold text-warning">
                  {p.stock_quantity}/{p.min_stock}
                </span>
              </button>
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
        <MobileDataList empty={!snap.returns.length} emptyLabel="لا مرتجعات في هذه الفترة" className="p-3">
          {snap.returns.map((r) => (
            <MobileDataCard
              key={r.id}
              title={r.return_number}
              subtitle={`${r.order_number} · ${new Date(r.created_at).toLocaleDateString("ar-LY")}`}
              onClick={onOpenReturn ? () => onOpenReturn(r.order_id) : undefined}
              badge={
                <span className="font-mono text-xs font-bold text-danger">
                  −{formatMoney(r.total_refund, settings.currency_symbol)}
                </span>
              }
            />
          ))}
        </MobileDataList>
        <div className="hidden lg:block">
          <DataTable
            data={snap.returns}
            columns={returnColumns}
            emptyMessage="لا مرتجعات في هذه الفترة"
            className="rounded-none border-0"
            onRowClick={onOpenReturn ? (r) => onOpenReturn(r.order_id) : undefined}
          />
        </div>
      </section>
      </PageContent>
    </>
  );
}

function Kpi({
  title,
  value,
  sub,
  icon,
  emphasis,
  onClick,
}: {
  title: string;
  value: string;
  sub: string;
  icon: ReactNode;
  emphasis?: boolean;
  onClick?: () => void;
}) {
  const className = cn(
    "rounded-2xl border border-paper-line bg-paper-raised p-3 shadow-soft text-start",
    emphasis && "ring-1 ring-highlight/30",
    onClick && "transition hover:border-highlight/40"
  );
  const body = (
    <>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-ink-mute">{title}</span>
        {icon}
      </div>
      <p className="truncate text-sm font-extrabold text-ink sm:text-base">{value}</p>
      <p className="mt-0.5 truncate text-[10px] text-ink-mute">{sub}</p>
    </>
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {body}
      </button>
    );
  }
  return <div className={className}>{body}</div>;
}
