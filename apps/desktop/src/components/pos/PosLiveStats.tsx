import { ChartLineUp, Receipt, ClockCounterClockwise } from "@phosphor-icons/react";
import { useMemo } from "react";
import { computeAnalytics } from "../../lib/analytics";
import { formatMoney } from "../../lib/format";
import type { Order, ReturnRecord, Shift } from "../../lib/types";

export function PosLiveStats({
  orders,
  returns,
  openShift,
  currencySymbol,
}: {
  orders: Order[];
  returns: ReturnRecord[];
  openShift: Shift | null;
  currencySymbol: string;
}) {
  const today = useMemo(
    () =>
      computeAnalytics({
        orders,
        returns,
        products: [],
        customers: [],
        expenses: [],
        openShift,
        period: "today",
      }),
    [orders, returns, openShift]
  );

  const shiftStats = useMemo(() => {
    if (!openShift) return null;
    return computeAnalytics({
      orders,
      returns,
      products: [],
      customers: [],
      expenses: [],
      openShift,
      period: "shift",
    });
  }, [orders, returns, openShift]);

  const shiftTotal = openShift
    ? openShift.cash_sales + openShift.card_sales + openShift.debt_sales
    : 0;

  return (
    <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-paper-line/60 bg-paper px-3 py-2 scrollbar-none">
      <StatChip
        icon={<ChartLineUp size={14} weight="duotone" />}
        label="مبيعات اليوم"
        value={formatMoney(today.netSales, currencySymbol)}
        hint={`${today.orderCount} فاتورة`}
      />
      <StatChip
        icon={<Receipt size={14} weight="duotone" />}
        label="إجمالي اليوم"
        value={formatMoney(today.grossSales, currencySymbol)}
        hint={
          today.returnsTotal > 0
            ? `مرتجعات ${formatMoney(today.returnsTotal, currencySymbol)}`
            : "قبل المرتجعات"
        }
      />
      {openShift && shiftStats && (
        <StatChip
          icon={<ClockCounterClockwise size={14} weight="duotone" />}
          label="الوردية"
          value={formatMoney(shiftStats.netSales, currencySymbol)}
          hint={`تحصيل ${formatMoney(shiftTotal, currencySymbol)}`}
        />
      )}
    </div>
  );
}

function StatChip({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="min-w-[7.5rem] shrink-0 rounded-xl border border-paper-line/70 bg-paper-raised px-3 py-2 shadow-soft">
      <div className="flex items-center gap-1 text-[9px] font-bold text-ink-mute">
        {icon}
        {label}
      </div>
      <p className="money-big mt-0.5 text-sm font-bold text-ink">{value}</p>
      {hint && <p className="mt-0.5 text-[9px] text-ink-mute">{hint}</p>}
    </div>
  );
}
