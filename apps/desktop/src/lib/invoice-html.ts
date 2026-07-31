import type { BranchSettings, Order } from "./types";
import { PAYMENT_AR } from "./pdf/pdfBrand";

/** Browser HTML thermal fallback (system print dialog). */
export function printThermalReceiptHtml(
  order: Order,
  settings: BranchSettings,
  changeDue = 0
) {
  const widthMm = settings.thermal_width_mm === 58 ? 58 : 80;
  const company = settings.name?.trim() || "OmniSales";
  const payment = PAYMENT_AR[order.payment_method] || order.payment_method;
  const rows = order.items
    .map(
      (l) => `
      <tr>
        <td class="name">${escapeHtml(l.name)}${
          l.imei ? `<div class="sub">IMEI ${escapeHtml(l.imei)}</div>` : ""
        }${
          l.serial ? `<div class="sub">S/N ${escapeHtml(l.serial)}</div>` : ""
        }</td>
        <td class="num">${l.quantity}×${l.unit_price.toFixed(2)}</td>
        <td class="num">${(l.quantity * l.unit_price).toFixed(2)}</td>
      </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(order.order_number)}</title>
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
  .muted { text-align: center; font-size: 10px; margin: 0 0 2px; color: #475569; }
  .meta { border-top: 1px dashed #94a3b8; border-bottom: 1px dashed #94a3b8; padding: 6px 0; margin: 8px 0; }
  .row { display: flex; justify-content: space-between; gap: 6px; margin: 2px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 3px 0; vertical-align: top; }
  td.name { text-align: right; padding-left: 4px; font-weight: 600; }
  td.num { text-align: left; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .sub { font-size: 9px; color: #64748b; font-weight: 600; }
  .total { font-weight: 800; font-size: 13px; border-top: 2px solid #0f172a; padding-top: 6px; margin-top: 6px; }
  .footer { text-align: center; margin-top: 10px; border-top: 1px dashed #94a3b8; padding-top: 6px; font-size: 10px; }
</style>
</head>
<body>
  <h1>${escapeHtml(company)}</h1>
  ${settings.address ? `<p class="muted">${escapeHtml(settings.address)}</p>` : ""}
  ${settings.phone ? `<p class="muted">${escapeHtml(settings.phone)}</p>` : ""}
  <div class="meta">
    <div class="row"><span>رقم الفاتورة</span><strong>${escapeHtml(order.order_number)}</strong></div>
    <div class="row"><span>التاريخ</span><span>${new Date(order.created_at).toLocaleString("ar-LY")}</span></div>
    <div class="row"><span>العميل</span><span>${escapeHtml(order.customer_name || "نقدي")}</span></div>
  </div>
  <table><tbody>${rows}</tbody></table>
  <div class="row"><span>الفرعي</span><span>${order.subtotal.toFixed(2)} ${escapeHtml(settings.currency_symbol)}</span></div>
  ${
    order.discount_amount > 0
      ? `<div class="row"><span>الخصم</span><span>-${order.discount_amount.toFixed(2)}</span></div>`
      : ""
  }
  ${
    order.tax_amount > 0
      ? `<div class="row"><span>الضريبة</span><span>${order.tax_amount.toFixed(2)}</span></div>`
      : ""
  }
  ${
    (order.delivery_fee || 0) > 0
      ? `<div class="row"><span>رسوم التوصيل</span><span>${Number(order.delivery_fee).toFixed(2)}</span></div>`
      : ""
  }
  <div class="row total"><span>الإجمالي</span><span>${order.total_amount.toFixed(2)} ${escapeHtml(settings.currency_symbol)}</span></div>
  <div class="row"><span>الدفع</span><span>${escapeHtml(payment)}</span></div>
  ${
    changeDue > 0
      ? `<div class="row"><span>الباقي</span><strong>${changeDue.toFixed(2)}</strong></div>`
      : ""
  }
  <div class="footer">${escapeHtml(settings.receipt_footer || "شكراً لتعاملكم معنا")}</div>
  <script>
    window.onload = () => setTimeout(() => { window.focus(); window.print(); }, 200);
    window.onafterprint = () => setTimeout(() => window.close(), 300);
  </script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=420,height=720");
  if (!win) throw new Error("تعذر فتح نافذة الطباعة — اسمح بالنوافذ المنبثقة");
  win.document.open();
  win.document.write(html);
  win.document.close();
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
