import type {Task} from '../types/domain';
import {createTaskRecord, deleteTaskRecord, filterTasks, updateTaskRecord, validateTaskDraft} from './taskLifecycle';

describe('task lifecycle rules', () => {
  it('validates and creates a task with scheduling fields', () => {
    const draft = {
      title: ' Pay the bill ',
      details: 'Before lunch',
      dueLocalDate: '2026-07-28',
      priority: 'high' as const,
      listId: 'task_list_inbox',
    };

    expect(validateTaskDraft(draft, new Set(['task_list_inbox']))).toBeNull();
    expect(createTaskRecord(draft, 'task_1', '2026-07-27T12:00:00.000Z', 'note_1')).toEqual({
      id: 'task_1',
      title: 'Pay the bill',
      details: 'Before lunch',
      status: 'open',
      dueLocalDate: '2026-07-28',
      priority: 'high',
      listId: 'task_list_inbox',
      sourceNoteId: 'note_1',
      createdAt: '2026-07-27T12:00:00.000Z',
      updatedAt: '2026-07-27T12:00:00.000Z',
    });
  });

  it('rejects invalid task fields and preserves identity on update', () => {
    const valid = {title: 'Task', details: '', dueLocalDate: null, priority: 'normal' as const, listId: 'task_list_inbox'};
    expect(validateTaskDraft({...valid, title: ' '}, new Set(['task_list_inbox']))).toMatch(/title/i);
    expect(validateTaskDraft({...valid, dueLocalDate: '2026-02-30'}, new Set(['task_list_inbox']))).toMatch(/date/i);
    expect(validateTaskDraft({...valid, priority: 'urgent' as never}, new Set(['task_list_inbox']))).toMatch(/priority/i);
    expect(validateTaskDraft({...valid, listId: 'missing'}, new Set(['task_list_inbox']))).toMatch(/list/i);

    const task = createTaskRecord(valid, 'task_1', '2026-07-27T12:00:00.000Z', 'note_1');
    const updated = updateTaskRecord(task, {...valid, title: 'Updated', dueLocalDate: '2026-07-29', priority: 'low'}, '2026-07-27T13:00:00.000Z');
    expect(updated).toMatchObject({id: 'task_1', title: 'Updated', dueLocalDate: '2026-07-29', priority: 'low', sourceNoteId: 'note_1', createdAt: '2026-07-27T12:00:00.000Z'});
  });

  it('filters task views by one local date rule', () => {
    const base = (id: string, dueLocalDate: string | null, status: Task['status']): Task => ({
      ...createTaskRecord(
        {title: id, details: '', dueLocalDate, priority: 'normal', listId: 'task_list_inbox'},
        id,
        '2026-07-27T00:00:00.000Z',
      ),
      status,
    });

    const tasks = [
      base('overdue', '2026-07-26', 'open'),
      base('today', '2026-07-27', 'open'),
      base('upcoming', '2026-07-28', 'open'),
      base('done', '2026-07-27', 'completed'),
      base('undated', null, 'open'),
    ];

    expect(filterTasks(tasks, 'overdue', '2026-07-27').map(task => task.id)).toEqual(['overdue']);
    expect(filterTasks(tasks, 'today', '2026-07-27').map(task => task.id)).toEqual(['today']);
    expect(filterTasks(tasks, 'upcoming', '2026-07-27').map(task => task.id)).toEqual(['upcoming']);
    expect(filterTasks(tasks, 'completed', '2026-07-27').map(task => task.id)).toEqual(['done']);
    expect(filterTasks(tasks, 'all', '2026-07-27').map(task => task.id)).toEqual(['overdue', 'today', 'upcoming', 'done', 'undated']);
  });

  it('deletes exactly one existing task and rejects a missing task', () => {
    const first = createTaskRecord({title: 'First', details: '', dueLocalDate: null, priority: 'normal', listId: 'task_list_inbox'}, 'task_1', '2026-07-27T00:00:00.000Z');
    const second = createTaskRecord({title: 'Second', details: '', dueLocalDate: null, priority: 'normal', listId: 'task_list_inbox'}, 'task_2', '2026-07-27T00:00:00.000Z');

    expect(deleteTaskRecord([first, second], first.id)).toEqual([second]);
    expect(() => deleteTaskRecord([first], 'missing')).toThrow(/no longer exists/i);
  });
});
