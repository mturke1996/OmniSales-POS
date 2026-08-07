import type { BranchSettings, CashMovement, Order, ReturnRecord, Shift } from "./types";
import { buildZSummary } from "./analytics";
import { formatMoney } from "./format";

export function buildZReportHtml(input: {
  settings: BranchSettings;
  shift: Shift;
  orders: Order[];
  returns: ReturnRecord[];
  cashMovements?: CashMovement[];
  cashierName?: string;
}): string {
  const { settings, shift, orders, returns, cashMovements = [], cashierName } =
    input;
  const z = buildZSummary(shift, orders, returns);
  const moves = cashMovements.filter((m) => m.shift_id === shift.id);
  const cashIn = moves
    .filter((m) => m.type === "in")
    .reduce((s, m) => s + m.amount, 0);
  const cashOut = moves
    .filter((m) => m.type === "out")
    .reduce((s, m) => s + m.amount, 0);
  const sym = settings.currency_symbol;
  const money = (n: number) => formatMoney(n, sym);

  const rows: [string, string][] = [
    ["الفرع", settings.name],
    ["الكاشير", cashierName || shift.cashier_id],
    ["فتح الوردية", new Date(shift.opened_at).toLocaleString("ar-LY")],
    [
      "إغلاق الوردية",
      shift.closed_at
        ? new Date(shift.closed_at).toLocaleString("ar-LY")
        : "—",
    ],
    ["عهدة الافتتاح", money(shift.opening_float)],
    ["مبيعات نقدية", money(shift.cash_sales)],
    ["مبيعات بطاقة/تحويل", money(shift.card_sales)],
    ["مبيعات آجلة", money(shift.debt_sales)],
    ["إجمالي المبيعات", money(z.grossSales)],
    ["مرتجعات نقدية", money(z.cashReturns)],
    ["مرتجعات بطاقة", money(z.cardReturns)],
    ["مرتجعات رصيد", money(z.creditReturns)],
    ["صافي المبيعات", money(z.netSales)],
    ["عدد الفواتير", String(z.invoiceCount)],
    ["إيداعات صندوق", money(cashIn)],
    ["سحوبات/مصروفات صندوق", money(cashOut)],
    ["النقد المتوقع", money(shift.expected_cash)],
    [
      "العدّ الفعلي",
      shift.closing_count != null ? money(shift.closing_count) : "—",
    ],
    [
      "الفرق",
      shift.variance != null ? money(shift.variance) : "—",
    ],
  ];

  const table = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 8px;border-bottom:1px solid #e5e5e5;color:#525252">${k}</td><td style="padding:6px 8px;border-bottom:1px solid #e5e5e5;text-align:left;font-weight:700;font-variant-numeric:tabular-nums">${v}</td></tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<title>Z-Report ${shift.id.slice(0, 8)}</title>
<style>
  body { font-family: Cairo, "Segoe UI", Tahoma, sans-serif; background:#fafafa; color:#0a0a0a; margin:0; padding:24px; }
  .sheet { max-width:420px; margin:0 auto; background:#fff; border:1px solid #e5e5e5; border-radius:16px; padding:20px 18px; box-shadow:0 12px 40px -20px rgba(10,10,10,.18); }
  h1 { margin:0 0 4px; font-size:1.25rem; }
  .muted { color:#737373; font-size:.75rem; margin-bottom:16px; }
  table { width:100%; border-collapse:collapse; font-size:.85rem; }
  .foot { margin-top:16px; font-size:.7rem; color:#737373; text-align:center; }
  @media print { body { background:#fff; padding:0; } .sheet { box-shadow:none; border:none; } }
</style>
</head>
<body>
  <div class="sheet">
    <h1>تقرير Z — إغلاق وردية</h1>
    <p class="muted">OmniSales · ${settings.name}</p>
    <table>${table}</table>
    <p class="foot">${settings.receipt_footer || ""}</p>
  </div>
  <script>window.onload=()=>{try{window.print()}catch(e){}}</script>
</body>
</html>`;
}

export function printZReport(input: Parameters<typeof buildZReportHtml>[0]) {
  const html = buildZReportHtml(input);
  const w = window.open("", "_blank", "noopener,noreferrer,width=480,height=720");
  if (!w) {
    throw new Error("تعذر فتح المطبعة — اسمح بالنوافذ المنبثقة");
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
