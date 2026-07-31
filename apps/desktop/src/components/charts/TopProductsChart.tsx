import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TopProductRow } from "../../lib/analytics";
import { chartPalette } from "./chartTheme";

export function TopProductsChart({
  data,
  currency,
}: {
  data: TopProductRow[];
  currency: string;
}) {
  const c = chartPalette();
  if (!data.length) {
    return (
      <div className="grid h-64 place-items-center rounded-xl border border-dashed border-paper-line bg-paper/60 px-4 text-center text-xs text-ink-mute">
        لا توجد أصناف مبيعة في الفترة
      </div>
    );
  }

  const rows = data.map((r) => ({
    ...r,
    short: r.name.length > 18 ? `${r.name.slice(0, 18)}…` : r.name,
  }));

  return (
    <div className="h-64 w-full min-w-0" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ top: 8, right: 12, left: 8, bottom: 0 }}
        >
          <CartesianGrid stroke={c.line} strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: c.mute, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="short"
            width={110}
            tick={{ fill: c.ink, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: c.paper,
              border: `1px solid ${c.line}`,
              borderRadius: 12,
              fontSize: 12,
              direction: "rtl",
            }}
            formatter={(value, name) => [
              `${Number(value ?? 0).toFixed(2)} ${currency}`,
              name === "revenue" ? "الإيراد" : "الهامش",
            ]}
            labelFormatter={(_, payload) => {
              const row = payload?.[0]?.payload as TopProductRow | undefined;
              return row?.name ?? "";
            }}
          />
          <Bar dataKey="revenue" fill={c.highlight} radius={[0, 6, 6, 0]} name="revenue" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
