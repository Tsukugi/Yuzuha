import {calculateAccountBalance, validateMoneyTransfer} from './moneyTransfer';
import type {MoneyAccount, MoneyEntry, MoneyTransfer} from '../types/domain';

const everyday: MoneyAccount = {
  id: 'account_everyday',
  name: 'Everyday',
  currency: 'EUR',
  openingBalanceMinor: 10000,
  isArchived: false,
};

const savings: MoneyAccount = {
  id: 'account_savings',
  name: 'Savings',
  currency: 'EUR',
  openingBalanceMinor: 5000,
  isArchived: false,
};

const transfer: MoneyTransfer = {
  id: 'transfer_1',
  fromAccountId: everyday.id,
  toAccountId: savings.id,
  amountMinor: 2500,
  currency: 'EUR',
  note: 'Move to savings',
  occurredAt: '2026-07-26T12:00:00.000Z',
  createdAt: '2026-07-26T12:00:00.000Z',
  updatedAt: '2026-07-26T12:00:00.000Z',
};

const entry = (accountId: string, kind: MoneyEntry['kind'], amountMinor: number): MoneyEntry => ({
  id: `${kind}_${amountMinor}`,
  kind,
  amountMinor,
  currency: 'EUR',
  accountId,
  categoryId: 'category_food',
  category: 'Food',
  note: '',
  occurredAt: '2026-07-26T12:00:00.000Z',
  createdAt: '2026-07-26T12:00:00.000Z',
  updatedAt: '2026-07-26T12:00:00.000Z',
});

describe('money transfers', () => {
  it('validates different active accounts with a matching currency', () => {
    expect(
      validateMoneyTransfer(
        {fromAccountId: everyday.id, toAccountId: savings.id, amountMinor: 2500, currency: 'EUR', note: ''},
        [everyday, savings],
      ),
    ).toBeNull();
  });

  it('rejects same-account, archived, and mixed-currency transfers', () => {
    expect(
      validateMoneyTransfer(
        {fromAccountId: everyday.id, toAccountId: everyday.id, amountMinor: 1, currency: 'EUR', note: ''},
        [everyday, savings],
      ),
    ).toContain('different accounts');
    expect(
      validateMoneyTransfer(
        {fromAccountId: everyday.id, toAccountId: savings.id, amountMinor: 1, currency: 'USD', note: ''},
        [everyday, {...savings, isArchived: true}],
      ),
    ).toContain('active accounts');
    expect(
      validateMoneyTransfer(
        {fromAccountId: everyday.id, toAccountId: savings.id, amountMinor: 1, currency: 'USD', note: ''},
        [everyday, {...savings, currency: 'USD'}],
      ),
    ).toContain('same currency');
  });

  it('changes account balances without creating income or expense totals', () => {
    expect(calculateAccountBalance(everyday, [entry(everyday.id, 'income', 3000), entry(everyday.id, 'expense', 700)], [transfer])).toBe(
      9800,
    );
    expect(calculateAccountBalance(savings, [], [transfer])).toBe(7500);
  });
});
