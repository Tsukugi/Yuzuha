import {addRecurrenceDate, createMoneyRecurrence, expandDueMoneyRecurrences, validateMoneyRecurrence} from './moneyRecurrence';
import {emptyAppData} from '../types/domain';

const accounts = emptyAppData().accounts;
const categories = emptyAppData().categories;

const input = {
  kind: 'expense' as const,
  amountMinor: 1250,
  currency: 'EUR',
  accountId: 'account_everyday',
  categoryId: 'category_food',
  category: 'Food',
  note: 'Subscription',
  cadence: 'month' as const,
  interval: 1,
  nextOccurrenceLocalDate: '2026-01-31',
};

describe('money recurrences', () => {
  it('validates the account, currency, category, cadence, interval, and date', () => {
    expect(validateMoneyRecurrence(input, accounts, categories)).toBeNull();
    expect(validateMoneyRecurrence({...input, amountMinor: 0}, accounts, categories)).toContain('positive');
    expect(validateMoneyRecurrence({...input, currency: 'USD'}, accounts, categories)).toContain('match');
    expect(validateMoneyRecurrence({...input, nextOccurrenceLocalDate: '2026-02-30'}, accounts, categories)).toContain('valid recurring start');
    expect(validateMoneyRecurrence({...input, interval: 0}, accounts, categories)).toContain('1 to 365');
  });

  it('advances calendar dates deterministically and clamps short months', () => {
    expect(addRecurrenceDate('2026-01-31', 'month', 1)).toBe('2026-02-28');
    expect(addRecurrenceDate('2026-02-28', 'month', 1)).toBe('2026-03-28');
    expect(addRecurrenceDate('2026-07-26', 'week', 2)).toBe('2026-08-09');
  });

  it('generates each due occurrence once and advances the next date', () => {
    const data = emptyAppData();
    const rule = createMoneyRecurrence({...input, cadence: 'day', interval: 1, nextOccurrenceLocalDate: '2026-07-24'}, 'rule_1', '2026-07-24T00:00:00.000Z');
    data.recurrences = [rule];

    const first = expandDueMoneyRecurrences(data, '2026-07-26', '2026-07-26T12:00:00.000Z');
    expect(first.generatedCount).toBe(3);
    expect(first.data.money.map(entry => entry.id)).toEqual([
      'money_rule_1_2026-07-26',
      'money_rule_1_2026-07-25',
      'money_rule_1_2026-07-24',
    ]);
    expect(first.data.recurrences[0].nextOccurrenceLocalDate).toBe('2026-07-27');

    const second = expandDueMoneyRecurrences(first.data, '2026-07-26', '2026-07-26T12:00:00.000Z');
    expect(second.generatedCount).toBe(0);
    expect(second.data).toBe(first.data);
  });
});
