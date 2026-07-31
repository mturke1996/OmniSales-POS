import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PaymentMixRow } from "../../lib/analytics";
import { chartPalette } from "./chartTheme";

export function PaymentMixChart({
  data,
  currency,
}: {
  data: PaymentMixRow[];
  currency: string;
}) {
  const c = chartPalette();
  if (!data.length) {
    return (
      <div className="grid h-56 place-items-center rounded-xl border border-dashed border-paper-line bg-paper/60 px-4 text-center text-xs text-ink-mute">
        لا توزيع دفع لهذه الفترة
      </div>
    );
  }

  const colors = [c.highlight, c.success, c.warning, c.info, c.danger];

  return (
    <div className="h-56 w-full min-w-0" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={c.line} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: c.mute, fontSize: 11 }}
            axisLine={{ stroke: c.line }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: c.mute, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip
            contentStyle={{
              background: c.paper,
              border: `1px solid ${c.line}`,
              borderRadius: 12,
              fontSize: 12,
              direction: "rtl",
            }}
            formatter={(value, _n, item) => {
              const row = item?.payload as PaymentMixRow | undefined;
              return [
                `${Number(value ?? 0).toFixed(2)} ${currency}`,
                row ? `${row.label} · ${row.count} فاتورة` : "المبلغ",
              ];
            }}
          />
          <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={entry.method} fill={colors[i % colors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
