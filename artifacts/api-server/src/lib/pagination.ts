/**
 * Sprint 2 / Phase 6 — Standard pagination envelope for large list endpoints.
 *
 * Backwards-compatible: pagination is OPT-IN. If neither `?limit` nor
 * `?offset` is present in the query string, the endpoint returns a plain
 * array (current behaviour). When either is provided, the endpoint returns
 *   { data: T[], total: number, limit: number, offset: number }
 *
 * Defaults: limit=100, offset=0. Cap: 500 (anything larger is clamped).
 */

export const DEFAULT_LIMIT = 100;
export const MAX_LIMIT = 500;

export interface PageParams {
  limit: number;
  offset: number;
  paginated: boolean;
}

export function parsePagination(query: Record<string, unknown>): PageParams {
  const hasLimit = query.limit !== undefined;
  const hasOffset = query.offset !== undefined;
  const paginated = hasLimit || hasOffset;

  let limit = Number(query.limit ?? DEFAULT_LIMIT);
  let offset = Number(query.offset ?? 0);
  if (!Number.isFinite(limit) || limit <= 0) limit = DEFAULT_LIMIT;
  if (!Number.isFinite(offset) || offset < 0) offset = 0;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;

  return { limit: Math.floor(limit), offset: Math.floor(offset), paginated };
}

export function envelope<T>(data: T[], total: number, page: PageParams): unknown {
  if (!page.paginated) return data;
  return { data, total, limit: page.limit, offset: page.offset };
}
