import type {
  AppData,
  MoneyAccount,
  MoneyCategory,
  MoneyEntry,
  MoneyKind,
  MoneyRecurrenceRule,
  MissedOccurrencePolicy,
  RecurrenceCadence,
  RecurrenceWeekday,
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
  weekdays: RecurrenceWeekday[];
  nextOccurrenceLocalDate: string;
  missedOccurrencePolicy: MissedOccurrencePolicy;
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
  if (!isValidRecurrenceWeekdays(input.weekdays)) {
    return 'Choose at least one valid day for the recurring operation.';
  }
  if ((input.cadence !== 'day' || input.interval !== 1) && input.weekdays.length !== 7) {
    return 'Choose all days unless the operation repeats every day.';
  }
  if (!isMissedOccurrencePolicy(input.missedOccurrencePolicy)) {
    return 'Choose a valid missed-occurrence policy.';
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

export function setMoneyRecurrencePaused(
  rules: MoneyRecurrenceRule[],
  ruleId: string,
  isPaused: boolean,
  timestamp = new Date().toISOString(),
): MoneyRecurrenceRule[] {
  if (!rules.some(rule => rule.id === ruleId)) {
    throw new Error('The periodic money operation no longer exists.');
  }
  return rules.map(rule => rule.id === ruleId ? {...rule, isPaused, updatedAt: timestamp} : rule);
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
    const dueDates: string[] = [];
    let nextOccurrenceLocalDate = rule.nextOccurrenceLocalDate;
    while (nextOccurrenceLocalDate <= todayLocalDate) {
      if (rule.cadence !== 'day' || rule.interval !== 1 || rule.weekdays.includes(getRecurrenceWeekday(nextOccurrenceLocalDate))) {
        dueDates.push(nextOccurrenceLocalDate);
      }
      nextOccurrenceLocalDate = addMoneyRecurrenceDate(rule, nextOccurrenceLocalDate);
    }
    const occurrenceDates = rule.missedOccurrencePolicy === 'all'
      ? dueDates
      : rule.missedOccurrencePolicy === 'one'
        ? dueDates.slice(0, 1)
        : rule.missedOccurrencePolicy === 'skip'
          ? []
          : (() => { throw new Error(`Recurring rule ${rule.id} has an invalid missed-occurrence policy.`); })();
    occurrenceDates.forEach(occurrenceLocalDate => {
      const entryId = `money_${rule.id}_${occurrenceLocalDate}`;
      if (!data.money.some(entry => entry.id === entryId) && !generatedEntries.some(entry => entry.id === entryId)) {
        generatedEntries.push({
          id: entryId,
          kind: rule.kind,
          amountMinor: rule.amountMinor,
          currency: rule.currency,
          accountId: rule.accountId,
          categoryId: rule.categoryId,
          payeeId: null,
          category: rule.category,
          note: rule.note,
          occurredAt: localDateToIso(occurrenceLocalDate),
          createdAt: generatedAt,
          updatedAt: generatedAt,
        });
      }
    });
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

function addMoneyRecurrenceDate(rule: MoneyRecurrenceRule, localDate: string): string {
  let next = addRecurrenceDate(localDate, rule.cadence, rule.interval);
  if (rule.cadence === 'day' && rule.interval === 1) {
    while (!rule.weekdays.includes(getRecurrenceWeekday(next))) {
      next = addRecurrenceDate(next, 'day', 1);
    }
  }
  return next;
}

export function isValidLocalDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

export function getRecurrenceWeekday(localDate: string): RecurrenceWeekday {
  if (!isValidLocalDate(localDate)) {
    throw new Error('Cannot get the weekday for an invalid local date.');
  }
  const [year, month, day] = localDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay() as RecurrenceWeekday;
}

export function isValidRecurrenceWeekdays(value: unknown): value is RecurrenceWeekday[] {
  return Array.isArray(value) && value.length > 0 && new Set(value).size === value.length && value.every(day => Number.isInteger(day) && day >= 0 && day <= 6);
}

function isMissedOccurrencePolicy(value: unknown): value is MissedOccurrencePolicy {
  return value === 'all' || value === 'one' || value === 'skip';
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
