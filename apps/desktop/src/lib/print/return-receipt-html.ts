import type { BranchSettings, Order, ReturnRecord } from "../types";
import { openHtmlDocument } from "./open-print";

const REFUND_AR: Record<string, string> = {
  cash: "نقداً",
  card: "بطاقة",
  credit: "رصيد عميل",
};

/** Browser HTML thermal fallback for return slips. */
export function printReturnReceiptHtml(
  record: ReturnRecord,
  order: Order,
  settings: BranchSettings
) {
  const widthMm = settings.thermal_width_mm === 58 ? 58 : 80;
  const company = settings.name?.trim() || "OmniSales";
  const sym = escapeHtml(settings.currency_symbol);
  const method = REFUND_AR[record.refund_method] || record.refund_method;

  const rows = record.items
    .map(
      (item) => `
      <tr>
        <td class="name">${escapeHtml(item.name)}</td>
        <td class="num">${item.quantity}×${item.unit_refund.toFixed(2)}</td>
        <td class="num">${(item.quantity * item.unit_refund).toFixed(2)}</td>
      </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(record.return_number)}</title>
<style>
  @page { size: ${widthMm}mm auto; margin: 2mm; }
  * { box-sizing: border-box; }
  body {
    font-family: "Tajawal", "Cairo", "Segoe UI", Tahoma, sans-serif;
    font-size: ${widthMm === 58 ? 10 : 11}px;
    color: #0f172a;
    width: ${widthMm - 4}mm;
    margin: 0 auto;
    padding: 2mm 0 3mm;
  }
  h1 { font-size: ${widthMm === 58 ? 13 : 15}px; margin: 0 0 3px; text-align: center; font-weight: 800; }
  .tag { text-align: center; font-size: 11px; font-weight: 700; color: #b45309; margin: 0 0 4px; }
  .muted { text-align: center; font-size: 10px; margin: 0 0 2px; color: #475569; }
  .meta { border-top: 1px dashed #94a3b8; border-bottom: 1px dashed #94a3b8; padding: 6px 0; margin: 8px 0; }
  .row { display: flex; justify-content: space-between; gap: 6px; margin: 2px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 3px 0; vertical-align: top; }
  td.name { text-align: right; padding-left: 4px; font-weight: 600; }
  td.num { text-align: left; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .total { font-weight: 800; font-size: 13px; border-top: 2px solid #0f172a; padding-top: 6px; margin-top: 6px; }
  .footer { text-align: center; margin-top: 10px; border-top: 1px dashed #94a3b8; padding-top: 6px; font-size: 10px; }
</style>
</head>
<body>
  <h1>${escapeHtml(company)}</h1>
  <p class="tag">إيصال مرتجع</p>
  <div class="meta">
    <div class="row"><span>رقم المرتجع</span><strong>${escapeHtml(record.return_number)}</strong></div>
    <div class="row"><span>الفاتورة الأصلية</span><span>${escapeHtml(record.order_number)}</span></div>
    <div class="row"><span>التاريخ</span><span>${new Date(record.created_at).toLocaleString("ar-LY")}</span></div>
    <div class="row"><span>العميل</span><span>${escapeHtml(record.customer_name || order.customer_name || "نقدي")}</span></div>
    <div class="row"><span>الاسترداد</span><span>${escapeHtml(method)}</span></div>
  </div>
  <table><tbody>${rows}</tbody></table>
  <div class="row total"><span>إجمالي الاسترداد</span><span>${record.total_refund.toFixed(2)} ${sym}</span></div>
  ${record.notes ? `<div class="row"><span>ملاحظة</span><span>${escapeHtml(record.notes)}</span></div>` : ""}
  <div class="footer">${escapeHtml(settings.receipt_footer || "شكراً لتعاملكم معنا")}</div>
  <script>
    window.onload = () => setTimeout(() => { window.focus(); window.print(); }, 200);
    window.onafterprint = () => setTimeout(() => window.close(), 300);
  </script>
</body>
</html>`;

  openHtmlDocument(html, `مرتجع ${record.return_number}`);
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
