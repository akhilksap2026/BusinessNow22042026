export function formatCurrency(
  value: number,
  options: { compact?: boolean; currency?: string } = {}
): string {
  const { compact = false, currency = "USD" } = options;
  if (compact) {
    if (Math.abs(value) >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
    if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
    if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(
  value: Date | string | null | undefined,
  variant: "short" | "long" | "relative" = "short"
): string {
  if (value === null || value === undefined) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (isNaN(date.getTime())) return "—";
  if (variant === "relative") {
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
  }
  if (variant === "long") {
    return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function abbreviate(value: number): string {
  if (Math.abs(value) >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(value);
}

export function formatDuration(minutes: number): string {
  if (minutes === 0) return "0h";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function nullCell(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}
