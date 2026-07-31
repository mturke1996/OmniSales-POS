import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { BranchSettings, Order } from "../types";
import { ar, arDateTime, arMixed, ltr } from "./arabicPDF";
import { PDF_FONT_FAMILY } from "./pdfFonts";
import { PAYMENT_AR, PDF_INK, PDF_PAGINATION, STATUS_AR } from "./pdfBrand";
import { PdfMoneyText } from "./PdfMoneyText";

const s = StyleSheet.create({
  page: {
    fontFamily: PDF_FONT_FAMILY,
    fontSize: 9,
    color: PDF_INK.text,
    backgroundColor: PDF_INK.white,
    paddingTop: 20,
    paddingBottom: PDF_PAGINATION.footerReserve,
    paddingHorizontal: 36,
  },
  accentWrap: {
    marginHorizontal: -36,
    marginTop: -20,
    marginBottom: 14,
  },
  accentBar: { height: 3, backgroundColor: PDF_INK.brand },
  accentHair: {
    height: 0.75,
    backgroundColor: PDF_INK.brandDeep,
    marginTop: 1,
    opacity: 0.85,
  },
  headerRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 12,
  },
  brandBlock: {
    flex: 1,
    alignItems: "flex-end",
    maxWidth: "58%",
    borderRightWidth: 1.5,
    borderRightColor: PDF_INK.brandLine,
    paddingRight: 10,
  },
  company: {
    fontSize: 15,
    fontWeight: 700,
    fontFamily: PDF_FONT_FAMILY,
    color: PDF_INK.text,
    textAlign: "right",
    marginBottom: 2,
  },
  contact: {
    fontSize: 8,
    fontFamily: PDF_FONT_FAMILY,
    color: PDF_INK.muted,
    textAlign: "right",
    marginBottom: 1.5,
  },
  titleAr: {
    fontSize: 10,
    fontWeight: 700,
    fontFamily: PDF_FONT_FAMILY,
    color: PDF_INK.brandDeep,
    textAlign: "right",
    marginTop: 5,
  },
  metaCol: { alignItems: "flex-start", maxWidth: "40%" },
  ghostEn: {
    fontSize: 22,
    fontWeight: 700,
    fontFamily: PDF_FONT_FAMILY,
    color: "#c7d2fe",
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  badge: {
    backgroundColor: PDF_INK.pale,
    borderWidth: 1,
    borderColor: PDF_INK.brandLine,
    borderRadius: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 6,
  },
  badgeText: {
    fontSize: 7.5,
    fontWeight: 700,
    fontFamily: PDF_FONT_FAMILY,
    color: PDF_INK.brandDeep,
  },
  refLine: {
    fontSize: 12,
    fontWeight: 700,
    fontFamily: PDF_FONT_FAMILY,
    color: PDF_INK.text,
    marginBottom: 3,
  },
  statusText: {
    fontSize: 8.5,
    fontWeight: 700,
    fontFamily: PDF_FONT_FAMILY,
  },
  metaBand: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 0,
    marginTop: 10,
    marginBottom: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: PDF_INK.line,
    backgroundColor: PDF_INK.wash,
  },
  metaCell: {
    flexGrow: 1,
    minWidth: "22%",
    paddingVertical: 7,
    paddingHorizontal: 8,
    alignItems: "flex-end",
    borderLeftWidth: 1,
    borderLeftColor: PDF_INK.line,
  },
  metaLbl: {
    fontSize: 7,
    color: PDF_INK.muted,
    fontFamily: PDF_FONT_FAMILY,
    textAlign: "right",
    marginBottom: 2,
  },
  metaVal: {
    fontSize: 8.5,
    fontWeight: 700,
    fontFamily: PDF_FONT_FAMILY,
    color: PDF_INK.text,
    textAlign: "right",
  },
  clientBox: {
    backgroundColor: PDF_INK.pale,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: PDF_INK.brandLine,
    borderRightWidth: 3.5,
    borderRightColor: PDF_INK.brand,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 14,
    alignItems: "flex-end",
  },
  clientLbl: {
    fontSize: 7.5,
    color: PDF_INK.muted,
    fontFamily: PDF_FONT_FAMILY,
    textAlign: "right",
    marginBottom: 2,
  },
  clientName: {
    fontSize: 12.5,
    fontWeight: 700,
    fontFamily: PDF_FONT_FAMILY,
    textAlign: "right",
    color: PDF_INK.text,
  },
  clientSub: {
    fontSize: 8,
    fontFamily: PDF_FONT_FAMILY,
    color: PDF_INK.muted,
    textAlign: "right",
    marginTop: 2,
  },
  tableHead: {
    flexDirection: "row",
    backgroundColor: PDF_INK.pale,
    borderBottomWidth: 2,
    borderBottomColor: PDF_INK.brand,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: PDF_INK.line,
    paddingVertical: 7,
    paddingHorizontal: 6,
  },
  tableRowAlt: {
    backgroundColor: PDF_INK.wash,
  },
  th: {
    fontSize: 8,
    fontWeight: 700,
    fontFamily: PDF_FONT_FAMILY,
    color: PDF_INK.brandDeep,
  },
  td: {
    fontSize: 8.5,
    fontFamily: PDF_FONT_FAMILY,
    color: PDF_INK.text,
  },
  totalsCard: {
    width: 248,
    alignSelf: "flex-start",
    marginTop: 14,
    borderWidth: 1,
    borderColor: PDF_INK.line,
    overflow: "hidden",
  },
  totalRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  totalLabel: {
    fontSize: 9,
    fontFamily: PDF_FONT_FAMILY,
    color: PDF_INK.muted,
    textAlign: "right",
  },
  grandRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: PDF_INK.pale,
    borderTopWidth: 2,
    borderTopColor: PDF_INK.brand,
  },
  grandLabel: {
    fontSize: 12,
    fontWeight: 700,
    fontFamily: PDF_FONT_FAMILY,
    color: PDF_INK.brandDeep,
    textAlign: "right",
  },
  paidRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: PDF_INK.line,
    backgroundColor: PDF_INK.wash,
  },
  notesBox: {
    marginTop: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: PDF_INK.line,
    borderRightWidth: 3,
    borderRightColor: PDF_INK.brand,
    backgroundColor: PDF_INK.wash,
    alignItems: "flex-end",
  },
  notesTitle: {
    fontSize: 8,
    fontWeight: 700,
    fontFamily: PDF_FONT_FAMILY,
    color: PDF_INK.brandDeep,
    marginBottom: 3,
    textAlign: "right",
  },
  notesBody: {
    fontSize: 8.5,
    fontFamily: PDF_FONT_FAMILY,
    color: PDF_INK.soft,
    textAlign: "right",
    lineHeight: 1.45,
  },
  closeRow: {
    marginTop: 22,
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  stampCol: {
    flex: 1,
    alignItems: "flex-end",
    marginLeft: 16,
  },
  stampLabel: {
    fontSize: 9,
    fontWeight: 700,
    fontFamily: PDF_FONT_FAMILY,
    color: PDF_INK.muted,
    marginBottom: 28,
    textAlign: "right",
  },
  stampLine: {
    width: "100%",
    borderTopWidth: 1,
    borderTopColor: PDF_INK.brandLine,
    paddingTop: 4,
  },
  stampHint: {
    fontSize: 7.5,
    fontFamily: PDF_FONT_FAMILY,
    color: PDF_INK.faint,
    textAlign: "right",
  },
  verifyBox: {
    alignItems: "center",
    minWidth: 88,
  },
  verifyMark: {
    width: 64,
    height: 64,
    borderWidth: 1.5,
    borderColor: PDF_INK.brandLine,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  verifyCode: {
    fontSize: 7,
    fontFamily: PDF_FONT_FAMILY,
    color: PDF_INK.faint,
    textAlign: "center",
  },
  verifyLbl: {
    fontSize: 7.5,
    fontFamily: PDF_FONT_FAMILY,
    color: PDF_INK.muted,
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    left: 36,
    right: 36,
    bottom: 18,
  },
  footerRule: {
    height: 1.5,
    backgroundColor: PDF_INK.brand,
    marginBottom: 1,
  },
  footerHair: {
    height: 0.6,
    backgroundColor: PDF_INK.brandDeep,
    marginBottom: 7,
    opacity: 0.7,
  },
  footerBrand: {
    fontSize: 8.5,
    fontWeight: 700,
    fontFamily: PDF_FONT_FAMILY,
    color: PDF_INK.text,
    textAlign: "center",
    marginBottom: 2,
  },
  footerNote: {
    fontSize: 7.5,
    fontFamily: PDF_FONT_FAMILY,
    color: PDF_INK.muted,
    textAlign: "center",
  },
  pageNum: {
    fontSize: 7,
    fontFamily: PDF_FONT_FAMILY,
    color: PDF_INK.faint,
    textAlign: "center",
    marginTop: 3,
  },
});

/** Visual order: money left → name right (Valentino reverse columns). */
const COLS = [
  { key: "total", label: "الإجمالي", flex: 1.15, align: "left" as const },
  { key: "price", label: "السعر", flex: 1, align: "left" as const },
  { key: "qty", label: "الكمية", flex: 0.7, align: "center" as const },
  { key: "name", label: "الصنف", flex: 2.35, align: "right" as const },
  { key: "i", label: "#", flex: 0.4, align: "center" as const },
];

export function InvoicePDF({
  order,
  settings,
}: {
  order: Order;
  settings: BranchSettings;
}) {
  const company = settings.name?.trim() || "OmniSales";
  const currency = settings.currency_symbol || "د.ل";
  const payment = PAYMENT_AR[order.payment_method] || order.payment_method;
  const status = STATUS_AR[order.status] || order.status;
  const statusColor =
    order.status === "cancelled"
      ? PDF_INK.danger
      : order.status === "completed"
        ? PDF_INK.success
        : PDF_INK.brandDeep;
  const verifyCode = order.id.replace(/-/g, "").slice(0, 10).toUpperCase();
  const paid =
    order.payment_method === "debt" ? 0 : order.total_amount;
  const balance = Math.max(0, order.total_amount - paid);

  return (
    <Document
      title={`فاتورة ${order.order_number}`}
      author={company}
      subject="OmniSales Official Invoice"
      language="ar"
    >
      <Page size="A4" style={s.page}>
        <View style={s.accentWrap}>
          <View style={s.accentBar} />
          <View style={s.accentHair} />
        </View>

        <View style={s.headerRow} wrap={false}>
          <View style={s.brandBlock}>
            <Text style={s.company}>{arMixed(company)}</Text>
            {settings.phone?.trim() ? (
              <Text style={s.contact}>{ltr(settings.phone)}</Text>
            ) : null}
            {settings.address?.trim() ? (
              <Text style={s.contact}>{arMixed(settings.address)}</Text>
            ) : null}
            <Text style={s.titleAr}>{ar("فاتورة مبيعات رسمية")}</Text>
          </View>
          <View style={s.metaCol}>
            <Text style={s.ghostEn}>{ltr("INVOICE")}</Text>
            <View style={s.badge}>
              <Text style={s.badgeText}>{ltr("OFFICIAL")}</Text>
            </View>
            <Text style={s.refLine}>{ltr(`#${order.order_number}`)}</Text>
            <Text style={[s.statusText, { color: statusColor }]}>
              {ar(status)}
            </Text>
          </View>
        </View>

        <View style={s.metaBand} wrap={false}>
          <MetaCell label="التاريخ" value={arDateTime(order.created_at)} ltrVal />
          <MetaCell label="طريقة الدفع" value={payment} />
          <MetaCell label="العملة" value={currency} ltrVal />
          <MetaCell label="الحالة" value={status} color={statusColor} />
        </View>

        <View style={s.clientBox} wrap={false}>
          <Text style={s.clientLbl}>{ar("إلى السيد / السادة")}</Text>
          <Text style={s.clientName}>
            {ar(order.customer_name || "عميل نقدي")}
          </Text>
          {order.customer_phone ? (
            <Text style={s.clientSub}>{ltr(order.customer_phone)}</Text>
          ) : null}
          {order.delivery_address ? (
            <Text style={s.clientSub}>{arMixed(order.delivery_address)}</Text>
          ) : null}
        </View>

        <View style={s.tableHead} wrap={false} minPresenceAhead={PDF_PAGINATION.tableHead}>
          {COLS.map((c) => (
            <View key={c.key} style={{ flex: c.flex, paddingHorizontal: 2 }}>
              <Text style={[s.th, { textAlign: c.align }]}>{ar(c.label)}</Text>
            </View>
          ))}
        </View>

        {order.items.map((item, idx) => (
          <View
            key={`${item.product_id}-${idx}`}
            style={[s.tableRow, idx % 2 === 1 ? s.tableRowAlt : {}]}
            wrap={false}
          >
            <View style={{ flex: COLS[0].flex, paddingHorizontal: 2 }}>
              <PdfMoneyText
                amount={item.quantity * item.unit_price}
                currency={currency}
                size={8.5}
              />
            </View>
            <View style={{ flex: COLS[1].flex, paddingHorizontal: 2 }}>
              <PdfMoneyText
                amount={item.unit_price}
                currency={currency}
                size={8.5}
                bold={false}
              />
            </View>
            <View style={{ flex: COLS[2].flex, paddingHorizontal: 2 }}>
              <Text style={[s.td, { textAlign: "center", fontWeight: 700 }]}>
                {ltr(String(item.quantity))}
              </Text>
            </View>
            <View style={{ flex: COLS[3].flex, paddingHorizontal: 2 }}>
              <Text style={[s.td, { textAlign: "right", fontWeight: 700 }]}>
                {ar(item.name)}
              </Text>
              {item.note ? (
                <Text
                  style={[
                    s.td,
                    { textAlign: "right", fontSize: 7.5, color: PDF_INK.muted },
                  ]}
                >
                  {ar(item.note)}
                </Text>
              ) : null}
            </View>
            <View style={{ flex: COLS[4].flex, paddingHorizontal: 2 }}>
              <Text style={[s.td, { textAlign: "center", color: PDF_INK.muted }]}>
                {ltr(String(idx + 1))}
              </Text>
            </View>
          </View>
        ))}

        <View style={s.totalsCard} wrap={false} minPresenceAhead={PDF_PAGINATION.totalBar}>
          <View style={s.totalRow}>
            <PdfMoneyText amount={order.subtotal} currency={currency} />
            <Text style={s.totalLabel}>{ar("المجموع الفرعي")}</Text>
          </View>
          {order.discount_amount > 0 ? (
            <View style={s.totalRow}>
              <PdfMoneyText
                amount={-order.discount_amount}
                currency={currency}
                color={PDF_INK.danger}
              />
              <Text style={s.totalLabel}>{ar("الخصم")}</Text>
            </View>
          ) : null}
          {order.tax_amount > 0 ? (
            <View style={s.totalRow}>
              <PdfMoneyText amount={order.tax_amount} currency={currency} />
              <Text style={s.totalLabel}>{ar("الضريبة")}</Text>
            </View>
          ) : null}
          <View style={s.grandRow}>
            <PdfMoneyText
              amount={order.total_amount}
              currency={currency}
              size={12}
              color={PDF_INK.brandDeep}
            />
            <Text style={s.grandLabel}>{ar("الإجمالي")}</Text>
          </View>
          <View style={s.paidRow}>
            <PdfMoneyText amount={paid} currency={currency} size={9} />
            <Text style={s.totalLabel}>{ar("المدفوع")}</Text>
          </View>
          {balance > 0 ? (
            <View style={s.paidRow}>
              <PdfMoneyText
                amount={balance}
                currency={currency}
                size={9}
                color={PDF_INK.warning}
              />
              <Text style={s.totalLabel}>{ar("المتبقي")}</Text>
            </View>
          ) : null}
        </View>

        {order.notes?.trim() ? (
          <View style={s.notesBox} wrap={false}>
            <Text style={s.notesTitle}>{ar("ملاحظات")}</Text>
            <Text style={s.notesBody}>{ar(order.notes)}</Text>
          </View>
        ) : null}

        <View style={s.closeRow} wrap={false}>
          <View style={{ flexDirection: "row-reverse", width: "58%" }}>
            {["البائع", "المستلم"].map((label) => (
              <View key={label} style={s.stampCol}>
                <Text style={s.stampLabel}>{ar(label)}</Text>
                <View style={s.stampLine}>
                  <Text style={s.stampHint}>{ar("الاسم والتوقيع")}</Text>
                </View>
              </View>
            ))}
          </View>
          <View style={s.verifyBox}>
            <View style={s.verifyMark}>
              <Text
                style={{
                  fontSize: 8,
                  fontWeight: 700,
                  fontFamily: PDF_FONT_FAMILY,
                  color: PDF_INK.brandDeep,
                }}
              >
                {ltr("OS")}
              </Text>
              <Text style={s.verifyCode}>{ltr(verifyCode)}</Text>
            </View>
            <Text style={s.verifyLbl}>{ar("رمز التحقق")}</Text>
          </View>
        </View>

        <View style={s.footer} fixed>
          <View style={s.footerRule} />
          <View style={s.footerHair} />
          <Text style={s.footerBrand}>{arMixed(company)}</Text>
          <Text style={s.footerNote}>
            {ar(
              settings.receipt_footer ||
                "وثيقة رسمية — يُعتد بالنسخ المطبوعة الموثّقة فقط"
            )}
          </Text>
          <Text
            style={s.pageNum}
            render={({ pageNumber, totalPages }) =>
              ar(`صفحة ${pageNumber} من ${totalPages}`)
            }
          />
        </View>
      </Page>
    </Document>
  );
}

function MetaCell({
  label,
  value,
  ltrVal,
  color,
}: {
  label: string;
  value: string;
  ltrVal?: boolean;
  color?: string;
}) {
  return (
    <View style={s.metaCell}>
      <Text style={s.metaLbl}>{ar(label)}</Text>
      <Text style={[s.metaVal, color ? { color } : {}]}>
        {ltrVal ? ltr(value) : ar(value)}
      </Text>
    </View>
  );
}
