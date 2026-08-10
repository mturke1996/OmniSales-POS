import { useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  LockKey,
  LockOpen,
  Money,
  Printer,
} from "@phosphor-icons/react";
import { openShift, closeShift, recordCashMovement } from "../../lib/api";
import { formatMoney } from "../../lib/format";
import { buildZSummary } from "../../lib/analytics";
import { printZReport } from "../../lib/z-report";
import type {
  BranchSettings,
  CashMovement,
  Order,
  ReturnRecord,
  Shift,
} from "../../lib/types";
import { PageHeader } from "../layout/PageHeader";
import { PageContent } from "../layout/PageContent";

export function ShiftsScreen({
  settings,
  openShiftState,
  cashierId = "cashier-1",
  onShiftChange,
  orders = [],
  returns = [],
  cashMovements = [],
  shiftHistory = [],
  onRefreshData,
}: {
  settings: BranchSettings;
  openShiftState: Shift | null;
  cashierId?: string;
  onShiftChange: (shift: Shift | null) => void;
  orders?: Order[];
  returns?: ReturnRecord[];
  cashMovements?: CashMovement[];
  shiftHistory?: Shift[];
  onRefreshData?: () => void;
}) {
  const z = useMemo(
    () => buildZSummary(openShiftState, orders, returns),
    [openShiftState, orders, returns]
  );
  const [openingFloat, setOpeningFloat] = useState(100);
  const [closingCount, setClosingCount] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [moveType, setMoveType] = useState<"in" | "out">("out");
  const [moveAmount, setMoveAmount] = useState("");
  const [moveReason, setMoveReason] = useState("");

  const shiftMoves = useMemo(
    () =>
      cashMovements
        .filter((m) => openShiftState && m.shift_id === openShiftState.id)
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ),
    [cashMovements, openShiftState]
  );

  async function handleOpen() {
    setBusy(true);
    setMessage(null);
    try {
      const shift = await openShift(cashierId, Number(openingFloat));
      onShiftChange(shift);
      setMessage("تم فتح الوردية بنجاح");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "فشل فتح الوردية");
    } finally {
      setBusy(false);
    }
  }

  async function handleClose() {
    if (!openShiftState) return;
    setBusy(true);
    setMessage(null);
    try {
      const counted = closingCount
        ? Number(closingCount)
        : openShiftState.expected_cash;
      const closed = await closeShift(counted);
      try {
        printZReport({
          settings,
          shift: closed,
          orders,
          returns,
          cashMovements,
          cashierName: cashierId,
        });
      } catch {
        /* print blocked — still closed */
      }
      onShiftChange(null);
      setClosingCount("");
      onRefreshData?.();
      setMessage("تم إغلاق الوردية وطباعة تقرير Z بنجاح");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "فشل إغلاق الوردية");
    } finally {
      setBusy(false);
    }
  }

  function handlePrintOpenZ() {
    if (!openShiftState) return;
    try {
      printZReport({
        settings,
        shift: openShiftState,
        orders,
        returns,
        cashMovements,
        cashierName: cashierId,
      });
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "تعذر الطباعة");
    }
  }

  return (
    <>
      <PageHeader
        title="الورديات والخزينة"
        description="تتبع العهد النقدية، المبيعات المباشرة، وفروقات الخزينة وتقرير Z"
        breadcrumbs={[{ label: "OmniSales" }, { label: "الرئيسية" }, { label: "الورديات" }]}
        actions={
          openShiftState ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/12 px-3 py-1.5 text-xs font-bold text-success">
              <LockOpen size={14} />
              وردية مفتوحة
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/12 px-3 py-1.5 text-xs font-bold text-warning">
              <LockKey size={14} />
              لا توجد وردية
            </span>
          )
        }
      />
      <PageContent size="narrow" className="space-y-6">

      {message && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">
          {message}
        </div>
      )}

      {/* Main Shift Action Panel */}
      {!openShiftState ? (
        <div className="rounded-2xl border border-paper-line bg-paper-raised p-6 shadow-sm max-w-md mx-auto space-y-4">
          <div className="flex items-center gap-2 text-ink font-bold text-base">
            <Money size={22} className="text-emerald-600" />
            <h3>بدء وردية جديدة</h3>
          </div>
          <p className="text-xs text-ink-mute leading-relaxed">
            أدخل قيمة المبلغ الأولي المتاح في الدرج (العهدة/الفيش) لبداية الوردية.
          </p>

          <div>
            <label className="text-xs font-bold text-ink">العهدة النقدية الأولية (Float Cash)</label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="number"
                value={openingFloat}
                onChange={(e) => setOpeningFloat(Number(e.target.value))}
                className="w-full rounded-xl border border-paper-line bg-paper px-3 py-2 text-sm font-mono font-bold"
              />
              <span className="text-xs font-bold text-ink-mute">{settings.currency_symbol}</span>
            </div>
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={() => void handleOpen()}
            className="btn-primary w-full text-xs py-3 font-bold"
          >
            {busy ? "جاري الفتح..." : "فتح الوردية الآن"}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Shift Stats Card */}
          <div className="lg:col-span-2 space-y-4 rounded-2xl border border-paper-line bg-paper-raised p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-paper-line pb-3">
              <div>
                <h3 className="font-bold text-ink">بيانات الوردية المفتوحة</h3>
                <p className="text-xs text-ink-mute">
                  تاريخ الفتح: {new Date(openShiftState.opened_at).toLocaleString("ar-LY")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                className="btn-ghost text-xs inline-flex items-center gap-1.5"
              >
                <Printer size={16} />
                طباعة تقرير مبدئي
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              <StatBox
                label="العهدة الأولية"
                value={formatMoney(openShiftState.opening_float, settings.currency_symbol)}
              />
              <StatBox
                label="مبيعات نقداً"
                value={formatMoney(openShiftState.cash_sales || 0, settings.currency_symbol)}
                color="text-emerald-700"
              />
              <StatBox
                label="مبيعات بطاقة/تحويل"
                value={formatMoney(openShiftState.card_sales || 0, settings.currency_symbol)}
                color="text-blue-700"
              />
              <StatBox
                label="مبيعات آجل"
                value={formatMoney(openShiftState.debt_sales || 0, settings.currency_symbol)}
                color="text-amber-700"
              />
              <StatBox
                label="مرتجعات نقدية"
                value={formatMoney(
                  openShiftState.cash_returns ?? z.cashReturns,
                  settings.currency_symbol
                )}
                color="text-red-600"
              />
              <StatBox
                label="صافي مبيعات الوردية"
                value={formatMoney(z.netSales, settings.currency_symbol)}
                color="text-highlight"
              />
            </div>

            <div className="mt-4 rounded-xl border border-highlight/25 bg-highlight/5 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-ink">ملخص Z-Report</p>
                <button
                  type="button"
                  onClick={handlePrintOpenZ}
                  className="inline-flex items-center gap-1 rounded-full border border-highlight/30 bg-paper-raised px-2.5 py-1 text-[11px] font-bold text-highlight"
                >
                  <Printer size={14} /> طباعة
                </button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                <div>
                  <p className="text-ink-mute">فواتير</p>
                  <p className="font-mono font-bold">{z.invoiceCount}</p>
                </div>
                <div>
                  <p className="text-ink-mute">إجمالي</p>
                  <p className="font-mono font-bold">
                    {formatMoney(z.grossSales, settings.currency_symbol)}
                  </p>
                </div>
                <div>
                  <p className="text-ink-mute">كل المرتجعات</p>
                  <p className="font-mono font-bold text-danger">
                    {formatMoney(z.returnsTotal, settings.currency_symbol)}
                  </p>
                </div>
                <div>
                  <p className="text-ink-mute">صافي</p>
                  <p className="font-mono font-bold text-highlight">
                    {formatMoney(z.netSales, settings.currency_symbol)}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-paper p-4 border border-paper-line flex items-center justify-between mt-4">
              <div>
                <span className="text-xs text-ink-mute font-medium">النقد المتوقع بالدرج:</span>
                <div className="text-xl font-black text-ink font-mono mt-0.5">
                  {formatMoney(openShiftState.expected_cash, settings.currency_symbol)}
                </div>
              </div>
              <div className="text-end text-xs text-ink-mute">
                <div>عهدة + نقد ± حركات − مرتجعات</div>
              </div>
            </div>

            {/* Cash drawer movements */}
            <div className="mt-4 space-y-3 rounded-xl border border-paper-line bg-paper p-4">
              <h4 className="text-sm font-bold text-ink">حركات الصندوق</h4>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setMoveType("out")}
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold ${
                    moveType === "out"
                      ? "bg-danger text-white"
                      : "bg-paper-raised text-ink-mute"
                  }`}
                >
                  <ArrowUpRight size={14} /> سحب
                </button>
                <button
                  type="button"
                  onClick={() => setMoveType("in")}
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold ${
                    moveType === "in"
                      ? "bg-success text-white"
                      : "bg-paper-raised text-ink-mute"
                  }`}
                >
                  <ArrowDownLeft size={14} /> إيداع
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <input
                  type="number"
                  step="0.01"
                  placeholder="المبلغ"
                  value={moveAmount}
                  onChange={(e) => setMoveAmount(e.target.value)}
                  className="rounded-xl border border-paper-line bg-paper-raised px-3 py-2 font-mono text-xs"
                />
                <input
                  type="text"
                  placeholder="السبب"
                  value={moveReason}
                  onChange={(e) => setMoveReason(e.target.value)}
                  className="rounded-xl border border-paper-line bg-paper-raised px-3 py-2 text-xs sm:col-span-2"
                />
              </div>
              <button
                type="button"
                disabled={busy || !moveAmount}
                className="btn-ghost text-xs font-bold"
                onClick={() => {
                  void (async () => {
                    setBusy(true);
                    setMessage(null);
                    try {
                      const { shift: next } = await recordCashMovement({
                        type: moveType,
                        amount: Number(moveAmount),
                        reason: moveReason,
                        cashier_id: cashierId,
                      });
                      onShiftChange(next);
                      setMoveAmount("");
                      setMoveReason("");
                      setMessage(
                        moveType === "in"
                          ? "تم تسجيل إيداع الصندوق"
                          : "تم تسجيل سحب من الصندوق"
                      );
                      onRefreshData?.();
                    } catch (e) {
                      setMessage(
                        e instanceof Error ? e.message : "فشل تسجيل الحركة"
                      );
                    } finally {
                      setBusy(false);
                    }
                  })();
                }}
              >
                تسجيل الحركة
              </button>
              {shiftMoves.length > 0 && (
                <ul className="max-h-36 space-y-1 overflow-y-auto text-xs">
                  {shiftMoves.map((m) => (
                    <li
                      key={m.id}
                      className="flex justify-between gap-2 border-t border-paper-line py-1.5"
                    >
                      <span className="text-ink-mute">
                        {m.type === "in" ? "إيداع" : "سحب"} · {m.reason}
                      </span>
                      <span
                        className={`font-mono font-bold ${
                          m.type === "in" ? "text-success" : "text-danger"
                        }`}
                      >
                        {m.type === "in" ? "+" : "−"}
                        {formatMoney(m.amount, settings.currency_symbol)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Close Shift Panel */}
          <div className="space-y-4 rounded-2xl border border-paper-line bg-paper-raised p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-ink border-b border-paper-line pb-3">إغلاق الوردية</h3>
              <p className="mt-3 text-xs text-ink-mute leading-relaxed">
                عد النقدية الفعلية الموجودة في الخزينة حالياً وحساب العجز أو الفائض إن وجد.
              </p>

              <div className="mt-4">
                <label className="text-xs font-bold text-ink">المبلغ النقدي المحسوب باليد</label>
                <input
                  type="number"
                  placeholder={openShiftState.expected_cash.toString()}
                  value={closingCount}
                  onChange={(e) => setClosingCount(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-paper-line bg-paper px-3 py-2 text-sm font-mono font-bold"
                />
              </div>

              {closingCount && (
                <div className="mt-3 rounded-lg bg-paper p-2.5 text-xs">
                  <div className="flex justify-between">
                    <span>الفارق (Variance):</span>
                    <span
                      className={`font-mono font-bold ${
                        Number(closingCount) - openShiftState.expected_cash < 0
                          ? "text-red-600"
                          : "text-emerald-700"
                      }`}
                    >
                      {(Number(closingCount) - openShiftState.expected_cash).toFixed(2)} {settings.currency_symbol}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={() => void handleClose()}
              className="btn-primary w-full text-xs py-3 font-bold mt-4"
            >
              {busy ? "جاري الإغلاق..." : "إغلاق الوردية وحفظ Z-Report"}
            </button>
          </div>
        </div>
      )}

      {shiftHistory.length > 0 && (
        <div className="space-y-3 rounded-2xl border border-paper-line bg-paper-raised p-4">
          <h3 className="text-sm font-bold text-ink">سجل الورديات المغلقة</h3>
          <div className="space-y-2">
            {shiftHistory.slice(0, 20).map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-paper-line bg-paper px-3 py-2.5 text-xs"
              >
                <div>
                  <p className="font-bold text-ink">
                    {new Date(s.opened_at).toLocaleString("ar-LY")}
                    {s.closed_at
                      ? ` → ${new Date(s.closed_at).toLocaleTimeString("ar-LY")}`
                      : ""}
                  </p>
                  <p className="text-[11px] text-ink-mute">
                    نقد متوقع {formatMoney(s.expected_cash, settings.currency_symbol)}
                    {s.variance != null
                      ? ` · فرق ${formatMoney(s.variance, settings.currency_symbol)}`
                      : ""}
                  </p>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full border border-paper-line px-2.5 py-1 text-[11px] font-bold"
                  onClick={() => {
                    try {
                      printZReport({
                        settings,
                        shift: s,
                        orders,
                        returns,
                        cashMovements,
                        cashierName: s.cashier_id,
                      });
                    } catch (e) {
                      setMessage(
                        e instanceof Error ? e.message : "تعذر الطباعة"
                      );
                    }
                  }}
                >
                  <Printer size={14} /> Z
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      </PageContent>
    </>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl border border-paper-line bg-paper p-3 text-right">
      <div className="text-[11px] text-ink-mute">{label}</div>
      <div className={`mt-1 text-sm font-bold font-mono ${color || "text-ink"}`}>{value}</div>
    </div>
  );
}
