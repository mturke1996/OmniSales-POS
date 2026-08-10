import type { BranchSettings, Order } from "../types";
import { STATUS_AR } from "../pdf/pdfBrand";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function printKitchenTicketHtml(order: Order, settings: BranchSettings) {
  const widthMm = settings.thermal_width_mm === 58 ? 58 : 80;
  const company = settings.name?.trim() || "OmniSales";
  const status = STATUS_AR[order.status] || order.status;
  const typeLabel =
    order.type === "delivery"
      ? "توصيل"
      : order.type === "special_event"
        ? "مناسبة"
        : "طلب";

  const rows = order.items
    .map(
      (item) => `
      <tr>
        <td class="qty">${item.quantity}×</td>
        <td class="name">${escapeHtml(item.name)}${
          item.note ? `<div class="sub">${escapeHtml(item.note)}</div>` : ""
        }</td>
      </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<title>مطبخ ${escapeHtml(order.order_number)}</title>
<style>
  @page { size: ${widthMm}mm auto; margin: 2mm; }
  body {
    font-family: "Tajawal", "Cairo", Tahoma, sans-serif;
    font-size: ${widthMm === 58 ? 11 : 12}px;
    width: ${widthMm - 4}mm;
    margin: 0 auto;
    padding: 2mm 0;
  }
  h1 { font-size: 16px; margin: 0; text-align: center; }
  .tag { text-align: center; font-weight: 800; color: #c2410c; margin: 4px 0 8px; }
  .meta { border-top: 2px dashed #000; border-bottom: 2px dashed #000; padding: 6px 0; margin: 8px 0; font-size: 11px; }
  .row { display: flex; justify-content: space-between; gap: 6px; margin: 2px 0; }
  table { width: 100%; border-collapse: collapse; }
  td.qty { width: 2.5em; font-size: 18px; font-weight: 900; vertical-align: top; }
  td.name { font-weight: 700; font-size: 13px; }
  .sub { font-size: 10px; color: #64748b; font-weight: 600; }
  .foot { text-align: center; margin-top: 10px; font-size: 10px; }
</style>
</head>
<body>
  <h1>${escapeHtml(company)}</h1>
  <p class="tag">تذكرة مطبخ · ${escapeHtml(typeLabel)}</p>
  <div class="meta">
    <div class="row"><span>الطلب</span><strong>${escapeHtml(order.order_number)}</strong></div>
    <div class="row"><span>الحالة</span><strong>${escapeHtml(status)}</strong></div>
    <div class="row"><span>الوقت</span><span>${new Date(order.created_at).toLocaleString("ar-LY")}</span></div>
    ${order.customer_name ? `<div class="row"><span>العميل</span><span>${escapeHtml(order.customer_name)}</span></div>` : ""}
    ${order.customer_phone ? `<div class="row"><span>هاتف</span><span>${escapeHtml(order.customer_phone)}</span></div>` : ""}
    ${order.delivery_address ? `<div class="row"><span>العنوان</span><span>${escapeHtml(order.delivery_address)}</span></div>` : ""}
    ${order.delivery_driver ? `<div class="row"><span>السائق</span><span>${escapeHtml(order.delivery_driver)}</span></div>` : ""}
    ${order.notes ? `<div class="row"><span>ملاحظة</span><span>${escapeHtml(order.notes)}</span></div>` : ""}
  </div>
  <table><tbody>${rows}</tbody></table>
  <p class="foot">${escapeHtml(settings.name)} · OmniSales</p>
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
