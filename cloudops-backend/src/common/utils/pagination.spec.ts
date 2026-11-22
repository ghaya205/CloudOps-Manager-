import { pageArgs, paginated, parseSort } from './pagination.js';

describe('pagination helpers', () => {
  it('computes skip and take', () => {
    expect(pageArgs({ page: 3, limit: 20 })).toEqual({ skip: 40, take: 20 });
  });

  it('builds the meta block with at least one page', () => {
    expect(paginated([], 0, { page: 1, limit: 10 }).meta).toEqual({
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 1,
    });
    expect(paginated([1], 25, { page: 1, limit: 10 }).meta.totalPages).toBe(3);
  });

  it('parses a whitelisted sort and ignores unknown fields', () => {
    const fallback = { field: 'createdAt', order: 'desc' } as const;
    expect(parseSort('name:desc', ['name'], fallback)).toEqual({
      name: 'desc',
    });
    expect(parseSort('name', ['name'], fallback)).toEqual({ name: 'asc' });
    expect(parseSort('passwordHash:asc', ['name'], fallback)).toEqual({
      createdAt: 'desc',
    });
    expect(parseSort(undefined, ['name'], fallback)).toEqual({
      createdAt: 'desc',
    });
  });
});
