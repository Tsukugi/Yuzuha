import {isInPeriod} from './period';
import type {MoneyEntry} from '../types/domain';
import type {PeriodRange} from './period';

export interface MoneyCategoryReport {
  name: string;
  expenseMinor: number;
  incomeMinor: number;
}

export interface MoneyCurrencyReport {
  currency: string;
  incomeMinor: number;
  expenseMinor: number;
  categories: MoneyCategoryReport[];
}

export interface MoneyReport {
  start: Date;
  end: Date;
  currencies: MoneyCurrencyReport[];
}

export function buildMoneyReport(entries: MoneyEntry[], range: PeriodRange): MoneyReport {
  const currencies = new Map<string, MoneyCurrencyReport>();
  for (const entry of entries) {
    if (!isInPeriod(entry.occurredAt, range)) {
      continue;
    }
    const currencyReport = currencies.get(entry.currency) ?? {
      currency: entry.currency,
      incomeMinor: 0,
      expenseMinor: 0,
      categories: [],
    };
    if (entry.kind === 'income') {
      currencyReport.incomeMinor += entry.amountMinor;
    } else {
      currencyReport.expenseMinor += entry.amountMinor;
    }
    const category = currencyReport.categories.find(item => item.name === entry.category);
    if (category) {
      category[entry.kind === 'income' ? 'incomeMinor' : 'expenseMinor'] += entry.amountMinor;
    } else {
      currencyReport.categories.push({
        name: entry.category,
        expenseMinor: entry.kind === 'expense' ? entry.amountMinor : 0,
        incomeMinor: entry.kind === 'income' ? entry.amountMinor : 0,
      });
    }
    currencies.set(entry.currency, currencyReport);
  }
  return {start: range.start, end: range.end, currencies: [...currencies.values()]};
}
