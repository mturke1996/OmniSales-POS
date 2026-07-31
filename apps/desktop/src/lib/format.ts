export function formatMoney(value: number, symbol = "د.ل") {
  const n = Number.isFinite(value) ? value : 0;
  return `${n.toLocaleString("ar-LY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${symbol}`;
}
