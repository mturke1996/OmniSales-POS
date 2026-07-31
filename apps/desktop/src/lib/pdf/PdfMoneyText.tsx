import { Text, View } from "@react-pdf/renderer";
import { PDF_FONT_FAMILY } from "./pdfFonts";
import { PDF_INK } from "./pdfBrand";
import { ar, ltr } from "./arabicPDF";

/** Separate number + currency nodes (Valentino / rkeaz) — avoids BiDi digit flip. */
export function PdfMoneyText({
  amount,
  currency,
  size = 9.5,
  color = PDF_INK.text,
  bold = true,
}: {
  amount: number;
  currency: string;
  size?: number;
  color?: string;
  bold?: boolean;
}) {
  const sign = amount < 0 ? "-" : "";
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(Number.isFinite(amount) ? amount : 0));

  return (
    <View
      wrap={false}
      style={{
        flexDirection: "row-reverse",
        alignItems: "baseline",
        justifyContent: "flex-start",
      }}
    >
      <Text
        style={{
          fontSize: size,
          fontWeight: bold ? 700 : 400,
          color,
          fontFamily: PDF_FONT_FAMILY,
        }}
      >
        {ltr(`${sign}${formatted}`)}
      </Text>
      <Text
        style={{
          fontSize: Math.max(7.5, size - 1),
          fontWeight: 700,
          color: PDF_INK.muted,
          fontFamily: PDF_FONT_FAMILY,
          marginRight: 3,
        }}
      >
        {ar(currency)}
      </Text>
    </View>
  );
}
