import type { BranchSettings, Order } from "../types";
import { PAYMENT_AR } from "../pdf/pdfBrand";
import {
  buildEscPosReceiptBytes,
  canUseWebSerial,
  isSerialConnected,
} from "./escpos";
import { isBluetoothConnected } from "./bluetooth-printer";
import { isNetworkConnected } from "./network-printer";
import { isUsbOtgConnected } from "./usb-otg-printer";
import { writeToPrinter } from "./printer-hub";
import { printThermalReceiptHtml } from "../invoice-html";

export type ThermalPrintMode = "escpos" | "html" | "auto";

export function buildReceiptTextLines(
  order: Order,
  settings: BranchSettings,
  changeDue = 0
): string[] {
  const company = settings.name?.trim() || "OmniSales";
  const payment = PAYMENT_AR[order.payment_method] || order.payment_method;
  const sym = settings.currency_symbol;
  const lines: string[] = [
    `##${company}`,
    "··فاتورة حرارية",
  ];
  if (settings.address) lines.push(settings.address);
  if (settings.phone) lines.push(`هاتف: ${settings.phone}`);
  lines.push("------------------------------");
  lines.push(`فاتورة: ${order.order_number}`);
  lines.push(new Date(order.created_at).toLocaleString("ar-LY"));
  lines.push(`عميل: ${order.customer_name || "نقدي"}`);
  if (order.customer_phone) lines.push(`هاتف العميل: ${order.customer_phone}`);
  if (order.type === "wholesale") lines.push("نوع البيع: جملة");
  if (order.promotion_name) lines.push(`عرض: ${order.promotion_name}`);
  lines.push("------------------------------");

  for (const item of order.items) {
    const total = (item.quantity * item.unit_price).toFixed(2);
    lines.push(`${item.name}`);
    lines.push(
      `${item.quantity} × ${item.unit_price.toFixed(2)} = ${total} ${sym}`
    );
    if (item.imei) lines.push(`IMEI: ${item.imei}`);
    if (item.serial) lines.push(`S/N: ${item.serial}`);
  }

  lines.push("------------------------------");
  lines.push(`الفرعي: ${order.subtotal.toFixed(2)} ${sym}`);
  if (order.discount_amount > 0) {
    const discLabel = order.promotion_name
      ? `الخصم (${order.promotion_name})`
      : "الخصم";
    lines.push(`${discLabel}: -${order.discount_amount.toFixed(2)} ${sym}`);
  }
  if (order.tax_amount > 0) {
    lines.push(`الضريبة: ${order.tax_amount.toFixed(2)} ${sym}`);
  }
  if ((order.delivery_fee || 0) > 0) {
    lines.push(`توصيل: ${Number(order.delivery_fee).toFixed(2)} ${sym}`);
  }
  lines.push(`##الإجمالي: ${order.total_amount.toFixed(2)} ${sym}`);
  lines.push(`الدفع: ${payment}`);
  if (order.delivery_address) {
    lines.push(`عنوان: ${order.delivery_address}`);
  }
  if (changeDue > 0) {
    lines.push(`الباقي: ${changeDue.toFixed(2)} ${sym}`);
  }
  lines.push("------------------------------");
  lines.push(
    `OS · ${order.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`
  );
  lines.push(settings.receipt_footer || "شكراً لتعاملكم معنا");
  return lines;
}

/**
 * Print thermal receipt:
 * 1) ESC/POS via Web Serial when connected / preferred
 * 2) HTML window.print fallback (always available)
 */
export async function printThermalReceiptSmart(
  order: Order,
  settings: BranchSettings,
  changeDue = 0,
  mode: ThermalPrintMode = "auto"
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
        lines: buildReceiptTextLines(order, settings, changeDue),
        widthMm,
        openDrawer:
          order.payment_method === "cash" || order.payment_method === "mixed",
      });
      await writeToPrinter(bytes);
      return "escpos";
    } catch (err) {
      if (forceEscpos) throw err;
      // auto mode falls through to HTML — caller can inspect return value
    }
  }

  printThermalReceiptHtml(order, settings, changeDue);
  return "html";
}
