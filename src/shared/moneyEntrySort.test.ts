import {sortMoneyEntriesNewestFirst} from './moneyEntrySort';
import type {MoneyEntry} from '../types/domain';

function entry(id: string, occurredAt: string): MoneyEntry {
  return {
    id,
    kind: 'expense',
    amountMinor: 100,
    currency: 'EUR',
    accountId: null,
    categoryId: null,
    payeeId: null,
    category: 'Food',
    note: '',
    occurredAt,
    createdAt: occurredAt,
    updatedAt: occurredAt,
  };
}

describe('newest-first money entry sorting', () => {
  it('sorts by the actual occurredAt instant across dates and offsets', () => {
    const entries = [
      entry('late', '2026-07-02T00:00:00.000Z'),
      entry('early', '2026-07-01T23:00:00.000-02:00'),
      entry('middle', '2026-07-01T23:30:00.000Z'),
    ];

    expect(sortMoneyEntriesNewestFirst(entries).map(item => item.id)).toEqual(['early', 'late', 'middle']);
  });

  it('uses the ID as a stable tie-breaker for equal timestamps', () => {
    const entries = [
      entry('z-entry', '2026-07-01T12:00:00.000Z'),
      entry('a-entry', '2026-07-01T12:00:00.000Z'),
      entry('m-entry', '2026-07-01T12:00:00.000Z'),
    ];

    expect(sortMoneyEntriesNewestFirst(entries).map(item => item.id)).toEqual(['a-entry', 'm-entry', 'z-entry']);
  });

  it('does not mutate the input array', () => {
    const entries = [
      entry('second', '2026-07-02T12:00:00.000Z'),
      entry('first', '2026-07-01T12:00:00.000Z'),
    ];

    const sorted = sortMoneyEntriesNewestFirst(entries);

    expect(sorted).not.toBe(entries);
    expect(entries.map(item => item.id)).toEqual(['second', 'first']);
    expect(sorted.map(item => item.id)).toEqual(['second', 'first']);
  });

  it('rejects invalid occurredAt timestamps deterministically', () => {
    expect(() => sortMoneyEntriesNewestFirst([entry('invalid', 'not-a-date')])).toThrow(/occurredAt/i);
  });
});
