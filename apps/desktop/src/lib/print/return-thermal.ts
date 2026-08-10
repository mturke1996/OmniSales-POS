import type { BranchSettings, Order, ReturnRecord } from "../types";
import {
  buildEscPosReceiptBytes,
  canUseWebSerial,
  isSerialConnected,
} from "./escpos";
import { isBluetoothConnected } from "./bluetooth-printer";
import { isNetworkConnected } from "./network-printer";
import { isUsbOtgConnected } from "./usb-otg-printer";
import { writeToPrinter } from "./printer-hub";
import { printReturnReceiptHtml } from "./return-receipt-html";

const REFUND_AR: Record<string, string> = {
  cash: "نقداً",
  card: "بطاقة",
  credit: "رصيد عميل",
};

export function buildReturnReceiptTextLines(
  record: ReturnRecord,
  order: Order,
  settings: BranchSettings
): string[] {
  const company = settings.name?.trim() || "OmniSales";
  const sym = settings.currency_symbol;
  const method = REFUND_AR[record.refund_method] || record.refund_method;

  const lines: string[] = [
    `##${company}`,
    "··إيصال مرتجع",
    "------------------------------",
    `مرتجع: ${record.return_number}`,
    `فاتورة: ${record.order_number}`,
    new Date(record.created_at).toLocaleString("ar-LY"),
    `عميل: ${record.customer_name || order.customer_name || "نقدي"}`,
    `الاسترداد: ${method}`,
    "------------------------------",
  ];

  for (const item of record.items) {
    const total = (item.quantity * item.unit_refund).toFixed(2);
    lines.push(`${item.name}`);
    lines.push(
      `${item.quantity} × ${item.unit_refund.toFixed(2)} = ${total} ${sym}${
        item.restock ? "" : " (بدون إعادة مخزون)"
      }`
    );
  }

  lines.push("------------------------------");
  lines.push(`##الاسترداد: ${record.total_refund.toFixed(2)} ${sym}`);
  if (record.notes) lines.push(`ملاحظة: ${record.notes}`);
  lines.push("------------------------------");
  lines.push(settings.receipt_footer || "شكراً لتعاملكم معنا");
  return lines;
}

export type ReturnPrintMode = "escpos" | "html" | "auto";

export async function printReturnReceiptSmart(
  record: ReturnRecord,
  order: Order,
  settings: BranchSettings,
  mode: ReturnPrintMode = "auto"
): Promise<"escpos" | "html"> {
  const forceEscpos = mode === "escpos";
  const tryEscpos =
    forceEscpos ||
    (mode === "auto" &&
      (isSerialConnected() ||
        isUsbOtgConnected() ||
        isNetworkConnected() ||
        isBluetoothConnected() ||
        canUseWebSerial()));

  if (tryEscpos) {
    try {
      const widthMm = settings.thermal_width_mm === 58 ? 58 : 80;
      const bytes = await buildEscPosReceiptBytes({
        lines: buildReturnReceiptTextLines(record, order, settings),
        widthMm,
        openDrawer: record.refund_method === "cash",
      });
      await writeToPrinter(bytes);
      return "escpos";
    } catch (err) {
      if (forceEscpos) throw err;
    }
  }

  printReturnReceiptHtml(record, order, settings);
  return "html";
}
