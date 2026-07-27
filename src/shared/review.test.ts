import {emptyAppData} from '../types/domain';
import {getPeriodRange} from './period';
import {buildReviewSummary} from './review';

describe('review summary', () => {
  it('keeps all four feature summaries on the selected range', () => {
    const data = emptyAppData();
    data.usageRead.permission = 'granted';
    data.usageRead.lastReadAt = '2026-07-26T16:00:00.000Z';
    data.money = [
      {id: 'expense-eur', kind: 'expense', amountMinor: 500, currency: 'EUR', accountId: null, categoryId: null, payeeId: null, category: 'Food', note: '', occurredAt: '2026-07-22T10:00:00.000Z', createdAt: '2026-07-22T10:00:00.000Z', updatedAt: '2026-07-22T10:00:00.000Z'},
      {id: 'income-eur', kind: 'income', amountMinor: 200, currency: 'EUR', accountId: null, categoryId: null, payeeId: null, category: 'Income', note: '', occurredAt: '2026-07-23T10:00:00.000Z', createdAt: '2026-07-23T10:00:00.000Z', updatedAt: '2026-07-23T10:00:00.000Z'},
      {id: 'expense-usd', kind: 'expense', amountMinor: 900, currency: 'USD', accountId: null, categoryId: null, payeeId: null, category: 'Food', note: '', occurredAt: '2026-07-22T10:00:00.000Z', createdAt: '2026-07-22T10:00:00.000Z', updatedAt: '2026-07-22T10:00:00.000Z'},
      {id: 'old-expense', kind: 'expense', amountMinor: 700, currency: 'EUR', accountId: null, categoryId: null, payeeId: null, category: 'Food', note: '', occurredAt: '2026-07-19T10:00:00.000Z', createdAt: '2026-07-19T10:00:00.000Z', updatedAt: '2026-07-19T10:00:00.000Z'},
    ];
    data.usageSnapshots = [
      {id: 'usage-included', packageName: 'com.chat', displayName: 'Chat', localDate: '2026-07-22', durationSeconds: 120, sourceReadAt: '2026-07-26T16:00:00.000Z', included: true},
      {id: 'usage-excluded', packageName: 'com.video', displayName: 'Video', localDate: '2026-07-22', durationSeconds: 600, sourceReadAt: '2026-07-26T16:00:00.000Z', included: false},
      {id: 'usage-old', packageName: 'com.old', displayName: 'Old', localDate: '2026-07-19', durationSeconds: 300, sourceReadAt: '2026-07-26T16:00:00.000Z', included: true},
    ];
    data.tasks = [
      {id: 'due-open', status: 'open', dueLocalDate: '2026-07-22', updatedAt: '2026-07-22T10:00:00.000Z'} as (typeof data.tasks)[number],
      {id: 'completed', status: 'completed', dueLocalDate: '2026-07-10', updatedAt: '2026-07-23T10:00:00.000Z'} as (typeof data.tasks)[number],
      {id: 'overdue', status: 'open', dueLocalDate: '2026-07-20', updatedAt: '2026-07-26T10:00:00.000Z'} as (typeof data.tasks)[number],
    ];
    data.notes = [
      {id: 'updated', title: 'Updated', body: '', tags: [], isPinned: false, isArchived: false, createdAt: '2026-07-22T10:00:00.000Z', updatedAt: '2026-07-24T10:00:00.000Z'},
      {id: 'archived', title: 'Archived', body: '', tags: [], isPinned: false, isArchived: true, createdAt: '2026-07-22T10:00:00.000Z', updatedAt: '2026-07-24T10:00:00.000Z'},
    ];

    const summary = buildReviewSummary(data, getPeriodRange(new Date(2026, 6, 26, 12), 'week'), new Date(2026, 6, 26, 12));

    expect(summary).toEqual({
      expenseMinor: 500,
      incomeMinor: 200,
      appTimeSeconds: 120,
      openDueTaskCount: 2,
      completedTaskCount: 1,
      overdueOpenTaskCount: 2,
      updatedNoteCount: 1,
      activeNoteCount: 1,
      usagePermission: 'granted',
      usageLastReadAt: '2026-07-26T16:00:00.000Z',
    });
  });

  it('uses the local calendar date for overdue tasks', () => {
    const data = emptyAppData();
    data.tasks = [{id: 'due-today', status: 'open', dueLocalDate: '2026-03-09', updatedAt: '2026-03-09T00:10:00.000Z'} as (typeof data.tasks)[number]];
    const now = new Date(2026, 2, 9, 0, 30);

    expect(buildReviewSummary(data, getPeriodRange(now, 'day'), now).overdueOpenTaskCount).toBe(0);
  });
});
