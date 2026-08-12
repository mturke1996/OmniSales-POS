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
  Receipt,
  ClockAfternoon,
  CloudArrowUp,
  Broadcast,
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
import type { SidebarTab } from "../Sidebar";
import { cn } from "../../lib/cn";
import { formatMoney } from "../../lib/format";
import {
  computeShopHealth,
  type ActivityItem,
  type ShopAlert,
} from "../../lib/shop-health";
import { PageHeader } from "../layout/PageHeader";
import { PageContent } from "../layout/PageContent";
import { DataTable } from "../ui/DataTable";
import { ChartSkeleton } from "../ui/ChartSkeleton";
import type { ColumnDef } from "@tanstack/react-table";
import { useLiveState } from "../../hooks/use-live-sync";

const SalesTrendChart = lazy(() =>
  import("../charts/SalesTrendChart").then((m) => ({ default: m.SalesTrendChart }))
);

interface DashboardScreenProps {
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
  onNavigate: (tab: SidebarTab) => void;
  onOpenCustomer?: (customerId: string) => void;
  onOpenInvoice?: (orderId: string) => void;
  onOpenDelivery?: (orderId: string) => void;
  onStartReturn?: (orderId: string) => void;
  onOpenPurchase?: (purchaseId: string) => void;
  onOpenSupplier?: (supplierId: string) => void;
  onOpenInventory?: (search: string) => void;
}

export function DashboardScreen({
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
  onNavigate,
  onOpenCustomer,
  onOpenInvoice,
  onOpenDelivery,
  onStartReturn,
  onOpenPurchase,
  onOpenSupplier,
  onOpenInventory,
}: DashboardScreenProps) {
  const live = useLiveState();
  const health = useMemo(
    () =>
      computeShopHealth({
        orders,
        returns,
        products,
        customers,
        expenses,
        purchases,
        suppliers,
        openShift,
        pendingSync,
        workMode: settings.work_mode,
        currencySymbol: settings.currency_symbol,
      }),
    [
      orders,
      returns,
      products,
      customers,
      expenses,
      purchases,
      suppliers,
      openShift,
      pendingSync,
      settings.work_mode,
      settings.currency_symbol,
    ]
  );
  const today = health.today;
  const week = health.week;

  const totalDebts = today.debtsTotal;
  const lowStockCount = today.lowStock.length;

  const cashOrders = today.paymentMix.find((p) => p.method === "cash")?.count ?? 0;
  const cardOrders =
    (today.paymentMix.find((p) => p.method === "card")?.count ?? 0) +
    (today.paymentMix.find((p) => p.method === "transfer")?.count ?? 0);
  const debtOrders = today.paymentMix.find((p) => p.method === "debt")?.count ?? 0;
  const mixedOrders = today.paymentMix.find((p) => p.method === "mixed")?.count ?? 0;
  const matchTotal = Math.max(today.orderCount, 1);

  const topCustomers = [...customers]
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 5);

  const openAlert = (alert: ShopAlert) => {
    if (alert.customerId && onOpenCustomer) {
      onOpenCustomer(alert.customerId);
      return;
    }
    if (alert.purchaseId && onOpenPurchase) {
      onOpenPurchase(alert.purchaseId);
      return;
    }
    if (alert.supplierId && onOpenSupplier) {
      onOpenSupplier(alert.supplierId);
      return;
    }
    if (alert.search && alert.tab === "inventory" && onOpenInventory) {
      onOpenInventory(alert.search);
      return;
    }
    onNavigate(alert.tab);
  };

  const openActivity = (item: ActivityItem) => {
    if (item.kind === "sale" && item.tab === "invoices" && item.focusId && onOpenInvoice) {
      onOpenInvoice(item.focusId);
      return;
    }
    if (item.kind === "sale" && item.tab === "orders" && item.focusId && onOpenDelivery) {
      onOpenDelivery(item.focusId);
      return;
    }
    if (item.kind === "return" && item.focusId && onStartReturn) {
      onStartReturn(item.focusId);
      return;
    }
    if (item.kind === "purchase" && item.focusId && onOpenPurchase) {
      onOpenPurchase(item.focusId);
      return;
    }
    onNavigate(item.tab);
  };

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
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() =>
            onOpenCustomer ? onOpenCustomer(row.original.id) : onNavigate("customers")
          }
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
        description="المبيعات والمخزون والمشتريات والعملاء في نظرة واحدة."
        breadcrumbs={[{ label: "OmniSales" }, { label: "لوحة التحكم" }]}
        actions={
          <>
            <button
              type="button"
              onClick={() => onNavigate("pos")}
              className="btn-primary gap-2 px-4 py-2.5 text-sm max-lg:px-3 max-lg:py-2 max-lg:text-xs"
            >
              <Plus size={16} weight="bold" />
              <span className="max-sm:hidden">بيع جديد</span>
              <span className="sm:hidden">بيع</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate("returns")}
              className="inline-flex items-center gap-1.5 rounded-full border border-paper-line/70 bg-paper-raised px-3 py-2 text-xs font-bold text-ink transition hover:bg-warning/10 max-lg:px-2.5"
            >
              <ArrowUUpLeft size={16} />
              <span className="max-sm:hidden">مرتجع</span>
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
        {live.status === "live" && (
          <div className="flex items-center justify-between gap-2 rounded-2xl border border-success/20 bg-success/8 px-3 py-2 text-xs">
            <span className="inline-flex items-center gap-1.5 font-bold text-success">
              <Broadcast size={14} weight="fill" className="animate-pulse" />
              متصل بالقاعدة مباشرة
            </span>
            <span className="text-ink-mute">
              {live.peers.length
                ? `${live.peers.length} جهاز آخر: ${live.peers.map((p) => p.cashierName).join("، ")}`
                : "هذا الجهاز وحده على الفرع"}
            </span>
          </div>
        )}
        {health.alerts.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {health.alerts.map((alert) => (
              <button
                key={alert.id}
                type="button"
                onClick={() => openAlert(alert)}
                className={cn(
                  "flex min-w-[14rem] shrink-0 items-start gap-2 rounded-2xl border px-3 py-2.5 text-start transition hover:brightness-95",
                  alert.severity === "critical"
                    ? "border-danger/30 bg-danger/10"
                    : alert.severity === "warning"
                      ? "border-warning/30 bg-warning/10"
                      : "border-info/25 bg-info/10"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5",
                    alert.severity === "critical"
                      ? "text-danger"
                      : alert.severity === "warning"
                        ? "text-warning"
                        : "text-info"
                  )}
                >
                  {alertIcon(alert)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-bold text-ink">
                    {alert.title}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-ink-mute">
                    {alert.detail}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
        {/* Hero command — one soft card */}
        <div className="panel flex flex-col gap-4 p-4 sm:gap-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
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
            onClick={() => onNavigate("reports")}
          />
          <Metric
            title="هامش اليوم"
            value={formatMoney(today.estimatedMargin, settings.currency_symbol)}
            delta={`${today.orderCount} فاتورة · ${today.returnCount} مرتجع`}
            icon={<TrendUp size={20} weight="duotone" />}
            tone="green"
            onClick={() => onNavigate("reports")}
          />
          <Metric
            title="الديون"
            value={formatMoney(totalDebts, settings.currency_symbol)}
            delta={`${customers.filter((c) => c.balance > 0).length} عميل`}
            icon={<Users size={20} weight="duotone" />}
            tone="blue"
            onClick={() => onNavigate("customers")}
          />
          <Metric
            title="نواقص المخزون"
            value={String(lowStockCount)}
            delta={lowStockCount ? "تحت الحد الأدنى" : "المخزون متزن"}
            icon={<WarningCircle size={20} weight="duotone" />}
            tone="orange"
            onClick={() =>
              onOpenInventory
                ? onOpenInventory(today.lowStock[0]?.name ?? "")
                : onNavigate("inventory")
            }
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
                <p className="text-xs text-ink-mute">مبيعات · مرتجعات · مصروفات · مشتريات</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/12 px-2.5 py-1 text-[11px] font-bold text-success">
                <Pulse size={12} weight="fill" className="animate-pulse" />
                مباشر
              </span>
            </div>
            <div className="space-y-1">
              {!health.activity.length ? (
                <p className="py-12 text-center text-sm text-ink-mute">لا توجد عمليات بعد</p>
              ) : (
                health.activity.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openActivity(item)}
                    className="flex w-full items-center gap-3 rounded-2xl px-2 py-3 text-start transition hover:bg-paper"
                  >
                    <div className={cn("stat-icon", activityTone(item.kind))}>
                      {activityIcon(item.kind)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">
                        {item.title}
                      </p>
                      <p className="truncate text-xs text-ink-mute">{item.subtitle}</p>
                    </div>
                    <div className="shrink-0 text-end">
                      <p
                        className={cn(
                          "money-big text-sm font-bold",
                          item.signedAmount < 0 ? "text-danger" : "text-ink"
                        )}
                      >
                        {item.signedAmount < 0 ? "−" : ""}
                        {item.amount.toFixed(2)}
                      </p>
                      <p className="text-[11px] text-ink-mute">
                        {new Date(item.at).toLocaleTimeString("ar-LY", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </button>
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
          <div className="space-y-2 px-3 pb-4 lg:hidden">
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
                    onClick={() =>
                      onOpenCustomer
                        ? onOpenCustomer(c.id)
                        : onNavigate("customers")
                    }
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
          <div className="hidden lg:block">
            <DataTable
              data={topCustomers}
              columns={customerColumns}
              emptyMessage="لا يوجد عملاء بعد"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
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
            {today.supplierPayables > 0
              ? ` · ذمم موردين ${formatMoney(today.supplierPayables, settings.currency_symbol)}`
              : ""}
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
  onClick,
}: {
  title: string;
  value: string;
  delta: string;
  icon: React.ReactNode;
  tone: "violet" | "green" | "blue" | "orange";
  onClick?: () => void;
}) {
  const toneClass = {
    violet: "bg-highlight/12 text-highlight",
    green: "bg-success/12 text-success",
    blue: "bg-info/12 text-info",
    orange: "bg-warning/12 text-warning",
  }[tone];

  const inner = (
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
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="panel p-4 text-start sm:p-5 transition hover:border-highlight/30"
      >
        {inner}
      </button>
    );
  }

  return <div className="panel p-4 sm:p-5">{inner}</div>;
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
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6">
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

function alertIcon(alert: ShopAlert) {
  if (alert.id === "sync") return <CloudArrowUp size={16} weight="bold" />;
  if (alert.id === "no-shift") return <ClockAfternoon size={16} weight="bold" />;
  if (alert.id === "open-delivery") return <Truck size={16} weight="bold" />;
  if (alert.id === "payables" || alert.id === "draft-purchases") {
    return <Handshake size={16} weight="bold" />;
  }
  if (alert.id === "credit-risk") return <Users size={16} weight="bold" />;
  return <WarningCircle size={16} weight="bold" />;
}

function activityIcon(kind: ActivityItem["kind"]) {
  if (kind === "return") return <ArrowUUpLeft size={16} weight="duotone" />;
  if (kind === "expense") return <Receipt size={16} weight="duotone" />;
  if (kind === "purchase") return <Handshake size={16} weight="duotone" />;
  return <FileText size={16} weight="duotone" />;
}

function activityTone(kind: ActivityItem["kind"]) {
  if (kind === "return") return "bg-danger/12 text-danger";
  if (kind === "expense") return "bg-warning/12 text-warning";
  if (kind === "purchase") return "bg-info/12 text-info";
  return "bg-highlight/12 text-highlight";
}
