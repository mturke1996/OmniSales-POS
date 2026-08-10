import type { BranchSettings, Order } from "../types";
import { STATUS_AR } from "../pdf/pdfBrand";
import { buildEscPosReceiptBytes } from "./escpos";
import { writeToPrinter } from "./printer-hub";
import { shouldAttemptEscpos, type ThermalPrintMode } from "./print-routing";
import { printKitchenTicketHtml } from "./kitchen-ticket-html";

export function isKitchenTicketOrder(order: Order): boolean {
  return order.type === "delivery" || order.type === "special_event";
}

export function buildKitchenTicketTextLines(
  order: Order,
  settings: BranchSettings
): string[] {
  const company = settings.name?.trim() || "OmniSales";
  const status = STATUS_AR[order.status] || order.status;
  const typeLabel =
    order.type === "delivery"
      ? "توصيل"
      : order.type === "special_event"
        ? "مناسبة"
        : "طلب";

  const lines: string[] = [
    `##${company}`,
    `##تذكرة مطبخ · ${typeLabel}`,
    "------------------------------",
    `طلب: ${order.order_number}`,
    `حالة: ${status}`,
    new Date(order.created_at).toLocaleString("ar-LY"),
  ];

  if (order.customer_name) lines.push(`عميل: ${order.customer_name}`);
  if (order.customer_phone) lines.push(`هاتف: ${order.customer_phone}`);
  if (order.delivery_address) lines.push(`عنوان: ${order.delivery_address}`);
  if (order.delivery_driver) lines.push(`سائق: ${order.delivery_driver}`);
  if (order.notes) lines.push(`ملاحظة: ${order.notes}`);

  lines.push("------------------------------");

  for (const item of order.items) {
    lines.push(`##${item.quantity}× ${item.name}`);
    if (item.note) lines.push(`  (${item.note})`);
  }

  lines.push("------------------------------");
  lines.push("OmniSales · مطبخ");
  return lines;
}

export async function printKitchenTicketSmart(
  order: Order,
  settings: BranchSettings,
  mode: ThermalPrintMode = "auto"
): Promise<"escpos" | "html"> {
  if (!isKitchenTicketOrder(order)) {
    throw new Error("تذكرة المطبخ متاحة لطلبات التوصيل والمناسبات فقط");
  }

  const forceEscpos = mode === "escpos";
  if (shouldAttemptEscpos(mode)) {
    try {
      const widthMm = settings.thermal_width_mm === 58 ? 58 : 80;
      const bytes = await buildEscPosReceiptBytes({
        lines: buildKitchenTicketTextLines(order, settings),
        widthMm,
        openDrawer: false,
      });
      await writeToPrinter(bytes);
      return "escpos";
    } catch (err) {
      if (forceEscpos) throw err;
    }
  }

  printKitchenTicketHtml(order, settings);
  return "html";
}
