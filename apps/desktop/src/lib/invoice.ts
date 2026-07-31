import { createElement } from "react";
import type { BranchSettings, Order } from "./types";
import { InvoicePDF } from "./pdf/InvoicePDF";
import { downloadPdf, openPdf } from "./pdf/pdfService";
import { printThermalReceiptSmart } from "./print/thermal";
import { printThermalReceiptHtml } from "./invoice-html";

/**
 * A4 Arabic invoice via @react-pdf/renderer + Tajawal
 */
export async function downloadInvoicePdf(
  order: Order,
  settings: BranchSettings
): Promise<void> {
  const company = settings.name?.trim() || "OmniSales";
  const doc = createElement(InvoicePDF, { order, settings });
  await downloadPdf(doc, `${company}-${order.order_number}`);
}

export async function openInvoicePdf(
  order: Order,
  settings: BranchSettings
): Promise<void> {
  const doc = createElement(InvoicePDF, { order, settings });
  await openPdf(doc);
}

/**
 * Thermal print — prefers ESC/POS Web Serial (Arabic raster), falls back to HTML.
 */
export async function printThermalReceipt(
  order: Order,
  settings: BranchSettings,
  changeDue = 0
): Promise<"escpos" | "html"> {
  return printThermalReceiptSmart(order, settings, changeDue, "auto");
}

/** Force browser HTML thermal (legacy / fallback). */
export function printThermalReceiptBrowser(
  order: Order,
  settings: BranchSettings,
  changeDue = 0
) {
  printThermalReceiptHtml(order, settings, changeDue);
}
