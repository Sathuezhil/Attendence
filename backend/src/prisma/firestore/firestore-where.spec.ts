import { matchWhere } from './firestore-where';

const emptyLookup = {
  getBelongsTo: () => null,
};

describe('matchWhere', () => {
  const context = { relations: {}, lookup: emptyLookup };

  it('matches equals, contains, and date ranges', () => {
    const record = {
      id: '1',
      employeeCode: 'EMP-001',
      firstName: 'Ada',
      deletedAt: null,
      joiningDate: new Date('2020-01-01T00:00:00.000Z'),
    };

    expect(
      matchWhere(
        record,
        {
          deletedAt: null,
          employeeCode: { contains: 'emp', mode: 'insensitive' },
          joiningDate: {
            gte: new Date('2020-01-01T00:00:00.000Z'),
            lte: new Date('2020-12-31T00:00:00.000Z'),
          },
        },
        context,
      ),
    ).toBe(true);

    expect(
      matchWhere(
        record,
        { joiningDate: { lt: new Date('2020-01-01T00:00:00.000Z') } },
        context,
      ),
    ).toBe(false);
  });

  it('treats an empty in: [] filter as no match', () => {
    expect(
      matchWhere({ id: '1' }, { id: { in: [] } }, context),
    ).toBe(false);
  });

  it('matches OR groups', () => {
    expect(
      matchWhere(
        { firstName: 'Ada', lastName: 'Lovelace' },
        {
          OR: [
            { firstName: { contains: 'zz', mode: 'insensitive' } },
            { lastName: { contains: 'love', mode: 'insensitive' } },
          ],
        },
        context,
      ),
    ).toBe(true);
  });
});
