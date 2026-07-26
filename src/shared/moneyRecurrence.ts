import type {
  AppData,
  MoneyAccount,
  MoneyCategory,
  MoneyEntry,
  MoneyKind,
  MoneyRecurrenceRule,
  RecurrenceCadence,
} from '../types/domain';

export interface MoneyRecurrenceInput {
  kind: MoneyKind;
  amountMinor: number;
  currency: string;
  accountId: string;
  categoryId: string | null;
  category: string;
  note: string;
  cadence: RecurrenceCadence;
  interval: number;
  nextOccurrenceLocalDate: string;
}

export interface RecurrenceExpansion {
  data: AppData;
  generatedCount: number;
}

export function validateMoneyRecurrence(
  input: MoneyRecurrenceInput,
  accounts: MoneyAccount[],
  categories: MoneyCategory[],
): string | null {
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
    return 'Recurring amount must be a positive whole number of minor units.';
  }
  if (!/^[A-Z]{3}$/.test(input.currency)) {
    return 'Recurring currency must be a three-letter uppercase code.';
  }
  if (!Number.isSafeInteger(input.interval) || input.interval < 1 || input.interval > 365) {
    return 'Recurring interval must be a whole number from 1 to 365.';
  }
  if (input.cadence !== 'day' && input.cadence !== 'week' && input.cadence !== 'month') {
    return 'Choose a valid recurring cadence.';
  }
  if (!isValidLocalDate(input.nextOccurrenceLocalDate)) {
    return 'Enter a valid recurring start date as YYYY-MM-DD.';
  }
  const account = accounts.find(item => item.id === input.accountId);
  if (!account || account.isArchived) {
    return 'Choose an active account for the recurring entry.';
  }
  if (account.currency !== input.currency) {
    return 'Recurring currency must match the selected account.';
  }
  const category = input.categoryId === null ? null : categories.find(item => item.id === input.categoryId);
  if (input.kind === 'expense' && (!category || category.isArchived || (category.kind !== 'expense' && category.kind !== 'both'))) {
    return 'Choose an active expense category for the recurring entry.';
  }
  if (category && (category.isArchived || (category.kind !== input.kind && category.kind !== 'both'))) {
    return 'Choose a category matching the recurring entry type.';
  }
  return null;
}

export function createMoneyRecurrence(
  input: MoneyRecurrenceInput,
  id: string,
  timestamp: string,
): MoneyRecurrenceRule {
  return {
    ...input,
    id,
    isPaused: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function expandDueMoneyRecurrences(
  data: AppData,
  todayLocalDate: string,
  generatedAt = new Date().toISOString(),
): RecurrenceExpansion {
  if (!isValidLocalDate(todayLocalDate)) {
    throw new Error('Recurring expansion requires a valid local date.');
  }
  const generatedEntries: MoneyEntry[] = [];
  const recurrences = data.recurrences.map(rule => {
    if (rule.isPaused || rule.nextOccurrenceLocalDate > todayLocalDate) {
      return rule;
    }
    let nextOccurrenceLocalDate = rule.nextOccurrenceLocalDate;
    while (nextOccurrenceLocalDate <= todayLocalDate) {
      const entryId = `money_${rule.id}_${nextOccurrenceLocalDate}`;
      if (!data.money.some(entry => entry.id === entryId) && !generatedEntries.some(entry => entry.id === entryId)) {
        generatedEntries.push({
          id: entryId,
          kind: rule.kind,
          amountMinor: rule.amountMinor,
          currency: rule.currency,
          accountId: rule.accountId,
          categoryId: rule.categoryId,
          category: rule.category,
          note: rule.note,
          occurredAt: localDateToIso(nextOccurrenceLocalDate),
          createdAt: generatedAt,
          updatedAt: generatedAt,
        });
      }
      nextOccurrenceLocalDate = addRecurrenceDate(nextOccurrenceLocalDate, rule.cadence, rule.interval);
    }
    return {...rule, nextOccurrenceLocalDate, updatedAt: generatedAt};
  });

  return {
    data: generatedEntries.length === 0 && recurrences.every((rule, index) => rule === data.recurrences[index])
      ? data
      : {...data, money: [...generatedEntries.reverse(), ...data.money], recurrences},
    generatedCount: generatedEntries.length,
  };
}

export function addRecurrenceDate(localDate: string, cadence: RecurrenceCadence, interval: number): string {
  if (!isValidLocalDate(localDate) || !Number.isSafeInteger(interval) || interval < 1) {
    throw new Error('Cannot advance an invalid recurrence date.');
  }
  const [year, month, day] = localDate.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day));
  if (cadence === 'day') {
    next.setUTCDate(next.getUTCDate() + interval);
  } else if (cadence === 'week') {
    next.setUTCDate(next.getUTCDate() + interval * 7);
  } else {
    const targetMonth = next.getUTCMonth() + interval;
    const targetYear = next.getUTCFullYear() + Math.floor(targetMonth / 12);
    const normalizedMonth = ((targetMonth % 12) + 12) % 12;
    const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
    next.setUTCFullYear(targetYear, normalizedMonth, Math.min(day, lastDay));
  }
  return formatLocalDate(next);
}

export function isValidLocalDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

function localDateToIso(localDate: string): string {
  const [year, month, day] = localDate.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0).toISOString();
}

function formatLocalDate(date: Date): string {
  return [date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()]
    .map((value, index) => index === 0 ? String(value).padStart(4, '0') : String(value).padStart(2, '0'))
    .join('-');
}
