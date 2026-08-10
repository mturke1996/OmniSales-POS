import { useMemo, lazy, Suspense } from "react";
import {
  Money,
  TrendUp,
  WarningCircle,
  Users,
  Storefront,
  ArrowLeft,
  Package,
  FileText,
  Pulse,
  Plus,
  Bell,
  ArrowUUpLeft,
  Truck,
  Handshake,
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
import type { SidebarTab } from "../Sidebar";
import { cn } from "../../lib/cn";
import { computeAnalytics } from "../../lib/analytics";
import { formatMoney } from "../../lib/format";
import { PageHeader } from "../layout/PageHeader";
import { PageContent } from "../layout/PageContent";
import { DataTable } from "../ui/DataTable";
import { ChartSkeleton } from "../ui/ChartSkeleton";
import type { ColumnDef } from "@tanstack/react-table";

const SalesTrendChart = lazy(() =>
  import("../charts/SalesTrendChart").then((m) => ({ default: m.SalesTrendChart }))
);

interface DashboardScreenProps {
  orders: Order[];
  returns: ReturnRecord[];
  products: Product[];
  customers: Customer[];
  expenses: Expense[];
  settings: BranchSettings;
  openShift: Shift | null;
  onNavigate: (tab: SidebarTab) => void;
}

export function DashboardScreen({
  orders,
  returns,
  products,
  customers,
  expenses,
  settings,
  openShift,
  onNavigate,
}: DashboardScreenProps) {
  const today = useMemo(
    () =>
      computeAnalytics({
        orders,
        returns,
        products,
        customers,
        expenses,
        openShift,
        period: "today",
      }),
    [orders, returns, products, customers, expenses, openShift]
  );
  const week = useMemo(
    () =>
      computeAnalytics({
        orders,
        returns,
        products,
        customers,
        expenses,
        openShift,
        period: "7d",
      }),
    [orders, returns, products, customers, expenses, openShift]
  );

  const totalDebts = today.debtsTotal;
  const lowStockCount = today.lowStock.length;

  const cashOrders = today.paymentMix.find((p) => p.method === "cash")?.count ?? 0;
  const cardOrders =
    (today.paymentMix.find((p) => p.method === "card")?.count ?? 0) +
    (today.paymentMix.find((p) => p.method === "transfer")?.count ?? 0);
  const debtOrders = today.paymentMix.find((p) => p.method === "debt")?.count ?? 0;
  const mixedOrders = today.paymentMix.find((p) => p.method === "mixed")?.count ?? 0;
  const matchTotal = Math.max(today.orderCount, 1);

  const activity = [...orders]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 5);
  const topCustomers = [...customers]
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 5);

  const customerColumns: ColumnDef<Customer, unknown>[] = [
    {
      accessorKey: "name",
      header: "العميل",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-highlight/12 text-xs font-bold text-highlight">
            {row.original.name.slice(0, 1)}
          </div>
          <span className="font-semibold text-ink">{row.original.name}</span>
        </div>
      ),
    },
    { accessorKey: "phone", header: "الهاتف", cell: ({ getValue }) => (
      <span className="text-ink-mute">{String(getValue() ?? "—")}</span>
    )},
    {
      accessorKey: "balance",
      header: "الرصيد",
      cell: ({ row }) => (
        <span className="money-big font-bold text-ink">
          {row.original.balance.toFixed(2)}
        </span>
      ),
    },
    {
      accessorKey: "credit_limit",
      header: "الحد",
      cell: ({ row }) => (
        <span className="text-ink-mute">{row.original.credit_limit.toFixed(2)}</span>
      ),
    },
    {
      id: "level",
      header: "المستوى",
      cell: ({ row }) => {
        const c = row.original;
        const ratio = c.credit_limit > 0 ? c.balance / c.credit_limit : 0;
        const level = ratio >= 0.8 ? "مرتفع" : ratio >= 0.4 ? "متوسط" : "منخفض";
        const levelClass =
          ratio >= 0.8
            ? "bg-danger/12 text-danger"
            : ratio >= 0.4
              ? "bg-warning/12 text-warning"
              : "bg-success/12 text-success";
        return (
          <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold", levelClass)}>
            {level}
          </span>
        );
      },
    },
    {
      id: "action",
      header: "إجراء",
      cell: () => (
        <button
          type="button"
          onClick={() => onNavigate("customers")}
          className="text-sm font-semibold text-highlight"
        >
          عرض
        </button>
      ),
    },
  ];

  return (
    <div className="min-h-full bg-paper">
      <PageHeader
        title="لوحة التحكم"
        description="نظرة شاملة على المبيعات والمخزون والعملاء — محلي أولاً."
        breadcrumbs={[{ label: "OmniSales" }, { label: "لوحة التحكم" }]}
        actions={
          <>
            <button
              type="button"
              onClick={() => onNavigate("pos")}
              className="btn-primary gap-2 px-4 py-2.5 text-sm"
            >
              <Plus size={16} weight="bold" />
              بيع جديد
            </button>
            <button
              type="button"
              onClick={() => onNavigate("returns")}
              className="inline-flex items-center gap-1.5 rounded-full border border-paper-line/70 bg-paper-raised px-3 py-2 text-xs font-bold text-ink transition hover:bg-warning/10"
            >
              <ArrowUUpLeft size={16} />
              مرتجع
            </button>
            <button
              type="button"
              onClick={() => onNavigate("reports")}
              className="grid h-10 w-10 place-items-center rounded-full border border-paper-line/70 bg-paper-raised text-ink-mute transition hover:text-ink"
              aria-label="التقارير"
            >
              <Bell size={18} />
            </button>
          </>
        }
      />

      <PageContent size="wide" className="space-y-5">
        {/* Hero command — one soft card */}
        <div className="panel flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="stat-icon shrink-0 bg-highlight/15 text-highlight">
              <Storefront size={22} weight="duotone" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-ink sm:text-xl">
                افتح نقطة البيع ودع النظام يحدّث المخزون والفواتير
              </h2>
              <p className="mt-1 max-w-[48ch] text-sm text-ink-mute">
                {openShift
                  ? `وردية حية · نقد متوقع ${openShift.expected_cash.toFixed(2)} ${settings.currency_symbol}`
                  : "لا توجد وردية مفتوحة — افتح وردية قبل البيع الفوري"}
              </p>
            </div>
          </div>
          <div className="flex w-full max-w-md items-center gap-2 rounded-full border border-paper-line/70 bg-paper p-1.5">
            <input
              readOnly
              value={settings.name || "OmniSales"}
              className="min-w-0 flex-1 bg-transparent px-3 text-sm text-ink outline-none"
            />
            <button
              type="button"
              onClick={() => onNavigate(openShift ? "pos" : "shifts")}
              className="btn-primary shrink-0 px-5 py-2 text-xs"
            >
              {openShift ? "بيع الآن" : "فتح وردية"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            title="صافي اليوم"
            value={formatMoney(today.netSales, settings.currency_symbol)}
            delta={`إجمالي ${formatMoney(today.grossSales, settings.currency_symbol)} · مرتجعات ${formatMoney(today.returnsTotal, settings.currency_symbol)}`}
            icon={<Money size={20} weight="duotone" />}
            tone="violet"
          />
          <Metric
            title="هامش اليوم"
            value={formatMoney(today.estimatedMargin, settings.currency_symbol)}
            delta={`${today.orderCount} فاتورة · ${today.returnCount} مرتجع`}
            icon={<TrendUp size={20} weight="duotone" />}
            tone="green"
          />
          <Metric
            title="الديون"
            value={formatMoney(totalDebts, settings.currency_symbol)}
            delta={`${customers.filter((c) => c.balance > 0).length} عميل`}
            icon={<Users size={20} weight="duotone" />}
            tone="blue"
          />
          <Metric
            title="نواقص المخزون"
            value={String(lowStockCount)}
            delta={lowStockCount ? "تحت الحد الأدنى" : "المخزون متزن"}
            icon={<WarningCircle size={20} weight="duotone" />}
            tone="orange"
          />
        </div>

        <div className="panel space-y-3 p-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-ink">اتجاه 7 أيام (صافي)</h3>
              <p className="text-xs text-ink-mute">مربوط بالمرتجعات والمبيعات</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("reports")}
              className="text-xs font-bold text-highlight"
            >
              تحليلات كاملة
            </button>
          </div>
          <Suspense fallback={<ChartSkeleton className="h-56" />}>
            <SalesTrendChart data={week.series} currency={settings.currency_symbol} />
          </Suspense>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <div className="panel p-6 lg:col-span-2">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-ink">توزيع طرق الدفع</h3>
                <p className="text-xs text-ink-mute">فواتير اليوم</p>
              </div>
            </div>
            <Donut
              segments={[
                { label: "نقدي", value: cashOrders, color: "rgb(var(--highlight))" },
                { label: "بطاقة", value: cardOrders, color: "rgb(var(--info))" },
                { label: "آجل", value: debtOrders, color: "rgb(var(--success))" },
                { label: "مختلط", value: mixedOrders, color: "rgb(var(--warning))" },
              ]}
              total={matchTotal}
            />
          </div>

          <div className="panel p-6 lg:col-span-3">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-ink">نشاط العمليات</h3>
                <p className="text-xs text-ink-mute">آخر الفواتير</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/12 px-2.5 py-1 text-[11px] font-bold text-success">
                <Pulse size={12} weight="fill" className="animate-pulse" />
                مباشر
              </span>
            </div>
            <div className="space-y-1">
              {!activity.length ? (
                <p className="py-12 text-center text-sm text-ink-mute">لا توجد فواتير بعد</p>
              ) : (
                activity.map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center gap-3 rounded-2xl px-2 py-3 transition hover:bg-paper"
                  >
                    <div className="stat-icon bg-highlight/12 text-highlight">
                      <FileText size={16} weight="duotone" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">
                        {o.order_number}
                      </p>
                      <p className="truncate text-xs text-ink-mute">
                        {o.customer_name || "عميل نقدي"}
                      </p>
                    </div>
                    <div className="shrink-0 text-end">
                      <p className="money-big text-sm font-bold text-ink">
                        {o.total_amount.toFixed(2)}
                      </p>
                      <p className="text-[11px] text-ink-mute">
                        {new Date(o.created_at).toLocaleTimeString("ar-LY", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="panel overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5">
            <div>
              <h3 className="text-base font-bold text-ink">أعلى أرصدة عملاء</h3>
              <p className="text-xs text-ink-mute">متابعة الآجل وحدود الائتمان</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("customers")}
              className="inline-flex items-center gap-1 text-sm font-semibold text-highlight"
            >
              عرض الكل
              <ArrowLeft size={14} />
            </button>
          </div>
          <div className="space-y-2 px-3 pb-4 md:hidden">
            {!topCustomers.length ? (
              <p className="py-8 text-center text-xs text-ink-mute">لا يوجد عملاء بعد</p>
            ) : (
              topCustomers.map((c) => {
                const ratio = c.credit_limit > 0 ? c.balance / c.credit_limit : 0;
                const level =
                  ratio >= 0.8 ? "مرتفع" : ratio >= 0.4 ? "متوسط" : "منخفض";
                const levelClass =
                  ratio >= 0.8
                    ? "bg-danger/12 text-danger"
                    : ratio >= 0.4
                      ? "bg-warning/12 text-warning"
                      : "bg-success/12 text-success";
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onNavigate("customers")}
                    className="flex w-full items-center gap-3 rounded-xl border border-paper-line bg-paper/40 p-3 text-start active:scale-[0.99]"
                  >
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-highlight/12 text-xs font-bold text-highlight">
                      {c.name.slice(0, 1)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{c.name}</p>
                      <p className="truncate text-[11px] text-ink-mute">{c.phone}</p>
                    </div>
                    <div className="text-end">
                      <p className="money-big text-sm font-bold text-ink">
                        {c.balance.toFixed(2)}
                      </p>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-bold",
                          levelClass
                        )}
                      >
                        {level}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
          <div className="hidden md:block">
            <DataTable
              data={topCustomers}
              columns={customerColumns}
              emptyMessage="لا يوجد عملاء بعد"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Quick icon={<Truck size={18} />} label="التوصيل" onClick={() => onNavigate("orders")} />
          <Quick icon={<Package size={18} />} label="المخزون" onClick={() => onNavigate("inventory")} />
          <Quick icon={<Handshake size={18} />} label="المشتريات" onClick={() => onNavigate("purchases")} />
          <Quick icon={<FileText size={18} />} label="المبيعات المنفذة" onClick={() => onNavigate("invoices")} />
          <Quick
            icon={<ArrowUUpLeft size={18} />}
            label="المرتجعات"
            onClick={() => onNavigate("returns")}
          />
          <Quick icon={<Users size={18} />} label="العملاء" onClick={() => onNavigate("customers")} />
          <span className="ms-auto self-center text-xs text-ink-mute">
            مصروفات اليوم: {formatMoney(today.expensesTotal, settings.currency_symbol)}
          </span>
        </div>
      </PageContent>
    </div>
  );
}

function Metric({
  title,
  value,
  delta,
  icon,
  tone,
}: {
  title: string;
  value: string;
  delta: string;
  icon: React.ReactNode;
  tone: "violet" | "green" | "blue" | "orange";
}) {
  const toneClass = {
    violet: "bg-highlight/12 text-highlight",
    green: "bg-success/12 text-success",
    blue: "bg-info/12 text-info",
    orange: "bg-warning/12 text-warning",
  }[tone];

  return (
    <div className="panel p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink-mute">{title}</p>
          <p className="money-big mt-2 truncate text-2xl font-extrabold tracking-tight text-ink">
            {value}
          </p>
          <p className="mt-2 text-xs font-semibold text-success">{delta}</p>
        </div>
        <div className={cn("stat-icon shrink-0", toneClass)}>{icon}</div>
      </div>
    </div>
  );
}

function Donut({
  segments,
  total,
}: {
  segments: { label: string; value: number; color: string }[];
  total: number;
}) {
  let acc = 0;
  const stops = segments
    .map((s) => {
      const start = (acc / total) * 100;
      acc += s.value;
      const end = (acc / total) * 100;
      return `${s.color} ${start}% ${end}%`;
    })
    .join(", ");

  return (
    <div className="flex items-center gap-6">
      <div
        className="relative h-40 w-40 shrink-0 rounded-full"
        style={{
          background: segments.every((s) => s.value === 0)
            ? "rgb(var(--paper-line))"
            : `conic-gradient(${stops})`,
        }}
      >
        <div className="absolute inset-[14px] grid place-items-center rounded-full bg-paper-raised">
          <div className="text-center">
            <div className="money-big text-2xl font-extrabold text-ink">{total}</div>
            <div className="text-[10px] font-medium text-ink-mute">إجمالي</div>
          </div>
        </div>
      </div>
      <div className="flex-1 space-y-3">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
              <span className="font-medium text-ink">{s.label}</span>
            </div>
            <span className="text-ink-mute">
              {s.value} · {Math.round((s.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Quick({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2.5 rounded-full border border-paper-line/70 bg-paper-raised px-4 py-2.5 text-sm font-semibold text-ink shadow-soft transition hover:border-highlight/30 active:scale-[0.98]"
    >
      <span className="text-highlight">{icon}</span>
      {label}
    </button>
  );
}
