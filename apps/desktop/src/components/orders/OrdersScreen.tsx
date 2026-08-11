import {
  useMemo,
  useState,
  useEffect,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  ShoppingBag,
  Truck,
  CheckCircle,
  Clock,
  CaretLeft,
  WhatsappLogo,
  Printer,
  CookingPot,
} from "@phosphor-icons/react";
import { updateOrderStatus } from "../../lib/api";
import { formatMoney } from "../../lib/format";
import { openWhatsApp, saleShareMessage } from "../../lib/whatsapp";
import {
  isKitchenTicketOrder,
  printKitchenTicketSmart,
} from "../../lib/print/kitchen-ticket";
import type {
  BranchSettings,
  Order,
  OrderStatus,
} from "../../lib/types";
import { cn } from "../../lib/cn";
import { PageHeader } from "../layout/PageHeader";
import { PageContent } from "../layout/PageContent";
import { DataTable } from "../ui/DataTable";
import { ReceiptModal } from "../pos/ReceiptModal";
import { PosSyncBar } from "../pos/PosSyncBar";
import { usePhoneLayout } from "../../hooks/use-media-query";
import { usePageSync } from "../../hooks/use-page-sync";
import type { ColumnDef } from "@tanstack/react-table";

const NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  new: "in_prep",
  in_prep: "ready",
  ready: "delivering",
  delivering: "completed",
};

const NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  new: "بدء التحضير",
  in_prep: "جاهز للتسليم",
  ready: "خرج للتوصيل",
  delivering: "تم التسليم",
};

interface OrdersScreenProps {
  orders: Order[];
  settings: BranchSettings;
  initialOrderId?: string | null;
  onRefreshData: () => void;
  canCancel?: boolean;
  pendingSync?: number;
  onSync?: () => void | Promise<void>;
}

export function OrdersScreen({
  orders,
  settings,
  initialOrderId,
  onRefreshData,
  canCancel = false,
  pendingSync = 0,
  onSync,
}: OrdersScreenProps) {
  const { online, syncing, handleSyncNow } = usePageSync(onSync);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("delivery");
  const [filterDate, setFilterDate] = useState("");
  const [view, setView] = useState<"list" | "calendar">("list");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [driverDraft, setDriverDraft] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [kitchenMsg, setKitchenMsg] = useState<string | null>(null);
  const isPhone = usePhoneLayout();

  const filtered = useMemo(() => {
    return orders
      .filter((o) => {
        if (filterStatus !== "all" && o.status !== filterStatus) return false;
        if (filterType !== "all" && o.type !== filterType) return false;
        if (filterDate) {
          const d = o.delivery_date || o.created_at.slice(0, 10);
          if (d !== filterDate) return false;
        }
        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  }, [orders, filterStatus, filterType, filterDate]);

  useEffect(() => {
    if (!initialOrderId) return;
    requestAnimationFrame(() => {
      document
        .getElementById(`order-${initialOrderId}`)
        ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  }, [initialOrderId, filtered.length, view]);

  const byDay = useMemo(() => {
    const map = new Map<string, Order[]>();
    for (const o of filtered) {
      const day = o.delivery_date || o.created_at.slice(0, 10);
      const list = map.get(day) || [];
      list.push(o);
      map.set(day, list);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const pipeline = useMemo(() => {
    const deliveryLike = orders.filter(
      (o) => o.type === "delivery" || o.type === "special_event"
    );
    return {
      total: deliveryLike.length,
      new: deliveryLike.filter((o) => o.status === "new").length,
      prep: deliveryLike.filter((o) => o.status === "in_prep").length,
      out: deliveryLike.filter(
        (o) => o.status === "ready" || o.status === "delivering"
      ).length,
      done: deliveryLike.filter((o) => o.status === "completed").length,
    };
  }, [orders]);

  async function advance(order: Order) {
    const next = NEXT[order.status];
    if (!next) return;
    setBusyId(order.id);
    setError(null);
    setKitchenMsg(null);
    try {
      await updateOrderStatus(order.id, next, {
        driver: driverDraft[order.id] || order.delivery_driver,
      });
      if (
        next === "in_prep" &&
        isKitchenTicketOrder(order) &&
        settings.auto_print_kitchen !== false
      ) {
        void printKitchenTicketSmart(
          { ...order, status: next },
          settings
        ).then((mode) => {
          setKitchenMsg(
            mode === "escpos"
              ? `طُبعت تذكرة مطبخ ${order.order_number} حرارياً`
              : `فُتحت تذكرة مطبخ ${order.order_number}`
          );
        }).catch(() => {
          /* kitchen print optional */
        });
      }
      onRefreshData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل تحديث الحالة");
    } finally {
      setBusyId(null);
    }
  }

  async function printKitchen(order: Order) {
    setBusyId(order.id);
    setKitchenMsg(null);
    setError(null);
    try {
      const mode = await printKitchenTicketSmart(order, settings);
      setKitchenMsg(
        mode === "escpos"
          ? `طُبعت تذكرة المطبخ حرارياً`
          : `فُتحت تذكرة المطبخ للطباعة`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل طباعة تذكرة المطبخ");
    } finally {
      setBusyId(null);
    }
  }

  async function cancel(order: Order) {
    if (!confirm(`إلغاء الطلب ${order.order_number}؟ سيتم إرجاع المخزون.`)) return;
    setBusyId(order.id);
    setError(null);
    try {
      await updateOrderStatus(order.id, "cancelled");
      onRefreshData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل الإلغاء");
    } finally {
      setBusyId(null);
    }
  }

  const orderColumns: ColumnDef<Order, unknown>[] = [
      {
        accessorKey: "order_number",
        header: "الطلب",
        cell: ({ row }) => (
          <span className="font-bold text-ink">{row.original.order_number}</span>
        ),
      },
      {
        id: "customer",
        header: "العميل",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-medium">{row.original.customer_name || "—"}</p>
            <p className="truncate text-xs text-ink-mute">{row.original.customer_phone || "—"}</p>
          </div>
        ),
      },
      {
        id: "status",
        header: "الحالة",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "type",
        header: "النوع",
        cell: ({ row }) =>
          row.original.type === "delivery"
            ? "توصيل"
            : row.original.type === "special_event"
              ? "مناسبة"
              : "مباشر",
      },
      {
        id: "delivery",
        header: "التوصيل",
        cell: ({ row }) => {
          const o = row.original;
          if (o.type !== "delivery" && o.type !== "special_event") return "—";
          if (o.status === "completed" || o.status === "cancelled") {
            return o.delivery_driver || "—";
          }
          return (
            <input
              type="text"
              placeholder="السائق"
              value={driverDraft[o.id] ?? o.delivery_driver ?? ""}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) =>
                setDriverDraft((d) => ({ ...d, [o.id]: e.target.value }))
              }
              className="w-full min-w-[7rem] rounded-lg border border-paper-line bg-paper px-2 py-1 text-xs"
            />
          );
        },
      },
      {
        accessorKey: "total_amount",
        header: "الإجمالي",
        cell: ({ row }) => (
          <span className="font-mono font-bold text-highlight">
            {formatMoney(row.original.total_amount, settings.currency_symbol)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "إجراء",
        enableSorting: false,
        cell: ({ row }) => {
          const order = row.original;
          const next = NEXT[order.status];
          const nextLabel = NEXT_LABEL[order.status];
          return (
            <div className="flex flex-wrap gap-1">
              {next && nextLabel && (
                <button
                  type="button"
                  disabled={busyId === order.id}
                  onClick={() => void advance(order)}
                  className="btn-primary inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold"
                >
                  {nextLabel}
                  <CaretLeft size={10} />
                </button>
              )}
              {order.customer_phone && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full bg-[#25D366] px-2 py-1 text-[10px] font-bold text-white"
                  onClick={() =>
                    openWhatsApp(
                      order.customer_phone!,
                      saleShareMessage(
                        order.order_number,
                        order.total_amount,
                        settings.currency_symbol,
                        settings.name,
                        order.customer_name
                      ) +
                        (order.delivery_address
                          ? `\nالعنوان: ${order.delivery_address}`
                          : "")
                    )
                  }
                >
                  <WhatsappLogo size={12} weight="fill" />
                </button>
              )}
              {canCancel &&
                order.status !== "cancelled" &&
                order.status !== "completed" && (
                  <button
                    type="button"
                    disabled={busyId === order.id}
                    onClick={() => void cancel(order)}
                    className="rounded-full border border-danger/30 px-2 py-1 text-[10px] font-bold text-danger"
                  >
                    إلغاء
                  </button>
                )}
            </div>
          );
        },
      },
  ];

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
        title="التوصيل والطلبات"
        description="من نقطة البيع → وضع توصيل · ثم تتبّع الحالات حتى التسليم"
        breadcrumbs={[{ label: "OmniSales" }, { label: "المبيعات" }, { label: "التوصيل" }]}
        actions={
          <div className="hidden flex-wrap items-center gap-2 lg:flex">
            <OrdersFilters
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
              filterType={filterType}
              setFilterType={setFilterType}
              filterDate={filterDate}
              setFilterDate={setFilterDate}
              view={view}
              setView={setView}
            />
          </div>
        }
      />
      <PageContent className="space-y-6">
      <div className="panel space-y-2.5 p-3 lg:hidden">
        <OrdersFilters
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          filterType={filterType}
          setFilterType={setFilterType}
          filterDate={filterDate}
          setFilterDate={setFilterDate}
          view={view}
          setView={setView}
          mobile
        />
      </div>

      {error && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-2 text-xs font-semibold text-danger">
          {error}
        </div>
      )}

      {kitchenMsg && (
        <div className="rounded-xl border border-success/30 bg-success/10 px-4 py-2 text-xs font-semibold text-success">
          {kitchenMsg}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <PipeCard icon={<ShoppingBag size={18} />} label="طلبات توصيل" count={pipeline.total} />
        <PipeCard icon={<Clock size={18} />} label="جديدة" count={pipeline.new} tone="blue" />
        <PipeCard icon={<Clock size={18} />} label="تحضير" count={pipeline.prep} tone="amber" />
        <PipeCard icon={<Truck size={18} />} label="في الطريق" count={pipeline.out} tone="purple" />
        <PipeCard icon={<CheckCircle size={18} />} label="مكتملة" count={pipeline.done} tone="green" />
      </div>

      <div className="space-y-3">
        {!filtered.length ? (
          <div className="rounded-2xl border border-dashed border-paper-line p-12 text-center text-xs text-ink-mute">
            لا توجد طلبات — أنشئ طلب توصيل من نقطة البيع (زر «توصيل»)
          </div>
        ) : view === "calendar" ? (
          byDay.map(([day, dayOrders]) => (
            <div key={day} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-bold text-ink">
                  {new Date(day + "T12:00:00").toLocaleDateString("ar-LY", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </h3>
                <span className="text-[11px] font-bold text-ink-mute">
                  {dayOrders.length} طلب
                </span>
              </div>
              {dayOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  settings={settings}
                  busyId={busyId}
                  canCancel={canCancel}
                  driverDraft={driverDraft}
                  setDriverDraft={setDriverDraft}
                  highlighted={order.id === initialOrderId}
                  onAdvance={() => void advance(order)}
                  onCancel={() => void cancel(order)}
                  onPrintReceipt={() => setReceiptOrder(order)}
                  onPrintKitchen={() => void printKitchen(order)}
                />
              ))}
            </div>
          ))
        ) : (
          <>
            <div className="space-y-3 lg:hidden">
              {filtered.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  settings={settings}
                  busyId={busyId}
                  canCancel={canCancel}
                  driverDraft={driverDraft}
                  setDriverDraft={setDriverDraft}
                  highlighted={order.id === initialOrderId}
                  onAdvance={() => void advance(order)}
                  onCancel={() => void cancel(order)}
                  onPrintReceipt={() => setReceiptOrder(order)}
                  onPrintKitchen={() => void printKitchen(order)}
                />
              ))}
            </div>
            <div className="hidden lg:block">
              <DataTable
                data={filtered}
                columns={orderColumns}
                emptyMessage="لا توجد طلبات — أنشئ طلب توصيل من نقطة البيع"
                getRowClassName={(o) =>
                  o.id === initialOrderId ? "bg-highlight/10 ring-1 ring-highlight/30" : undefined
                }
              />
            </div>
          </>
        )}
      </div>
      </PageContent>

      {receiptOrder && (
        <ReceiptModal
          order={receiptOrder}
          settings={settings}
          changeDue={receiptOrder.change_due ?? 0}
          onClose={() => setReceiptOrder(null)}
          autoPrint={false}
          mobile={isPhone}
        />
      )}
    </>
  );
}

function OrderCard({
  order,
  settings,
  busyId,
  canCancel,
  driverDraft,
  setDriverDraft,
  highlighted,
  onAdvance,
  onCancel,
  onPrintReceipt,
  onPrintKitchen,
}: {
  order: Order;
  settings: BranchSettings;
  busyId: string | null;
  canCancel: boolean;
  driverDraft: Record<string, string>;
  setDriverDraft: Dispatch<SetStateAction<Record<string, string>>>;
  highlighted?: boolean;
  onAdvance: () => void;
  onCancel: () => void;
  onPrintReceipt: () => void;
  onPrintKitchen: () => void;
}) {
  const next = NEXT[order.status];
  const nextLabel = NEXT_LABEL[order.status];
  return (
    <div
      id={`order-${order.id}`}
      className={cn(
        "rounded-2xl border border-paper-line bg-paper-raised p-4 shadow-xs",
        highlighted && "ring-2 ring-highlight/40"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-extrabold text-ink">{order.order_number}</span>
            <StatusBadge status={order.status} />
            <span className="rounded-full bg-paper px-2 py-0.5 text-[10px] font-bold text-ink-mute">
              {order.type === "delivery"
                ? "توصيل"
                : order.type === "special_event"
                  ? "مناسبة"
                  : "مباشر"}
            </span>
          </div>
          <p className="text-xs font-bold text-ink">
            {order.customer_name || "عميل"} ·{" "}
            <span className="font-mono text-ink-mute">
              {order.customer_phone || "—"}
            </span>
          </p>
          {order.delivery_address && (
            <p className="text-xs text-ink-mute">
              📍 {order.delivery_address}
              {order.delivery_date ? ` · ${order.delivery_date}` : ""}
            </p>
          )}
          <p className="font-mono text-sm font-bold text-highlight">
            {formatMoney(order.total_amount, settings.currency_symbol)}
            {(order.delivery_fee || 0) > 0 && (
              <span className="ms-2 text-[11px] font-semibold text-ink-mute">
                (منها توصيل{" "}
                {formatMoney(order.delivery_fee || 0, settings.currency_symbol)})
              </span>
            )}
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[220px]">
          {(order.type === "delivery" || order.type === "special_event") &&
            order.status !== "completed" &&
            order.status !== "cancelled" && (
              <input
                type="text"
                placeholder="اسم السائق / المندوب"
                value={driverDraft[order.id] ?? order.delivery_driver ?? ""}
                onChange={(e) =>
                  setDriverDraft((d) => ({
                    ...d,
                    [order.id]: e.target.value,
                  }))
                }
                className="rounded-xl border border-paper-line bg-paper px-3 py-2 text-xs"
              />
            )}
          <div className="flex flex-wrap gap-1.5">
            {next && nextLabel && (
              <button
                type="button"
                disabled={busyId === order.id}
                onClick={onAdvance}
                className="btn-primary inline-flex items-center gap-1 text-[11px] font-bold"
              >
                {nextLabel}
                <CaretLeft size={12} />
              </button>
            )}
            {order.customer_phone && (
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full bg-[#25D366] px-3 py-1.5 text-[11px] font-bold text-white"
                onClick={() =>
                  openWhatsApp(
                    order.customer_phone!,
                    saleShareMessage(
                      order.order_number,
                      order.total_amount,
                      settings.currency_symbol,
                      settings.name,
                      order.customer_name
                    ) +
                      (order.delivery_address
                        ? `\nالعنوان: ${order.delivery_address}`
                        : "")
                  )
                }
              >
                <WhatsappLogo size={14} weight="fill" />
                واتساب
              </button>
            )}
            {isKitchenTicketOrder(order) &&
              order.status !== "cancelled" &&
              order.status !== "completed" && (
                <button
                  type="button"
                  disabled={busyId === order.id}
                  className="inline-flex items-center gap-1 rounded-full border border-warning/40 bg-warning/10 px-3 py-1.5 text-[11px] font-bold text-warning"
                  onClick={onPrintKitchen}
                >
                  <CookingPot size={14} />
                  مطبخ
                </button>
              )}
            {order.status === "completed" && (
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full border border-paper-line px-3 py-1.5 text-[11px] font-bold"
                onClick={onPrintReceipt}
              >
                <Printer size={14} />
                إيصال
              </button>
            )}
            {canCancel &&
              order.status !== "cancelled" &&
              order.status !== "completed" && (
                <button
                  type="button"
                  disabled={busyId === order.id}
                  onClick={onCancel}
                  className="rounded-full border border-danger/30 px-3 py-1.5 text-[11px] font-bold text-danger"
                >
                  إلغاء
                </button>
              )}
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] text-ink-mute">
        {order.items.slice(0, 6).map((it, i) => (
          <span
            key={`${it.product_id}-${i}`}
            className="rounded-full bg-paper px-2 py-0.5"
          >
            {it.name} ×{it.quantity}
          </span>
        ))}
      </div>
    </div>
  );
}

function OrdersFilters({
  filterStatus,
  setFilterStatus,
  filterType,
  setFilterType,
  filterDate,
  setFilterDate,
  view,
  setView,
  mobile = false,
}: {
  filterStatus: string;
  setFilterStatus: (v: string) => void;
  filterType: string;
  setFilterType: (v: string) => void;
  filterDate: string;
  setFilterDate: (v: string) => void;
  view: "list" | "calendar";
  setView: (v: "list" | "calendar") => void;
  mobile?: boolean;
}) {
  const fieldClass = cn(
    "input-field min-h-10 w-full rounded-xl border border-paper-line/70 bg-paper px-3 py-2 text-xs font-semibold text-ink",
    mobile && "bg-paper-raised"
  );

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2",
        mobile && "grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap"
      )}
    >
      <select
        value={filterStatus}
        onChange={(e) => setFilterStatus(e.target.value)}
        className={fieldClass}
      >
        <option value="all">كل الحالات</option>
        <option value="new">جديد</option>
        <option value="in_prep">تحضير</option>
        <option value="ready">جاهز</option>
        <option value="delivering">جاري التوصيل</option>
        <option value="completed">مكتمل</option>
        <option value="cancelled">ملغى</option>
      </select>
      <select
        value={filterType}
        onChange={(e) => setFilterType(e.target.value)}
        className={fieldClass}
      >
        <option value="delivery">توصيل فقط</option>
        <option value="special_event">مناسبات</option>
        <option value="all">كل الأنواع</option>
        <option value="pos_walk_in">بيع مباشر</option>
      </select>
      <input
        type="date"
        value={filterDate}
        onChange={(e) => setFilterDate(e.target.value)}
        className={cn(fieldClass, mobile && "col-span-2 sm:col-span-1 sm:w-auto")}
        title="تصفية بتاريخ التوصيل"
      />
      <div
        className={cn(
          "flex rounded-xl border border-paper-line/70 bg-paper p-0.5 text-[11px] font-bold",
          mobile && "col-span-2 w-full sm:col-span-1 sm:w-auto"
        )}
      >
        <button
          type="button"
          onClick={() => setView("list")}
          className={cn(
            "min-h-9 flex-1 rounded-lg px-3 py-1.5 transition",
            view === "list" ? "bg-highlight text-white shadow-xs" : "text-ink-mute"
          )}
        >
          قائمة
        </button>
        <button
          type="button"
          onClick={() => setView("calendar")}
          className={cn(
            "min-h-9 flex-1 rounded-lg px-3 py-1.5 transition",
            view === "calendar" ? "bg-highlight text-white shadow-xs" : "text-ink-mute"
          )}
        >
          حسب اليوم
        </button>
      </div>
    </div>
  );
}

function PipeCard({
  icon,
  label,
  count,
  tone,
}: {
  icon: ReactNode;
  label: string;
  count: number;
  tone?: "blue" | "amber" | "purple" | "green";
}) {
  return (
    <div className="rounded-2xl border border-paper-line bg-paper-raised p-3">
      <div className="flex items-center gap-2 text-[11px] text-ink-mute">
        <span
          className={cn(
            tone === "blue" && "text-blue-600",
            tone === "amber" && "text-amber-600",
            tone === "purple" && "text-purple-600",
            tone === "green" && "text-emerald-600"
          )}
        >
          {icon}
        </span>
        {label}
      </div>
      <div className="mt-1 font-mono text-lg font-extrabold text-ink">{count}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const map: Record<OrderStatus, string> = {
    new: "bg-info/12 text-info",
    in_prep: "bg-warning/12 text-warning",
    ready: "bg-highlight/12 text-highlight",
    delivering: "bg-accent/12 text-accent",
    completed: "bg-success/12 text-success",
    cancelled: "bg-danger/12 text-danger",
  };
  const labels: Record<OrderStatus, string> = {
    new: "جديد",
    in_prep: "تحضير",
    ready: "جاهز",
    delivering: "جاري التوصيل",
    completed: "مكتمل",
    cancelled: "ملغى",
  };
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-[11px] font-bold",
        map[status]
      )}
    >
      {labels[status]}
    </span>
  );
}
