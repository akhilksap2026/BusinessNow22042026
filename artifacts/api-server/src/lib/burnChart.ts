export interface BurnChartDataPoint {
  date: string;
  plannedBudget: number;
  actualCost: number;
  invoicedAmount: number;
  plannedHours: number;
  actualHours: number;
  forecastCost: number;
  forecastHours: number;
}

export interface BurnChartResponse {
  currency: string;
  series: BurnChartDataPoint[];
  todayLine: string;
}

export function generateBurnChartSeries(
  projectStartDate: Date,
  projectDueDate: Date,
  totalBudget: number,
  totalBudgetedHours: number,
  actualData: Array<{
    date: string;
    cumulativeCost: number;
    cumulativeHours: number;
    cumulativeInvoiced: number;
  }>,
  granularity: 'week' | 'month' = 'week'
): BurnChartDataPoint[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const series: BurnChartDataPoint[] = [];

  const projectDurationDays = Math.max(
    1,
    Math.ceil((projectDueDate.getTime() - projectStartDate.getTime()) / 86400000)
  );

  const incrementDays = granularity === 'week' ? 7 : 30;
  const currentDate = new Date(projectStartDate);
  currentDate.setHours(0, 0, 0, 0);

  // Pre-sort actualData so binary searches work correctly.
  const sorted = [...actualData].sort((a, b) => a.date.localeCompare(b.date));

  // Latest actual snapshot with data at or before a given date.
  function latestActualAt(dateStr: string) {
    let result = { cumulativeCost: 0, cumulativeHours: 0, cumulativeInvoiced: 0 };
    for (const d of sorted) {
      if (d.date <= dateStr) result = d;
      else break;
    }
    return result;
  }

  // Most recent actual point with any cost logged (for burn-rate forecast).
  const latestWithData = [...sorted].reverse().find(d => d.cumulativeCost > 0 || d.cumulativeHours > 0);

  const todayStr = today.toISOString().split('T')[0];
  const latestActualToday = latestActualAt(todayStr);
  const daysElapsed = Math.max(
    1,
    Math.ceil((today.getTime() - projectStartDate.getTime()) / 86400000)
  );
  const costBurnPerDay = latestWithData
    ? latestActualToday.cumulativeCost / daysElapsed
    : 0;
  const hoursBurnPerDay = latestWithData
    ? latestActualToday.cumulativeHours / daysElapsed
    : 0;

  while (currentDate <= projectDueDate) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const daysFromStart = Math.max(
      0,
      Math.ceil((currentDate.getTime() - projectStartDate.getTime()) / 86400000)
    );

    const plannedBudget = totalBudget * (daysFromStart / projectDurationDays);
    const plannedHours = totalBudgetedHours * (daysFromStart / projectDurationDays);

    const actual = latestActualAt(dateStr);
    const isFuture = currentDate > today;

    let forecastCost = actual.cumulativeCost;
    let forecastHours = actual.cumulativeHours;

    if (isFuture && costBurnPerDay > 0) {
      const daysToForecast = Math.ceil(
        (currentDate.getTime() - today.getTime()) / 86400000
      );
      forecastCost = latestActualToday.cumulativeCost + costBurnPerDay * daysToForecast;
      forecastHours = latestActualToday.cumulativeHours + hoursBurnPerDay * daysToForecast;
    }

    series.push({
      date: dateStr,
      plannedBudget: Math.round(plannedBudget * 100) / 100,
      actualCost: Math.round(actual.cumulativeCost * 100) / 100,
      invoicedAmount: Math.round(actual.cumulativeInvoiced * 100) / 100,
      plannedHours: Math.round(plannedHours * 100) / 100,
      actualHours: Math.round(actual.cumulativeHours * 100) / 100,
      forecastCost: Math.round(forecastCost * 100) / 100,
      forecastHours: Math.round(forecastHours * 100) / 100,
    });

    currentDate.setDate(currentDate.getDate() + incrementDays);
  }

  return series;
}

/**
 * Merge raw per-day rows from time_entries (cost + hours) and invoices (invoiced)
 * into a cumulative timeline sorted by date.
 */
export function buildCumulativeActuals(
  timeSeries: Array<{ date: string; hours: number; cost: number }>,
  invoiceSeries: Array<{ date: string; invoiced: number }>
): Array<{ date: string; cumulativeCost: number; cumulativeHours: number; cumulativeInvoiced: number }> {
  // Collect all unique dates.
  const dateSet = new Set<string>();
  for (const r of timeSeries) dateSet.add(r.date);
  for (const r of invoiceSeries) dateSet.add(r.date);
  const dates = [...dateSet].sort();

  const timeByDate = new Map<string, { hours: number; cost: number }>();
  for (const r of timeSeries) timeByDate.set(r.date, r);

  const invoiceByDate = new Map<string, number>();
  for (const r of invoiceSeries) {
    invoiceByDate.set(r.date, (invoiceByDate.get(r.date) ?? 0) + r.invoiced);
  }

  let cumCost = 0;
  let cumHours = 0;
  let cumInvoiced = 0;
  const result: Array<{ date: string; cumulativeCost: number; cumulativeHours: number; cumulativeInvoiced: number }> = [];

  for (const date of dates) {
    const t = timeByDate.get(date);
    if (t) { cumCost += t.cost; cumHours += t.hours; }
    cumInvoiced += invoiceByDate.get(date) ?? 0;
    result.push({ date, cumulativeCost: cumCost, cumulativeHours: cumHours, cumulativeInvoiced: cumInvoiced });
  }

  return result;
}
