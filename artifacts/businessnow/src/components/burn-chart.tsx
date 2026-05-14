import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BurnChartDataPoint {
  date: string;
  plannedBudget: number;
  actualCost: number;
  invoicedAmount: number;
  plannedHours: number;
  actualHours: number;
  forecastCost: number;
  forecastHours: number;
}

interface BurnChartProps {
  data: {
    currency: string;
    series: BurnChartDataPoint[];
    todayLine: string;
  };
}

function fmtDate(date: string) {
  return new Date(date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function BurnChart({ data }: BurnChartProps) {
  const { series, todayLine, currency } = data;

  const lastPoint = series[series.length - 1];
  const finalPlanned = lastPoint?.plannedBudget ?? 0;
  const finalForecast = lastPoint?.forecastCost ?? 0;
  const overrun = finalForecast - finalPlanned;

  const fmtCurrency = (v: number) =>
    `${currency} ${v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Budget &amp; Hours Burn</CardTitle>
        {overrun > 0 && (
          <p className="text-sm text-destructive font-medium">
            Forecasted overrun: {fmtCurrency(overrun)} by project end
          </p>
        )}
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="budget">
          <TabsList className="mb-4">
            <TabsTrigger value="budget">Budget</TabsTrigger>
            <TabsTrigger value="hours">Hours</TabsTrigger>
          </TabsList>

          <TabsContent value="budget">
            <ResponsiveContainer width="100%" height={380}>
              <LineChart data={series} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tickFormatter={fmtDate}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                />
                <Tooltip
                  formatter={(value: number) => [fmtCurrency(value)]}
                  labelFormatter={fmtDate}
                  contentStyle={{ fontSize: 12 }}
                />
                <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
                <ReferenceLine
                  x={todayLine}
                  stroke="#94a3b8"
                  strokeDasharray="4 3"
                  label={{ value: "Today", position: "insideTopLeft", fontSize: 11, fill: "#94a3b8" }}
                />
                <Line
                  type="monotone"
                  dataKey="plannedBudget"
                  stroke="#818cf8"
                  strokeWidth={2}
                  dot={false}
                  name="Planned Budget"
                />
                <Line
                  type="monotone"
                  dataKey="actualCost"
                  stroke="#34d399"
                  strokeWidth={2}
                  dot={false}
                  name="Actual Cost"
                />
                <Line
                  type="monotone"
                  dataKey="invoicedAmount"
                  stroke="#fb923c"
                  strokeWidth={1.5}
                  dot={false}
                  name="Invoiced"
                />
                <Line
                  type="monotone"
                  dataKey="forecastCost"
                  stroke="#f87171"
                  strokeWidth={1.5}
                  strokeDasharray="5 4"
                  dot={false}
                  name="Forecast"
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="hours">
            <ResponsiveContainer width="100%" height={380}>
              <LineChart data={series} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tickFormatter={fmtDate}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v: number) => `${v}h`}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                />
                <Tooltip
                  formatter={(value: number) => [`${value}h`]}
                  labelFormatter={fmtDate}
                  contentStyle={{ fontSize: 12 }}
                />
                <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
                <ReferenceLine
                  x={todayLine}
                  stroke="#94a3b8"
                  strokeDasharray="4 3"
                  label={{ value: "Today", position: "insideTopLeft", fontSize: 11, fill: "#94a3b8" }}
                />
                <Line
                  type="monotone"
                  dataKey="plannedHours"
                  stroke="#818cf8"
                  strokeWidth={2}
                  dot={false}
                  name="Planned Hours"
                />
                <Line
                  type="monotone"
                  dataKey="actualHours"
                  stroke="#34d399"
                  strokeWidth={2}
                  dot={false}
                  name="Actual Hours"
                />
                <Line
                  type="monotone"
                  dataKey="forecastHours"
                  stroke="#f87171"
                  strokeWidth={1.5}
                  strokeDasharray="5 4"
                  dot={false}
                  name="Forecast"
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
