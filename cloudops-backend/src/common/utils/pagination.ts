import type { PaginationQueryDto } from '../dto/pagination-query.dto.js';

export interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export function paginated<T>(
  data: T[],
  total: number,
  query: Pick<PaginationQueryDto, 'page' | 'limit'>,
): Paginated<T> {
  return {
    data,
    meta: {
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

export function pageArgs(query: Pick<PaginationQueryDto, 'page' | 'limit'>) {
  return { skip: (query.page - 1) * query.limit, take: query.limit };
}

/**
 * Turns `sort=name:desc` into a Prisma orderBy. Unknown fields fall back to the default,
 * so a client can never order by a column that is not whitelisted.
 */
export function parseSort(
  sort: string | undefined,
  allowed: readonly string[],
  fallback: { field: string; order: 'asc' | 'desc' },
): Record<string, 'asc' | 'desc'> {
  if (sort) {
    const [field, order] = sort.split(':');
    if (field && allowed.includes(field)) {
      return { [field]: order === 'desc' ? 'desc' : 'asc' };
    }
  }
  return { [fallback.field]: fallback.order };
}
