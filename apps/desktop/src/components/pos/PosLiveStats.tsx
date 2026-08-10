import { ChartLineUp, Receipt, ClockCounterClockwise } from "@phosphor-icons/react";
import { useMemo } from "react";
import { computeAnalytics } from "../../lib/analytics";
import { formatMoney } from "../../lib/format";
import { cn } from "../../lib/cn";
import type { Order, ReturnRecord, Shift } from "../../lib/types";

export function PosLiveStats({
  orders,
  returns,
  openShift,
  currencySymbol,
  compact = false,
}: {
  orders: Order[];
  returns: ReturnRecord[];
  openShift: Shift | null;
  currencySymbol: string;
  compact?: boolean;
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
    <div
      className={cn(
        "flex shrink-0 gap-2 overflow-x-auto border-b border-paper-line/60 bg-paper scrollbar-none",
        compact ? "px-2 py-1" : "px-3 py-2"
      )}
    >
      <StatChip
        compact={compact}
        icon={<ChartLineUp size={compact ? 12 : 14} weight="duotone" />}
        label="مبيعات اليوم"
        value={formatMoney(today.netSales, currencySymbol)}
        hint={`${today.orderCount} فاتورة`}
      />
      <StatChip
        compact={compact}
        icon={<Receipt size={compact ? 12 : 14} weight="duotone" />}
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
          compact={compact}
          icon={<ClockCounterClockwise size={compact ? 12 : 14} weight="duotone" />}
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
  compact = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "shrink-0 rounded-xl border border-paper-line/70 bg-paper-raised shadow-soft",
        compact ? "min-w-[6rem] px-2 py-1" : "min-w-[7.5rem] px-3 py-2"
      )}
    >
      <div
        className={cn(
          "flex items-center gap-1 font-bold text-ink-mute",
          compact ? "text-[8px]" : "text-[9px]"
        )}
      >
        {icon}
        {label}
      </div>
      <p className={cn("money-big mt-0.5 font-bold text-ink", compact ? "text-xs" : "text-sm")}>
        {value}
      </p>
      {hint && (
        <p className={cn("mt-0.5 text-ink-mute", compact ? "text-[8px]" : "text-[9px]")}>{hint}</p>
      )}
    </div>
  );
}
