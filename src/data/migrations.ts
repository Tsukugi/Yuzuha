import {emptyAppData} from '../types/domain';
import type {AppData, MoneyBudget, MoneyCategory, MoneyEntry, MoneyRecurrenceRule, UsageRead, UsageSnapshot} from '../types/domain';
import {validateNoteTags} from '../shared/noteSearch';
import {validateSavedSearchDraft} from '../shared/savedSearch';
import {DEFAULT_TASK_REMINDER_SNOOZE_DURATION_MINUTES, isValidTaskReminderSnoozeDuration, validateQuietHoursDraft} from '../shared/notificationSettings';

interface StoredV1 {
  schemaVersion: 1;
  money: Array<Omit<MoneyEntry, 'accountId' | 'categoryId'> & {category: string}>;
  notes: AppData['notes'];
  tasks: StoredLegacyTask[];
}

interface StoredV2 {
  schemaVersion: 2;
  mainCurrency: string;
  money: MoneyEntry[];
  accounts: AppData['accounts'];
  categories: AppData['categories'];
  notes: AppData['notes'];
  tasks: StoredLegacyTask[];
  usageSnapshots: UsageSnapshot[];
  usageRead: UsageRead;
}

interface StoredV3 {
  schemaVersion: 3;
  mainCurrency: string;
  money: MoneyEntry[];
  accounts: AppData['accounts'];
  categories: AppData['categories'];
  notes: AppData['notes'];
  tasks: StoredLegacyTask[];
  usageSnapshots: UsageSnapshot[];
  usageRead: UsageRead;
  usageExcludedPackages: string[];
  timeGoals: AppData['timeGoals'];
}

interface StoredV4 {
  schemaVersion: 4;
  mainCurrency: string;
  money: MoneyEntry[];
  transfers: AppData['transfers'];
  accounts: AppData['accounts'];
  categories: AppData['categories'];
  notes: AppData['notes'];
  tasks: StoredLegacyTask[];
  usageSnapshots: UsageSnapshot[];
  usageRead: UsageRead;
  usageExcludedPackages: string[];
  timeGoals: AppData['timeGoals'];
}

interface StoredV5 {
  schemaVersion: 5;
  mainCurrency: string;
  money: MoneyEntry[];
  transfers: AppData['transfers'];
  splits: AppData['splits'];
  accounts: AppData['accounts'];
  categories: AppData['categories'];
  notes: AppData['notes'];
  tasks: StoredLegacyTask[];
  usageSnapshots: UsageSnapshot[];
  usageRead: UsageRead;
  usageExcludedPackages: string[];
  timeGoals: AppData['timeGoals'];
}

interface StoredV6 {
  schemaVersion: 6;
  mainCurrency: string;
  money: AppData['money'];
  transfers: AppData['transfers'];
  splits: AppData['splits'];
  budgets: Array<Omit<MoneyBudget, 'rollover'>>;
  accounts: AppData['accounts'];
  categories: AppData['categories'];
  notes: AppData['notes'];
  tasks: StoredLegacyTask[];
  usageSnapshots: AppData['usageSnapshots'];
  usageRead: AppData['usageRead'];
  usageExcludedPackages: string[];
  timeGoals: AppData['timeGoals'];
}

interface StoredV7 {
  schemaVersion: 7;
  mainCurrency: string;
  money: AppData['money'];
  transfers: AppData['transfers'];
  splits: AppData['splits'];
  budgets: AppData['budgets'];
  accounts: AppData['accounts'];
  categories: AppData['categories'];
  notes: AppData['notes'];
  tasks: StoredLegacyTask[];
  usageSnapshots: AppData['usageSnapshots'];
  usageRead: AppData['usageRead'];
  usageExcludedPackages: string[];
  timeGoals: AppData['timeGoals'];
}

interface StoredV8 extends Omit<AppData, 'schemaVersion' | 'notificationSettings' | 'recurrences' | 'attachments' | 'savedSearches' | 'taskLists' | 'taskRecurrences' | 'tasks'> {
  schemaVersion: 8;
  recurrences: Array<Omit<MoneyRecurrenceRule, 'missedOccurrencePolicy'>>;
  tasks: StoredLegacyTask[];
}

interface StoredV9 extends Omit<AppData, 'schemaVersion' | 'notificationSettings' | 'attachments' | 'savedSearches' | 'taskLists' | 'taskRecurrences' | 'tasks'> {
  schemaVersion: 9;
  tasks: StoredLegacyTask[];
}

type StoredNoteV11 = Omit<AppData['notes'][number], 'isArchived'>;

interface StoredV10 extends Omit<AppData, 'schemaVersion' | 'notificationSettings' | 'notes' | 'savedSearches' | 'taskLists' | 'taskRecurrences' | 'tasks'> {
  schemaVersion: 10;
  notes: StoredNoteV11[];
  tasks: StoredLegacyTask[];
}

interface StoredV11 extends Omit<AppData, 'schemaVersion' | 'notificationSettings' | 'notes' | 'savedSearches' | 'taskLists' | 'taskRecurrences' | 'tasks'> {
  schemaVersion: 11;
  notes: StoredNoteV11[];
  tasks: StoredLegacyTask[];
}

interface StoredV12 extends Omit<AppData, 'schemaVersion' | 'notificationSettings' | 'savedSearches' | 'taskLists' | 'taskRecurrences' | 'tasks'> {
  schemaVersion: 12;
  tasks: StoredLegacyTask[];
}

type StoredLegacyTask = Omit<AppData['tasks'][number], 'sourceNoteId' | 'priority' | 'listId' | 'recurrenceRuleId' | 'reminderAtMillis'>;
type StoredTaskV13 = StoredLegacyTask;

interface StoredV13 extends Omit<AppData, 'schemaVersion' | 'notificationSettings' | 'tasks' | 'taskLists' | 'taskRecurrences'> {
  schemaVersion: 13;
  tasks: StoredTaskV13[];
}

type StoredTaskV14 = Omit<AppData['tasks'][number], 'priority' | 'listId' | 'recurrenceRuleId' | 'reminderAtMillis'>;

interface StoredV14 extends Omit<AppData, 'schemaVersion' | 'notificationSettings' | 'tasks' | 'taskLists' | 'taskRecurrences'> {
  schemaVersion: 14;
  tasks: StoredTaskV14[];
}

type StoredTaskV15 = Omit<AppData['tasks'][number], 'recurrenceRuleId' | 'reminderAtMillis'>;

interface StoredV15 extends Omit<AppData, 'schemaVersion' | 'notificationSettings' | 'taskRecurrences' | 'tasks'> {
  schemaVersion: 15;
  tasks: StoredTaskV15[];
}

type StoredTaskV16 = Omit<AppData['tasks'][number], 'reminderAtMillis'>;

interface StoredV16 extends Omit<AppData, 'schemaVersion' | 'notificationSettings' | 'tasks'> {
  schemaVersion: 16;
  tasks: StoredTaskV16[];
}

interface StoredV17 extends Omit<AppData, 'schemaVersion' | 'notificationSettings'> {
  schemaVersion: 17;
}

interface StoredV18 extends Omit<AppData, 'schemaVersion' | 'notificationSettings'> {
  schemaVersion: 18;
  notificationSettings: {
    quietHoursStartLocalTime: string | null;
    quietHoursEndLocalTime: string | null;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

export function isStoredV1(value: unknown): value is StoredV1 {
  return (
    isRecord(value) &&
    value.schemaVersion === 1 &&
    Array.isArray(value.money) &&
    Array.isArray(value.notes) &&
    Array.isArray(value.tasks)
  );
}

export function isStoredV2(value: unknown): value is StoredV2 {
  return (
    isRecord(value) &&
    value.schemaVersion === 2 &&
    typeof value.mainCurrency === 'string' &&
    Array.isArray(value.money) &&
    Array.isArray(value.accounts) &&
    Array.isArray(value.categories) &&
    Array.isArray(value.notes) &&
    Array.isArray(value.tasks) &&
    Array.isArray(value.usageSnapshots) &&
    isRecord(value.usageRead)
  );
}

export function isStoredV3(value: unknown): value is StoredV3 {
  return (
    isRecord(value) &&
    value.schemaVersion === 3 &&
    typeof value.mainCurrency === 'string' &&
    Array.isArray(value.money) &&
    Array.isArray(value.accounts) &&
    Array.isArray(value.categories) &&
    Array.isArray(value.notes) &&
    Array.isArray(value.tasks) &&
    Array.isArray(value.usageSnapshots) &&
    isRecord(value.usageRead) &&
    Array.isArray(value.usageExcludedPackages) &&
    Array.isArray(value.timeGoals)
  );
}

export function isStoredV4(value: unknown): value is StoredV4 {
  return (
    isRecord(value) &&
    value.schemaVersion === 4 &&
    typeof value.mainCurrency === 'string' &&
    Array.isArray(value.money) &&
    Array.isArray(value.transfers) &&
    Array.isArray(value.accounts) &&
    Array.isArray(value.categories) &&
    Array.isArray(value.notes) &&
    Array.isArray(value.tasks) &&
    Array.isArray(value.usageSnapshots) &&
    isRecord(value.usageRead) &&
    Array.isArray(value.usageExcludedPackages) &&
    Array.isArray(value.timeGoals)
  );
}

export function isStoredV5(value: unknown): value is StoredV5 {
  return (
    isRecord(value) &&
    value.schemaVersion === 5 &&
    typeof value.mainCurrency === 'string' &&
    Array.isArray(value.money) &&
    Array.isArray(value.transfers) &&
    Array.isArray(value.splits) &&
    Array.isArray(value.accounts) &&
    Array.isArray(value.categories) &&
    Array.isArray(value.notes) &&
    Array.isArray(value.tasks) &&
    Array.isArray(value.usageSnapshots) &&
    isRecord(value.usageRead) &&
    Array.isArray(value.usageExcludedPackages) &&
    Array.isArray(value.timeGoals)
  );
}

export function isStoredV6(value: unknown): value is StoredV6 {
  return (
    isRecord(value) &&
    value.schemaVersion === 6 &&
    typeof value.mainCurrency === 'string' &&
    Array.isArray(value.money) &&
    Array.isArray(value.transfers) &&
    Array.isArray(value.splits) &&
    Array.isArray(value.budgets) &&
    Array.isArray(value.accounts) &&
    Array.isArray(value.categories) &&
    Array.isArray(value.notes) &&
    Array.isArray(value.tasks) &&
    Array.isArray(value.usageSnapshots) &&
    isRecord(value.usageRead) &&
    Array.isArray(value.usageExcludedPackages) &&
    Array.isArray(value.timeGoals)
  );
}

export function isStoredV7(value: unknown): value is StoredV7 {
  return (
    isRecord(value) &&
    value.schemaVersion === 7 &&
    typeof value.mainCurrency === 'string' &&
    Array.isArray(value.money) &&
    Array.isArray(value.transfers) &&
    Array.isArray(value.splits) &&
    Array.isArray(value.budgets) &&
    value.budgets.every(budget => isRecord(budget) && (budget.rollover === 'none' || budget.rollover === 'carry-forward')) &&
    Array.isArray(value.accounts) &&
    Array.isArray(value.categories) &&
    Array.isArray(value.notes) &&
    Array.isArray(value.tasks) &&
    Array.isArray(value.usageSnapshots) &&
    isRecord(value.usageRead) &&
    Array.isArray(value.usageExcludedPackages) &&
    Array.isArray(value.timeGoals)
  );
}

export function isStoredV8(value: unknown): value is StoredV8 {
  return (
    isRecord(value) &&
    value.schemaVersion === 8 &&
    typeof value.mainCurrency === 'string' &&
    Array.isArray(value.money) &&
    Array.isArray(value.transfers) &&
    Array.isArray(value.splits) &&
    Array.isArray(value.budgets) &&
    Array.isArray(value.recurrences) &&
    Array.isArray(value.accounts) &&
    Array.isArray(value.categories) &&
    Array.isArray(value.notes) &&
    Array.isArray(value.tasks) &&
    Array.isArray(value.usageSnapshots) &&
    isRecord(value.usageRead) &&
    Array.isArray(value.usageExcludedPackages) &&
    Array.isArray(value.timeGoals)
  );
}

export function isStoredV9(value: unknown): value is StoredV9 {
  return (
    isRecord(value) &&
    value.schemaVersion === 9 &&
    typeof value.mainCurrency === 'string' &&
    Array.isArray(value.money) &&
    Array.isArray(value.transfers) &&
    Array.isArray(value.splits) &&
    Array.isArray(value.budgets) &&
    Array.isArray(value.recurrences) &&
    Array.isArray(value.accounts) &&
    Array.isArray(value.categories) &&
    Array.isArray(value.notes) &&
    Array.isArray(value.tasks) &&
    Array.isArray(value.usageSnapshots) &&
    isRecord(value.usageRead) &&
    Array.isArray(value.usageExcludedPackages) &&
    Array.isArray(value.timeGoals)
  );
}

export function isStoredV10(value: unknown): value is StoredV10 {
  return (
    isRecord(value) &&
    value.schemaVersion === 10 &&
    typeof value.mainCurrency === 'string' &&
    Array.isArray(value.money) &&
    Array.isArray(value.transfers) &&
    Array.isArray(value.splits) &&
    Array.isArray(value.budgets) &&
    Array.isArray(value.recurrences) &&
    Array.isArray(value.accounts) &&
    Array.isArray(value.categories) &&
    Array.isArray(value.notes) &&
    Array.isArray(value.attachments) &&
    Array.isArray(value.tasks) &&
    Array.isArray(value.usageSnapshots) &&
    isRecord(value.usageRead) &&
    Array.isArray(value.usageExcludedPackages) &&
    Array.isArray(value.timeGoals)
  );
}

export function isStoredV11(value: unknown): value is StoredV11 {
  return (
    isRecord(value) &&
    value.schemaVersion === 11 &&
    typeof value.mainCurrency === 'string' &&
    Array.isArray(value.money) &&
    Array.isArray(value.transfers) &&
    Array.isArray(value.splits) &&
    Array.isArray(value.budgets) &&
    Array.isArray(value.recurrences) &&
    Array.isArray(value.accounts) &&
    Array.isArray(value.categories) &&
    Array.isArray(value.notes) &&
    value.notes.every(note => isRecord(note) && validateNoteTags(note.tags)) &&
    Array.isArray(value.attachments) &&
    Array.isArray(value.tasks) &&
    Array.isArray(value.usageSnapshots) &&
    isRecord(value.usageRead) &&
    Array.isArray(value.usageExcludedPackages) &&
    Array.isArray(value.timeGoals)
  );
}

export function isStoredV12(value: unknown): value is StoredV12 {
  return (
    isRecord(value) &&
    value.schemaVersion === 12 &&
    typeof value.mainCurrency === 'string' &&
    Array.isArray(value.money) &&
    Array.isArray(value.transfers) &&
    Array.isArray(value.splits) &&
    Array.isArray(value.budgets) &&
    Array.isArray(value.recurrences) &&
    Array.isArray(value.accounts) &&
    Array.isArray(value.categories) &&
    Array.isArray(value.notes) &&
    value.notes.every(note => isRecord(note) && validateNoteTags(note.tags) && typeof note.isPinned === 'boolean' && typeof note.isArchived === 'boolean') &&
    Array.isArray(value.attachments) &&
    Array.isArray(value.tasks) &&
    Array.isArray(value.usageSnapshots) &&
    isRecord(value.usageRead) &&
    Array.isArray(value.usageExcludedPackages) &&
    Array.isArray(value.timeGoals)
  );
}

function isStoredV13Shape(value: unknown, schemaVersion: 13 | 14 | 15 | 16 | 17 | 18 | 19, requireTaskSourceNoteId: boolean): boolean {
  return (
    isRecord(value) &&
    value.schemaVersion === schemaVersion &&
    typeof value.mainCurrency === 'string' &&
    Array.isArray(value.money) &&
    Array.isArray(value.transfers) &&
    Array.isArray(value.splits) &&
    Array.isArray(value.budgets) &&
    Array.isArray(value.recurrences) &&
    Array.isArray(value.accounts) &&
    Array.isArray(value.categories) &&
    Array.isArray(value.notes) &&
    value.notes.every(note => isRecord(note) && validateNoteTags(note.tags) && typeof note.isPinned === 'boolean' && typeof note.isArchived === 'boolean') &&
    Array.isArray(value.attachments) &&
    Array.isArray(value.savedSearches) &&
    value.savedSearches.every(savedSearch => {
      if (!isRecord(savedSearch) || typeof savedSearch.id !== 'string' || typeof savedSearch.name !== 'string' ||
          typeof savedSearch.query !== 'string' || typeof savedSearch.showArchived !== 'boolean' ||
          typeof savedSearch.createdAt !== 'string' || typeof savedSearch.updatedAt !== 'string') {
        return false;
      }
      return validateSavedSearchDraft({
        name: savedSearch.name,
        query: savedSearch.query,
        showArchived: savedSearch.showArchived,
      }) === null && savedSearch.name === savedSearch.name.trim() && savedSearch.query === savedSearch.query.trim() &&
        isIsoDate(savedSearch.createdAt) && isIsoDate(savedSearch.updatedAt);
    }) &&
    Array.isArray(value.tasks) &&
    value.tasks.every(task => isRecord(task) && (!requireTaskSourceNoteId || typeof task.sourceNoteId === 'string' || task.sourceNoteId === null)) &&
    Array.isArray(value.usageSnapshots) &&
    isRecord(value.usageRead) &&
    Array.isArray(value.usageExcludedPackages) &&
    Array.isArray(value.timeGoals)
  );
}

export function isStoredV13(value: unknown): value is StoredV13 {
  return isStoredV13Shape(value, 13, false);
}

export function isStoredV14(value: unknown): value is StoredV14 {
  return isStoredV13Shape(value, 14, true);
}

function hasTaskListsAndTaskFields(value: unknown): boolean {
  return (
    isRecord(value) &&
    Array.isArray(value.taskLists) &&
    value.taskLists.every(taskList => isRecord(taskList) && typeof taskList.id === 'string' && typeof taskList.name === 'string' &&
      typeof taskList.isArchived === 'boolean' && isIsoDate(taskList.createdAt) && isIsoDate(taskList.updatedAt)) &&
    Array.isArray(value.tasks) &&
    value.tasks.every(task => isRecord(task) && typeof task.listId === 'string' &&
      (task.priority === 'low' || task.priority === 'normal' || task.priority === 'high'))
  );
}

export function isStoredV15(value: unknown): value is StoredV15 {
  return isStoredV13Shape(value, 15, true) && hasTaskListsAndTaskFields(value);
}

export function isStoredV16(value: unknown): value is StoredV16 {
  if (!isStoredV13Shape(value, 16, true) || !hasTaskListsAndTaskFields(value) || !isRecord(value) ||
      !Array.isArray(value.taskRecurrences) || !Array.isArray(value.tasks)) {
    return false;
  }
  return value.taskRecurrences.every(rule => isRecord(rule) && typeof rule.id === 'string' && typeof rule.title === 'string' &&
      typeof rule.details === 'string' && typeof rule.priority === 'string' && typeof rule.listId === 'string' &&
      (rule.cadence === 'day' || rule.cadence === 'week' || rule.cadence === 'month') && Number.isSafeInteger(rule.interval) &&
      typeof rule.nextOccurrenceLocalDate === 'string' &&
      (rule.missedOccurrencePolicy === 'all' || rule.missedOccurrencePolicy === 'one' || rule.missedOccurrencePolicy === 'skip') &&
      typeof rule.isPaused === 'boolean' && isIsoDate(rule.createdAt) && isIsoDate(rule.updatedAt)) &&
    value.tasks.every(task => isRecord(task) && (typeof task.recurrenceRuleId === 'string' || task.recurrenceRuleId === null))
}

export function isStoredV17(value: unknown): value is StoredV17 {
  if (!isStoredV13Shape(value, 17, true) || !hasTaskListsAndTaskFields(value) || !isRecord(value) ||
      !Array.isArray(value.taskRecurrences) || !Array.isArray(value.tasks)) {
    return false;
  }
  return value.taskRecurrences.every(rule => isRecord(rule) && typeof rule.id === 'string' && typeof rule.title === 'string' &&
      typeof rule.details === 'string' && typeof rule.priority === 'string' && typeof rule.listId === 'string' &&
      (rule.cadence === 'day' || rule.cadence === 'week' || rule.cadence === 'month') && Number.isSafeInteger(rule.interval) &&
      typeof rule.nextOccurrenceLocalDate === 'string' &&
      (rule.missedOccurrencePolicy === 'all' || rule.missedOccurrencePolicy === 'one' || rule.missedOccurrencePolicy === 'skip') &&
      typeof rule.isPaused === 'boolean' && isIsoDate(rule.createdAt) && isIsoDate(rule.updatedAt)) &&
    value.tasks.every(task => isRecord(task) && (typeof task.recurrenceRuleId === 'string' || task.recurrenceRuleId === null) &&
      (task.reminderAtMillis === null || (typeof task.reminderAtMillis === 'number' && Number.isSafeInteger(task.reminderAtMillis) && task.reminderAtMillis > 0)));
}

function isNotificationSettings(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  const start = value.quietHoursStartLocalTime;
  const end = value.quietHoursEndLocalTime;
  const snoozeDurationMinutes = value.snoozeDurationMinutes;
  if ((start !== null && typeof start !== 'string') || (end !== null && typeof end !== 'string')) {
    return false;
  }
  if (snoozeDurationMinutes !== undefined && !isValidTaskReminderSnoozeDuration(snoozeDurationMinutes)) {
    return false;
  }
  const normalizedStart = typeof start === 'string' ? start : '';
  const normalizedEnd = typeof end === 'string' ? end : '';
  return normalizedStart === normalizedStart.trim() && normalizedEnd === normalizedEnd.trim() &&
    validateQuietHoursDraft(normalizedStart, normalizedEnd) === null;
}

export function isStoredV18(value: unknown): value is StoredV18 {
  if (!isStoredV13Shape(value, 18, true) || !hasTaskListsAndTaskFields(value) || !isRecord(value) ||
      !Array.isArray(value.taskRecurrences) || !Array.isArray(value.tasks) || !isNotificationSettings(value.notificationSettings)) {
    return false;
  }
  return value.taskRecurrences.every(rule => isRecord(rule) && typeof rule.id === 'string' && typeof rule.title === 'string' &&
      typeof rule.details === 'string' && typeof rule.priority === 'string' && typeof rule.listId === 'string' &&
      (rule.cadence === 'day' || rule.cadence === 'week' || rule.cadence === 'month') && Number.isSafeInteger(rule.interval) &&
      typeof rule.nextOccurrenceLocalDate === 'string' &&
      (rule.missedOccurrencePolicy === 'all' || rule.missedOccurrencePolicy === 'one' || rule.missedOccurrencePolicy === 'skip') &&
      typeof rule.isPaused === 'boolean' && isIsoDate(rule.createdAt) && isIsoDate(rule.updatedAt)) &&
    value.tasks.every(task => isRecord(task) && (typeof task.recurrenceRuleId === 'string' || task.recurrenceRuleId === null) &&
      (task.reminderAtMillis === null || (typeof task.reminderAtMillis === 'number' && Number.isSafeInteger(task.reminderAtMillis) && task.reminderAtMillis > 0)));
}

export function isStoredV19(value: unknown): value is AppData {
  const notificationSettings = isRecord(value) ? value.notificationSettings : null;
  if (!isStoredV13Shape(value, 19, true) || !hasTaskListsAndTaskFields(value) || !isRecord(value) ||
      !Array.isArray(value.taskRecurrences) || !isNotificationSettings(notificationSettings) ||
      !isValidTaskReminderSnoozeDuration((notificationSettings as Record<string, unknown>).snoozeDurationMinutes)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  const taskRecurrences = record.taskRecurrences as unknown[];
  const tasks = record.tasks as unknown[];
  return taskRecurrences.every(rule => isRecord(rule) && typeof rule.id === 'string' && typeof rule.title === 'string' &&
      typeof rule.details === 'string' && typeof rule.priority === 'string' && typeof rule.listId === 'string' &&
      (rule.cadence === 'day' || rule.cadence === 'week' || rule.cadence === 'month') && Number.isSafeInteger(rule.interval) &&
      typeof rule.nextOccurrenceLocalDate === 'string' &&
      (rule.missedOccurrencePolicy === 'all' || rule.missedOccurrencePolicy === 'one' || rule.missedOccurrencePolicy === 'skip') &&
      typeof rule.isPaused === 'boolean' && isIsoDate(rule.createdAt) && isIsoDate(rule.updatedAt)) &&
    tasks.every(task => isRecord(task) && (typeof task.recurrenceRuleId === 'string' || task.recurrenceRuleId === null) &&
      (task.reminderAtMillis === null || (typeof task.reminderAtMillis === 'number' && Number.isSafeInteger(task.reminderAtMillis) && task.reminderAtMillis > 0)));
}

function legacyCategoryId(name: string): string {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  return `category_${slug || 'uncategorized'}`;
}

export function migrateV1ToV2(value: StoredV1): StoredV2 {
  const next = emptyAppData();
  const categories = new Map(next.categories.map(category => [category.name.toLowerCase(), category]));
  const migratedMoney: MoneyEntry[] = value.money.map(entry => {
    const name = entry.category.trim() || 'Uncategorized';
    const key = name.toLowerCase();
    let category = categories.get(key);
    if (!category) {
      category = {
        id: legacyCategoryId(name),
        name,
        kind: entry.kind,
        isArchived: false,
      };
      categories.set(key, category);
    }
    return {
      ...entry,
      accountId: 'account_everyday',
      categoryId: category.id,
    };
  });

  return {
    schemaVersion: 2,
    mainCurrency: next.mainCurrency,
    money: migratedMoney,
    accounts: next.accounts,
    categories: [...categories.values()] as MoneyCategory[],
    notes: value.notes,
    tasks: value.tasks,
    usageSnapshots: [],
    usageRead: next.usageRead,
  };
}

export function migrateV2ToV3(value: StoredV2): StoredV3 {
  return {
    ...value,
    schemaVersion: 3,
    usageExcludedPackages: [],
    timeGoals: [],
  };
}

export function migrateV3ToV4(value: StoredV3): StoredV4 {
  return {
    ...value,
    schemaVersion: 4,
    transfers: [],
  };
}

export function migrateV4ToV5(value: StoredV4): StoredV5 {
  return {
    ...value,
    schemaVersion: 5,
    splits: [],
  };
}

export function migrateV5ToV6(value: StoredV5): StoredV6 {
  return {
    ...value,
    schemaVersion: 6,
    budgets: [],
  };
}

export function migrateV6ToV7(value: StoredV6): StoredV7 {
  return {
    ...value,
    schemaVersion: 7,
    budgets: value.budgets.map(budget => ({...budget, rollover: 'none'})),
  };
}

export function migrateV7ToV8(value: StoredV7): StoredV8 {
  return {
    ...value,
    schemaVersion: 8,
    recurrences: [],
  };
}

export function migrateV8ToV9(value: StoredV8): StoredV9 {
  return {
    ...value,
    schemaVersion: 9,
    recurrences: value.recurrences.map(rule => ({...rule, missedOccurrencePolicy: 'all'})),
  };
}

export function migrateV9ToV10(value: StoredV9): StoredV10 {
  return {
    ...value,
    schemaVersion: 10,
    attachments: [],
  };
}

export function migrateV10ToV11(value: StoredV10): StoredV11 {
  return {
    ...value,
    schemaVersion: 11,
    notes: value.notes.map(note => ({...note, tags: []})),
  };
}

export function migrateV11ToV12(value: StoredV11): StoredV12 {
  return {
    ...value,
    schemaVersion: 12,
    notes: value.notes.map(note => ({...note, isArchived: false})),
  };
}

export function migrateV12ToV13(value: StoredV12): StoredV13 {
  return {
    ...value,
    schemaVersion: 13,
    savedSearches: [],
  };
}

export function migrateV13ToV14(value: StoredV13): StoredV14 {
  return {
    ...value,
    schemaVersion: 14,
    tasks: value.tasks.map(task => ({...task, sourceNoteId: null})),
  };
}

export function migrateV14ToV15(value: StoredV14): StoredV15 {
  const inbox = {
    id: 'task_list_inbox',
    name: 'Inbox',
    isArchived: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
  return {
    ...value,
    schemaVersion: 15,
    taskLists: [inbox],
    tasks: value.tasks.map(task => ({...task, priority: 'normal' as const, listId: inbox.id, recurrenceRuleId: null})),
  };
}

export function migrateV15ToV16(value: StoredV15): StoredV16 {
  return {
    ...value,
    schemaVersion: 16,
    taskRecurrences: [],
    tasks: value.tasks.map(task => ({...task, recurrenceRuleId: null})),
  };
}

export function migrateV16ToV17(value: StoredV16): StoredV17 {
  return {
    ...value,
    schemaVersion: 17,
    tasks: value.tasks.map(task => ({...task, reminderAtMillis: null})),
  };
}

export function migrateV17ToV18(value: StoredV17): AppData {
  return migrateV18ToV19({
    ...value,
    schemaVersion: 18,
    notificationSettings: {
      quietHoursStartLocalTime: null,
      quietHoursEndLocalTime: null,
    },
  });
}

export function migrateV18ToV19(value: StoredV18): AppData {
  return {
    ...value,
    schemaVersion: 19,
    notificationSettings: {
      ...value.notificationSettings,
      snoozeDurationMinutes: DEFAULT_TASK_REMINDER_SNOOZE_DURATION_MINUTES,
    },
  };
}

function migrateV12ToV14(value: StoredV12): StoredV14 {
  return migrateV13ToV14(migrateV12ToV13(value));
}

function migrateV12ToV15(value: StoredV12): StoredV15 {
  return migrateV14ToV15(migrateV12ToV14(value));
}

function migrateV12ToV16(value: StoredV12): StoredV16 {
  return migrateV15ToV16(migrateV12ToV15(value));
}

function migrateV12ToV17(value: StoredV12): AppData {
  return migrateV17ToV18(migrateV16ToV17(migrateV12ToV16(value)));
}

function migrateV12ToV18(value: StoredV12): AppData {
  return migrateV12ToV17(value);
}

export function migrateStoredData(value: unknown): AppData | null {
  if (isStoredV19(value)) {
    return value;
  }
  if (isStoredV18(value)) {
    return migrateV18ToV19(value);
  }
  if (isStoredV17(value)) {
    return migrateV17ToV18(value);
  }
  if (isStoredV16(value)) {
    return migrateV17ToV18(migrateV16ToV17(value));
  }
  if (isStoredV15(value)) {
    return migrateV17ToV18(migrateV16ToV17(migrateV15ToV16(value)));
  }
  if (isStoredV14(value)) {
    return migrateV17ToV18(migrateV16ToV17(migrateV15ToV16(migrateV14ToV15(value))));
  }
  if (isStoredV13(value)) {
    return migrateV17ToV18(migrateV16ToV17(migrateV15ToV16(migrateV14ToV15(migrateV13ToV14(value)))));
  }
  if (isStoredV12(value)) {
    return migrateV12ToV18(value);
  }
  if (isStoredV11(value)) {
    return migrateV17ToV18(migrateV16ToV17(migrateV15ToV16(migrateV14ToV15(migrateV12ToV14(migrateV11ToV12(value))))));
  }
  if (isStoredV10(value)) {
    return migrateV17ToV18(migrateV16ToV17(migrateV15ToV16(migrateV14ToV15(migrateV12ToV14(migrateV11ToV12(migrateV10ToV11(value)))))));
  }
  if (isStoredV9(value)) {
    return migrateV12ToV17(migrateV11ToV12(migrateV10ToV11(migrateV9ToV10(value))));
  }
  if (isStoredV8(value)) {
    return migrateV12ToV17(migrateV11ToV12(migrateV10ToV11(migrateV9ToV10(migrateV8ToV9(value)))));
  }
  if (isStoredV7(value)) {
    return migrateV12ToV17(migrateV11ToV12(migrateV10ToV11(migrateV9ToV10(migrateV8ToV9(migrateV7ToV8(value))))));
  }
  if (isStoredV6(value)) {
    return migrateV12ToV17(migrateV11ToV12(migrateV10ToV11(migrateV9ToV10(migrateV8ToV9(migrateV7ToV8(migrateV6ToV7(value)))))));
  }
  if (isStoredV5(value)) {
    return migrateV12ToV17(migrateV11ToV12(migrateV10ToV11(migrateV9ToV10(migrateV8ToV9(migrateV7ToV8(migrateV6ToV7(migrateV5ToV6(value))))))));
  }
  if (isStoredV4(value)) {
    return migrateV12ToV17(migrateV11ToV12(migrateV10ToV11(migrateV9ToV10(migrateV8ToV9(migrateV7ToV8(migrateV6ToV7(migrateV5ToV6(migrateV4ToV5(value)))))))));
  }
  if (isStoredV3(value)) {
    return migrateV12ToV17(migrateV11ToV12(migrateV10ToV11(migrateV9ToV10(migrateV8ToV9(migrateV7ToV8(migrateV6ToV7(migrateV5ToV6(migrateV4ToV5(migrateV3ToV4(value))))))))));
  }
  if (isStoredV2(value)) {
    const v3 = migrateV2ToV3(value);
    const v4 = migrateV3ToV4(v3);
    const v5 = migrateV4ToV5(v4);
    const v6 = migrateV5ToV6(v5);
    const v7 = migrateV6ToV7(v6);
    const v8 = migrateV7ToV8(v7);
    const v9 = migrateV8ToV9(v8);
    const v10 = migrateV9ToV10(v9);
    return migrateV12ToV17(migrateV11ToV12(migrateV10ToV11(v10)));
  }
  if (isStoredV1(value)) {
    const v2 = migrateV1ToV2(value);
    const v3 = migrateV2ToV3(v2);
    const v4 = migrateV3ToV4(v3);
    const v5 = migrateV4ToV5(v4);
    const v6 = migrateV5ToV6(v5);
    const v7 = migrateV6ToV7(v6);
    const v8 = migrateV7ToV8(v7);
    const v9 = migrateV8ToV9(v8);
    const v10 = migrateV9ToV10(v9);
    return migrateV12ToV17(migrateV11ToV12(migrateV10ToV11(v10)));
  }
  return null;
}
