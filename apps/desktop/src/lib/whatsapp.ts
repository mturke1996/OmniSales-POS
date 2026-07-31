/**
 * WhatsApp deep-link helpers for Libya / MENA POS workflows.
 * Uses wa.me (works on web, desktop, and mobile) — no Business API required.
 */

/** Normalize local numbers (09x / 91x / +218) to E.164 digits without +. */
export function toWhatsAppE164(phone: string, defaultCountry = "218"): string | null {
  const digits = phone.replace(/[^\d+]/g, "").trim();
  if (!digits) return null;

  let n = digits.startsWith("+") ? digits.slice(1) : digits;

  // 00218… → 218…
  if (n.startsWith("00")) n = n.slice(2);

  // Local Libyan mobile: 09xxxxxxxx or 91/92/93/94/95…
  if (n.startsWith("0") && n.length >= 9) {
    n = defaultCountry + n.slice(1);
  } else if (/^9[1-5]\d{7,8}$/.test(n)) {
    n = defaultCountry + n;
  }

  // Must look like an international mobile (8–15 digits)
  if (!/^\d{8,15}$/.test(n)) return null;
  return n;
}

export function buildWhatsAppUrl(phone: string, message?: string): string | null {
  const e164 = toWhatsAppE164(phone);
  if (!e164) return null;
  const base = `https://wa.me/${e164}`;
  if (!message?.trim()) return base;
  return `${base}?text=${encodeURIComponent(message.trim())}`;
}

export function openWhatsApp(phone: string, message?: string): boolean {
  const url = buildWhatsAppUrl(phone, message);
  if (!url) return false;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}

export function debtReminderMessage(
  customerName: string,
  balance: number,
  symbol: string,
  branchName: string
): string {
  return (
    `السلام عليكم ${customerName}،\n` +
    `تذكير ودي من *${branchName}*\n` +
    `رصيد حسابكم المستحق: *${balance.toFixed(2)} ${symbol}*\n` +
    `نرجو التنسيق للسداد في أقرب وقت. شكراً لتعاونكم.`
  );
}

export function saleShareMessage(
  orderNumber: string,
  total: number,
  symbol: string,
  branchName: string,
  customerName?: string
): string {
  const who = customerName ? `عزيزي/تي ${customerName}` : "عميلنا العزيز";
  return (
    `${who}،\n` +
    `فاتورتكم من *${branchName}*\n` +
    `رقم الفاتورة: ${orderNumber}\n` +
    `الإجمالي: *${total.toFixed(2)} ${symbol}*\n` +
    `شكراً لتعاملكم معنا.`
  );
}

export function paymentReceiptMessage(
  customerName: string,
  amount: number,
  remaining: number,
  symbol: string,
  branchName: string
): string {
  return (
    `تم استلام دفعة من ${customerName}\n` +
    `المبلغ: *${amount.toFixed(2)} ${symbol}*\n` +
    `المتبقي: *${remaining.toFixed(2)} ${symbol}*\n` +
    `— ${branchName}`
  );
}

export function buildDailyOwnerSummary(input: {
  branchName: string;
  sales: number;
  expenses: number;
  debts: number;
  symbol: string;
  deliveryOpen: number;
}): string {
  const net = input.sales - input.expenses;
  const date = new Date().toLocaleDateString("ar-LY", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return (
    `📊 *ملخص يومي — ${input.branchName}*\n` +
    `${date}\n\n` +
    `المبيعات المكتملة: *${input.sales.toFixed(2)} ${input.symbol}*\n` +
    `المصروفات: *${input.expenses.toFixed(2)} ${input.symbol}*\n` +
    `صافي اليوم: *${net.toFixed(2)} ${input.symbol}*\n` +
    `ديون العملاء: *${input.debts.toFixed(2)} ${input.symbol}*\n` +
    `طلبات توصيل مفتوحة: *${input.deliveryOpen}*\n\n` +
    `— OmniSales`
  );
}
