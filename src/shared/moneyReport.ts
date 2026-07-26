import {isInPeriod} from './period';
import type {MoneyEntry, MoneySplit} from '../types/domain';
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

export function buildMoneyReport(entries: MoneyEntry[], range: PeriodRange, splits: MoneySplit[] = []): MoneyReport {
  const currencies = new Map<string, MoneyCurrencyReport>();
  const splitByParent = new Map(splits.map(split => [split.parentEntryId, split]));
  for (const entry of entries) {
    if (!isInPeriod(entry.occurredAt, range)) {
      continue;
    }
    const split = splitByParent.get(entry.id);
    const reportLines = split?.lines.map(line => ({
      amountMinor: line.amountMinor,
      category: line.category,
    })) ?? [{amountMinor: entry.amountMinor, category: entry.category}];
    for (const line of reportLines) {
      const currencyReport = currencies.get(entry.currency) ?? {
        currency: entry.currency,
        incomeMinor: 0,
        expenseMinor: 0,
        categories: [],
      };
      if (entry.kind === 'income') {
        currencyReport.incomeMinor += line.amountMinor;
      } else {
        currencyReport.expenseMinor += line.amountMinor;
      }
      const category = currencyReport.categories.find(item => item.name === line.category);
      if (category) {
        category[entry.kind === 'income' ? 'incomeMinor' : 'expenseMinor'] += line.amountMinor;
      } else {
        currencyReport.categories.push({
          name: line.category,
          expenseMinor: entry.kind === 'expense' ? line.amountMinor : 0,
          incomeMinor: entry.kind === 'income' ? line.amountMinor : 0,
        });
      }
      currencies.set(entry.currency, currencyReport);
    }
  }
  return {start: range.start, end: range.end, currencies: [...currencies.values()]};
}
