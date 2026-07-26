import {createMoneySplit, validateMoneySplit} from './moneySplit';
import type {MoneyAccount, MoneyCategory} from '../types/domain';

const account: MoneyAccount = {
  id: 'account_everyday',
  name: 'Everyday',
  currency: 'EUR',
  openingBalanceMinor: 0,
  isArchived: false,
};

const categories: MoneyCategory[] = [
  {id: 'category_food', name: 'Food', kind: 'expense', isArchived: false},
  {id: 'category_transport', name: 'Transport', kind: 'expense', isArchived: false},
];

const validInput = {
  kind: 'expense' as const,
  amountMinor: 1000,
  currency: 'EUR',
  accountId: account.id,
  category: 'Split',
  note: 'Trip',
  lines: [
    {categoryId: 'category_food', category: 'Food', amountMinor: 700, note: ''},
    {categoryId: 'category_transport', category: 'Transport', amountMinor: 300, note: ''},
  ],
};

describe('money splits', () => {
  it('accepts two active matching lines that sum to the parent', () => {
    expect(validateMoneySplit(validInput, [account], categories)).toBeNull();
  });

  it('rejects incomplete sums and invalid lines', () => {
    expect(
      validateMoneySplit({...validInput, lines: [{...validInput.lines[0], amountMinor: 699}, validInput.lines[1]]}, [account], categories),
    ).toContain('exactly');
    expect(
      validateMoneySplit({...validInput, lines: [validInput.lines[0]]}, [account], categories),
    ).toContain('at least two');
    expect(
      validateMoneySplit({...validInput, lines: [{...validInput.lines[0], categoryId: 'missing'}, validInput.lines[1]]}, [account], categories),
    ).toContain('matching category');
  });

  it('creates a linked parent entry and uniquely identified lines', () => {
    let nextId = 0;
    const created = createMoneySplit(
      validInput,
      'money_1',
      'split_1',
      '2026-07-26T12:00:00.000Z',
      prefix => `${prefix}_${++nextId}`,
    );
    expect(created.entry.splitId).toBe('split_1');
    expect(created.entry.amountMinor).toBe(1000);
    expect(created.split.parentEntryId).toBe('money_1');
    expect(created.split.lines.map(line => line.id)).toEqual(['split_line_1', 'split_line_2']);
  });
});
