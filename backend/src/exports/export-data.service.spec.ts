import { ExportDataService } from './export-data.service';

describe('ExportDataService batching', () => {
  it('fetches rows in batches and marks truncation', async () => {
    const first = Array.from({ length: 500 }, (_, index) => ({ id: index }));
    const second = Array.from({ length: 200 }, (_, index) => ({
      id: 500 + index,
    }));
    const fetch = jest
      .fn()
      .mockResolvedValueOnce(first)
      .mockResolvedValueOnce(second);
    const service = new ExportDataService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    const result = await service.collect(
      () => Promise.resolve(12_000),
      fetch,
      700,
    );

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenNthCalledWith(1, 0, 500);
    expect(fetch).toHaveBeenNthCalledWith(2, 500, 200);
    expect(result.rows).toHaveLength(700);
    expect(result.truncated).toBe(true);
    expect(result.totalMatches).toBe(12_000);
  });

  it('returns an empty collection when the database has no rows', async () => {
    const service = new ExportDataService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.collect(
        () => Promise.resolve(0),
        () => Promise.resolve([]),
        10_000,
      ),
    ).resolves.toEqual({ rows: [], truncated: false, totalMatches: 0 });
  });
});
