import type { BranchSettings, Customer, Expense, Order } from "./types";
import { formatMoney } from "./format";
import { buildDailyOwnerSummary } from "./whatsapp";
import { buildEscPosReceiptBytes } from "./print/escpos";
import {
  canUseWebSerial,
  isSerialConnected,
} from "./print/escpos";
import { isBluetoothConnected } from "./print/bluetooth-printer";
import { isNetworkConnected } from "./print/network-printer";
import { isUsbOtgConnected } from "./print/usb-otg-printer";
import { writeToPrinter } from "./print/printer-hub";

export interface DailySummaryInput {
  settings: BranchSettings;
  orders: Order[];
  expenses: Expense[];
  customers: Customer[];
}

export function computeDailySummary(input: DailySummaryInput) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const sales = input.orders
    .filter(
      (o) => o.status === "completed" && new Date(o.created_at) >= start
    )
    .reduce((s, o) => s + o.total_amount, 0);

  const expenseTotal = input.expenses
    .filter((e) => new Date(e.created_at) >= start)
    .reduce((s, e) => s + e.amount, 0);

  const debts = input.customers.reduce((s, c) => s + c.balance, 0);

  const deliveryOpen = input.orders.filter(
    (o) =>
      o.type === "delivery" &&
      o.status !== "completed" &&
      o.status !== "cancelled"
  ).length;

  return {
    sales,
    expenses: expenseTotal,
    net: sales - expenseTotal,
    debts,
    deliveryOpen,
    dateLabel: start.toLocaleDateString("ar-LY", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  };
}

export function buildDailySummaryTextLines(input: DailySummaryInput): string[] {
  const { settings } = input;
  const sym = settings.currency_symbol;
  const money = (n: number) => formatMoney(n, sym);
  const d = computeDailySummary(input);

  return [
    `##${settings.name}`,
    "··ملخص يومي للمالك",
    d.dateLabel,
    "------------------------------",
    `مبيعات مكتملة: ${money(d.sales)}`,
    `مصروفات: ${money(d.expenses)}`,
    `##صافي اليوم: ${money(d.net)}`,
    `ديون العملاء: ${money(d.debts)}`,
    `توصيل مفتوح: ${d.deliveryOpen}`,
    "------------------------------",
    "OmniSales POS",
  ];
}

export function buildDailySummaryHtml(input: DailySummaryInput): string {
  const { settings } = input;
  const d = computeDailySummary(input);
  const sym = settings.currency_symbol;
  const money = (n: number) => formatMoney(n, sym);
  const text = buildDailyOwnerSummary({
    branchName: settings.name,
    sales: d.sales,
    expenses: d.expenses,
    debts: d.debts,
    symbol: sym,
    deliveryOpen: d.deliveryOpen,
  }).replace(/\*/g, "");

  const rows: [string, string][] = [
    ["التاريخ", d.dateLabel],
    ["مبيعات مكتملة", money(d.sales)],
    ["مصروفات", money(d.expenses)],
    ["صافي اليوم", money(d.net)],
    ["ديون العملاء", money(d.debts)],
    ["توصيل مفتوح", String(d.deliveryOpen)],
  ];

  const table = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 8px;border-bottom:1px solid #e5e5e5;color:#525252">${k}</td><td style="padding:6px 8px;border-bottom:1px solid #e5e5e5;text-align:left;font-weight:700">${v}</td></tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<title>ملخص يومي</title>
<style>
  body { font-family: Cairo, Tahoma, sans-serif; background:#fafafa; margin:0; padding:24px; }
  .sheet { max-width:420px; margin:0 auto; background:#fff; border:1px solid #e5e5e5; border-radius:16px; padding:20px; }
  h1 { margin:0 0 8px; font-size:1.2rem; }
  pre { white-space:pre-wrap; font-size:12px; background:#f8fafc; padding:12px; border-radius:12px; }
  table { width:100%; border-collapse:collapse; font-size:.85rem; margin-top:12px; }
</style>
</head>
<body>
  <div class="sheet">
    <h1>ملخص يومي — ${settings.name}</h1>
    <table>${table}</table>
    <pre>${text}</pre>
  </div>
  <script>window.onload=()=>{try{window.print()}catch(e){}}</script>
</body>
</html>`;
}

export function printDailySummaryHtml(input: DailySummaryInput) {
  const html = buildDailySummaryHtml(input);
  const w = window.open("", "_blank", "noopener,noreferrer,width=480,height=720");
  if (!w) throw new Error("تعذر فتح المطبعة — اسمح بالنوافذ المنبثقة");
  w.document.open();
  w.document.write(html);
  w.document.close();
}

export async function printDailySummarySmart(
  input: DailySummaryInput
): Promise<"escpos" | "html"> {
  const tryEscpos =
    isSerialConnected() ||
    isUsbOtgConnected() ||
    isNetworkConnected() ||
    isBluetoothConnected() ||
    canUseWebSerial();

  if (tryEscpos) {
    try {
      const widthMm = input.settings.thermal_width_mm === 58 ? 58 : 80;
      const bytes = await buildEscPosReceiptBytes({
        lines: buildDailySummaryTextLines(input),
        widthMm,
        openDrawer: false,
      });
      await writeToPrinter(bytes);
      return "escpos";
    } catch {
      // fall through
    }
  }

  printDailySummaryHtml(input);
  return "html";
}
