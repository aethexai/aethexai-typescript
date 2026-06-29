/**
 * Single-page result from a list endpoint.
 *
 * Mirrors the Python SDK's `PaginatedResponse`. **`data` holds ONE page of
 * results** (default limit 50) — not the full dataset. To page through
 * everything, advance `offset` by `limit` while `.hasMore` is `true`:
 *
 * ```ts
 * let offset = 0;
 * const limit = 50;
 * for (;;) {
 *   const page = await client.listAgents({ offset, limit });
 *   for (const agent of page) process(agent);
 *   if (!page.hasMore) break;
 *   offset += limit;
 * }
 * ```
 *
 * The instance is iterable (`for (const item of page)`), has a `.length`,
 * and supports `.at(i)` indexing over the current page's items.
 */
export interface RawPage<T> {
  data?: T[] | null;
  limit?: number | null;
  offset?: number | null;
  total?: number | null;
  [key: string]: unknown;
}

export class PaginatedResponse<T> implements Iterable<T> {
  readonly data: T[];
  readonly limit: number;
  readonly offset: number;
  readonly total: number;

  constructor(raw: RawPage<T> | null | undefined) {
    this.data = Array.isArray(raw?.data) ? (raw!.data as T[]) : [];
    this.limit = typeof raw?.limit === "number" ? raw!.limit! : 50;
    this.offset = typeof raw?.offset === "number" ? raw!.offset! : 0;
    this.total = typeof raw?.total === "number" ? raw!.total! : 0;
  }

  /** `true` when there are more pages beyond this one. */
  get hasMore(): boolean {
    return this.offset + this.data.length < this.total;
  }

  /** Number of items on this page. */
  get length(): number {
    return this.data.length;
  }

  /** Item at `index` on this page (negative indexes count from the end). */
  at(index: number): T | undefined {
    return this.data.at(index);
  }

  /** The current page's items as a plain array. */
  toArray(): T[] {
    return [...this.data];
  }

  [Symbol.iterator](): Iterator<T> {
    return this.data[Symbol.iterator]();
  }
}
