export type FieldType = "text" | "enum" | "number" | "date" | "boolean";

export interface FieldDef {
  id: string;
  label: string;
  type: FieldType;
  options?: { value: string; label: string }[];
  accessor?: (item: any) => unknown;
}

export interface FilterCondition {
  field: string;
  operator: string;
  value?: unknown;
}

export interface FilterValue {
  matchMode: "all" | "any";
  conditions: FilterCondition[];
}

export const EMPTY_FILTER: FilterValue = { matchMode: "all", conditions: [] };

export const OPERATORS_BY_TYPE: Record<FieldType, { value: string; label: string; needsValue: boolean }[]> = {
  text: [
    { value: "contains", label: "contains", needsValue: true },
    { value: "equals", label: "equals", needsValue: true },
    { value: "not_equals", label: "does not equal", needsValue: true },
    { value: "starts_with", label: "starts with", needsValue: true },
    { value: "is_empty", label: "is empty", needsValue: false },
    { value: "is_not_empty", label: "is not empty", needsValue: false },
  ],
  enum: [
    { value: "equals", label: "is", needsValue: true },
    { value: "not_equals", label: "is not", needsValue: true },
  ],
  number: [
    { value: "eq", label: "=", needsValue: true },
    { value: "neq", label: "≠", needsValue: true },
    { value: "gt", label: ">", needsValue: true },
    { value: "gte", label: "≥", needsValue: true },
    { value: "lt", label: "<", needsValue: true },
    { value: "lte", label: "≤", needsValue: true },
  ],
  date: [
    { value: "before", label: "before", needsValue: true },
    { value: "after", label: "after", needsValue: true },
    { value: "on", label: "on", needsValue: true },
  ],
  boolean: [
    { value: "is_true", label: "is true", needsValue: false },
    { value: "is_false", label: "is false", needsValue: false },
  ],
};

function getValue(item: any, field: FieldDef): unknown {
  if (field.accessor) return field.accessor(item);
  return item?.[field.id];
}

function toLowerStr(v: unknown): string {
  return v === null || v === undefined ? "" : String(v).toLowerCase();
}

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toDate(v: unknown): number | null {
  if (!v) return null;
  const t = new Date(v as any).getTime();
  return Number.isFinite(t) ? t : null;
}

function evalCondition(item: any, field: FieldDef, op: string, target: unknown): boolean {
  const raw = getValue(item, field);
  switch (field.type) {
    case "text": {
      const s = toLowerStr(raw);
      const t = toLowerStr(target);
      switch (op) {
        case "contains": return t === "" ? true : s.includes(t);
        case "equals": return s === t;
        case "not_equals": return s !== t;
        case "starts_with": return s.startsWith(t);
        case "is_empty": return s === "";
        case "is_not_empty": return s !== "";
      }
      return true;
    }
    case "enum": {
      const s = raw === null || raw === undefined ? "" : String(raw);
      const t = target === null || target === undefined ? "" : String(target);
      if (op === "equals") return s === t;
      if (op === "not_equals") return s !== t;
      return true;
    }
    case "number": {
      const a = toNum(raw);
      const b = toNum(target);
      if (a === null || b === null) return false;
      switch (op) {
        case "eq": return a === b;
        case "neq": return a !== b;
        case "gt": return a > b;
        case "gte": return a >= b;
        case "lt": return a < b;
        case "lte": return a <= b;
      }
      return true;
    }
    case "date": {
      const a = toDate(raw);
      const b = toDate(target);
      if (a === null || b === null) return false;
      const dayMs = 86400000;
      const aDay = Math.floor(a / dayMs);
      const bDay = Math.floor(b / dayMs);
      switch (op) {
        case "before": return aDay < bDay;
        case "after": return aDay > bDay;
        case "on": return aDay === bDay;
      }
      return true;
    }
    case "boolean": {
      const t = !!raw;
      if (op === "is_true") return t === true;
      if (op === "is_false") return t === false;
      return true;
    }
  }
}

export function evaluateFilters<T>(items: T[], fields: FieldDef[], filter: FilterValue): T[] {
  if (!filter.conditions.length) return items;
  const fieldMap = new Map(fields.map((f) => [f.id, f]));
  return items.filter((item) => {
    const results = filter.conditions.map((c) => {
      const f = fieldMap.get(c.field);
      if (!f) return true;
      return evalCondition(item, f, c.operator, c.value);
    });
    return filter.matchMode === "all" ? results.every(Boolean) : results.some(Boolean);
  });
}

export function filtersEqual(a: FilterValue, b: FilterValue): boolean {
  if (a.matchMode !== b.matchMode) return false;
  if (a.conditions.length !== b.conditions.length) return false;
  for (let i = 0; i < a.conditions.length; i++) {
    const x = a.conditions[i];
    const y = b.conditions[i];
    if (x.field !== y.field || x.operator !== y.operator) return false;
    const xv = x.value === undefined ? null : x.value;
    const yv = y.value === undefined ? null : y.value;
    if (JSON.stringify(xv) !== JSON.stringify(yv)) return false;
  }
  return true;
}
