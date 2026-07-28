import {addRecurrenceDate, createMoneyRecurrence, expandDueMoneyRecurrences, setMoneyRecurrencePaused, validateMoneyRecurrence} from './moneyRecurrence';
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
  missedOccurrencePolicy: 'all' as const,
};

describe('money recurrences', () => {
  it('validates the account, currency, category, cadence, interval, and date', () => {
    expect(validateMoneyRecurrence(input, accounts, categories)).toBeNull();
    expect(validateMoneyRecurrence({...input, amountMinor: 0}, accounts, categories)).toContain('positive');
    expect(validateMoneyRecurrence({...input, currency: 'USD'}, accounts, categories)).toContain('match');
    expect(validateMoneyRecurrence({...input, nextOccurrenceLocalDate: '2026-02-30'}, accounts, categories)).toContain('valid recurring start');
    expect(validateMoneyRecurrence({...input, interval: 0}, accounts, categories)).toContain('1 to 365');
    expect(validateMoneyRecurrence({...input, missedOccurrencePolicy: 'later' as never}, accounts, categories)).toContain('missed-occurrence');
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

  it('creates only the first missed occurrence when policy is one', () => {
    const data = emptyAppData();
    const rule = createMoneyRecurrence(
      {...input, cadence: 'day', interval: 1, nextOccurrenceLocalDate: '2026-07-24', missedOccurrencePolicy: 'one'},
      'rule_one',
      '2026-07-24T00:00:00.000Z',
    );
    data.recurrences = [rule];

    const result = expandDueMoneyRecurrences(data, '2026-07-26', '2026-07-26T12:00:00.000Z');

    expect(result.generatedCount).toBe(1);
    expect(result.data.money.map(entry => entry.id)).toEqual(['money_rule_one_2026-07-24']);
    expect(result.data.recurrences[0].nextOccurrenceLocalDate).toBe('2026-07-27');
  });

  it('skips all missed occurrences when policy is skip', () => {
    const data = emptyAppData();
    const rule = createMoneyRecurrence(
      {...input, cadence: 'day', interval: 1, nextOccurrenceLocalDate: '2026-07-24', missedOccurrencePolicy: 'skip'},
      'rule_skip',
      '2026-07-24T00:00:00.000Z',
    );
    data.recurrences = [rule];

    const result = expandDueMoneyRecurrences(data, '2026-07-26', '2026-07-26T12:00:00.000Z');

    expect(result.generatedCount).toBe(0);
    expect(result.data.money).toEqual([]);
    expect(result.data.recurrences[0].nextOccurrenceLocalDate).toBe('2026-07-27');
  });

  it('pauses and resumes an existing operation without changing its next date', () => {
    const rule = createMoneyRecurrence(input, 'rule_pause', '2026-07-24T00:00:00.000Z');

    const paused = setMoneyRecurrencePaused([rule], rule.id, true, '2026-07-26T12:00:00.000Z');
    expect(paused[0]).toMatchObject({id: rule.id, isPaused: true, nextOccurrenceLocalDate: rule.nextOccurrenceLocalDate, updatedAt: '2026-07-26T12:00:00.000Z'});

    const resumed = setMoneyRecurrencePaused(paused, rule.id, false, '2026-07-27T12:00:00.000Z');
    expect(resumed[0]).toMatchObject({id: rule.id, isPaused: false, nextOccurrenceLocalDate: rule.nextOccurrenceLocalDate, updatedAt: '2026-07-27T12:00:00.000Z'});
  });

  it('does not expand a paused operation', () => {
    const data = emptyAppData();
    const rule = {...createMoneyRecurrence({...input, nextOccurrenceLocalDate: '2026-07-24'}, 'rule_paused', '2026-07-24T00:00:00.000Z'), isPaused: true};
    data.recurrences = [rule];

    const result = expandDueMoneyRecurrences(data, '2026-07-29', '2026-07-29T12:00:00.000Z');

    expect(result.generatedCount).toBe(0);
    expect(result.data).toBe(data);
  });

  it('rejects pausing an operation that is no longer present', () => {
    expect(() => setMoneyRecurrencePaused([], 'missing', true)).toThrow('no longer exists');
  });
});
