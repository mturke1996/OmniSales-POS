import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DayPoint } from "../../lib/analytics";
import { chartPalette } from "./chartTheme";

export function SalesTrendChart({
  data,
  currency,
}: {
  data: DayPoint[];
  currency: string;
}) {
  const c = chartPalette();
  if (!data.length) {
    return (
      <EmptyChart message="لا توجد مبيعات في هذه الفترة لرسم الاتجاه" />
    );
  }

  return (
    <div className="h-64 w-full min-w-0" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="netFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c.highlight} stopOpacity={0.35} />
              <stop offset="100%" stopColor={c.highlight} stopOpacity={0.02} />
            </linearGradient>
          </defs>
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
            width={48}
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
              name === "net" ? "صافي" : name === "gross" ? "إجمالي" : "مرتجعات",
            ]}
            labelFormatter={(label) => `اليوم ${label}`}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, direction: "rtl" }}
            formatter={(v) =>
              v === "net" ? "صافي" : v === "gross" ? "إجمالي" : "مرتجعات"
            }
          />
          <Area
            type="monotone"
            dataKey="gross"
            stroke={c.info}
            fill="transparent"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            name="gross"
          />
          <Area
            type="monotone"
            dataKey="returns"
            stroke={c.danger}
            fill="transparent"
            strokeWidth={1.5}
            name="returns"
          />
          <Area
            type="monotone"
            dataKey="net"
            stroke={c.highlight}
            fill="url(#netFill)"
            strokeWidth={2.5}
            name="net"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="grid h-64 place-items-center rounded-xl border border-dashed border-paper-line bg-paper/60 px-4 text-center text-xs text-ink-mute">
      {message}
    </div>
  );
}
