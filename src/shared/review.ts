import {getLocalDateKeys, isInPeriod, localDateKey, type PeriodRange} from './period';
import {sumUsage} from './usage';
import type {AppData} from '../types/domain';

export type ReviewData = Pick<AppData, 'mainCurrency' | 'money' | 'tasks' | 'notes' | 'usageSnapshots' | 'usageRead'>;

export interface ReviewSummary {
  expenseMinor: number;
  incomeMinor: number;
  appTimeSeconds: number;
  openDueTaskCount: number;
  completedTaskCount: number;
  overdueOpenTaskCount: number;
  updatedNoteCount: number;
  activeNoteCount: number;
  usagePermission: AppData['usageRead']['permission'];
  usageLastReadAt: string | null;
}

export function buildReviewSummary(data: ReviewData, range: PeriodRange, now = new Date()): ReviewSummary {
  const localDates = getLocalDateKeys(range);
  const today = localDateKey(now);
  const periodMoney = data.money.filter(entry => entry.currency === data.mainCurrency && isInPeriod(entry.occurredAt, range));
  const openDueTaskCount = data.tasks.filter(
    task => task.status === 'open' && task.dueLocalDate !== null && localDates.has(task.dueLocalDate),
  ).length;
  const completedTaskCount = data.tasks.filter(task => task.status === 'completed' && isInPeriod(task.updatedAt, range)).length;
  const overdueOpenTaskCount = data.tasks.filter(task => task.status === 'open' && task.dueLocalDate !== null && task.dueLocalDate < today).length;
  const updatedNoteCount = data.notes.filter(note => !note.isArchived && isInPeriod(note.updatedAt, range)).length;

  return {
    expenseMinor: periodMoney.filter(entry => entry.kind === 'expense').reduce((total, entry) => total + entry.amountMinor, 0),
    incomeMinor: periodMoney.filter(entry => entry.kind === 'income').reduce((total, entry) => total + entry.amountMinor, 0),
    appTimeSeconds: sumUsage(data.usageSnapshots, localDates),
    openDueTaskCount,
    completedTaskCount,
    overdueOpenTaskCount,
    updatedNoteCount,
    activeNoteCount: data.notes.filter(note => !note.isArchived).length,
    usagePermission: data.usageRead.permission,
    usageLastReadAt: data.usageRead.lastReadAt,
  };
}
