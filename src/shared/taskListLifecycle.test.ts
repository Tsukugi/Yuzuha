import {createTaskRecord} from './taskLifecycle';
import {
  TASK_LIST_MAX_NAME_LENGTH,
  TASK_INBOX_LIST_ID,
  createTaskListRecord,
  deleteTaskListRecord,
  setTaskListArchived,
  updateTaskListRecord,
  validateTaskListDraft,
} from './taskListLifecycle';
import type {TaskList, TaskRecurrenceRule} from '../types/domain';

describe('task list lifecycle rules', () => {
  const inbox: TaskList = {
    id: TASK_INBOX_LIST_ID,
    name: 'Inbox',
    isArchived: false,
    createdAt: '2026-07-27T00:00:00.000Z',
    updatedAt: '2026-07-27T00:00:00.000Z',
  };

  it('validates and creates a trimmed custom list', () => {
    expect(validateTaskListDraft({name: ' Work '}, [inbox])).toBeNull();
    expect(createTaskListRecord({name: ' Work '}, 'task_list_work', '2026-07-27T12:00:00.000Z', [inbox])).toEqual({
      id: 'task_list_work',
      name: 'Work',
      isArchived: false,
      createdAt: '2026-07-27T12:00:00.000Z',
      updatedAt: '2026-07-27T12:00:00.000Z',
    });
  });

  it('rejects blank, overlong, and duplicate names and preserves identity on update', () => {
    const work = createTaskListRecord({name: 'Work'}, 'task_list_work', '2026-07-27T12:00:00.000Z', [inbox]);
    const lists = [inbox, work];

    expect(validateTaskListDraft({name: ' '}, lists)).toMatch(/name/i);
    expect(validateTaskListDraft({name: 'x'.repeat(TASK_LIST_MAX_NAME_LENGTH + 1)}, lists)).toMatch(/characters/i);
    expect(validateTaskListDraft({name: ' inbox '}, lists)).toMatch(/already exists/i);
    expect(validateTaskListDraft({name: ' WORK '}, lists, work.id)).toBeNull();

    expect(updateTaskListRecord(work, {name: ' Personal '}, '2026-07-27T13:00:00.000Z', lists)).toMatchObject({
      id: work.id,
      name: 'Personal',
      createdAt: work.createdAt,
      updatedAt: '2026-07-27T13:00:00.000Z',
      isArchived: false,
    });
  });

  it('protects Inbox, toggles archive state, and deletes only unused custom lists', () => {
    const work = createTaskListRecord({name: 'Work'}, 'task_list_work', '2026-07-27T12:00:00.000Z', [inbox]);
    const lists = [inbox, work];
    const task = createTaskRecord({title: 'Task', details: '', dueLocalDate: null, priority: 'normal', listId: work.id}, 'task_1', '2026-07-27T12:00:00.000Z');

    expect(() => setTaskListArchived(lists, TASK_INBOX_LIST_ID, true)).toThrow(/Inbox/i);
    expect(setTaskListArchived(lists, work.id, true).find(list => list.id === work.id)?.isArchived).toBe(true);
    expect(setTaskListArchived(setTaskListArchived(lists, work.id, true), work.id, false).find(list => list.id === work.id)?.isArchived).toBe(false);
    expect(() => deleteTaskListRecord(lists, [task], work.id)).toThrow(/tasks use/i);
    const recurrence: TaskRecurrenceRule = {
      id: 'rule_1',
      title: 'Review',
      details: '',
      priority: 'normal',
      listId: work.id,
      cadence: 'week',
      interval: 1,
      nextOccurrenceLocalDate: '2026-07-27',
      missedOccurrencePolicy: 'all',
      reminderLocalTime: null,
      isPaused: false,
      createdAt: '2026-07-27T12:00:00.000Z',
      updatedAt: '2026-07-27T12:00:00.000Z',
    };
    expect(() => deleteTaskListRecord(lists, [], work.id, [recurrence])).toThrow(/recurring tasks use/i);
    expect(deleteTaskListRecord(lists, [], work.id)).toEqual([inbox]);
    expect(() => deleteTaskListRecord(lists, [], TASK_INBOX_LIST_ID)).toThrow(/Inbox/i);
  });
});
