import {createTaskRecord} from './taskLifecycle';
import {buildTaskAgenda} from './taskAgenda';
import type {Task} from '../types/domain';

function makeTask(id: string, dueLocalDate: string | null, status: Task['status'] = 'open'): Task {
  return {
    ...createTaskRecord(
      {title: id, details: '', dueLocalDate, priority: 'normal', listId: 'task_list_inbox'},
      id,
      '2026-07-27T12:00:00.000Z',
    ),
    status,
  };
}

describe('task agenda', () => {
  it('groups dated tasks into the requested local window and preserves task order', () => {
    const tasks = [
      makeTask('today_open', '2026-07-27'),
      makeTask('tomorrow_done', '2026-07-28', 'completed'),
      makeTask('tomorrow_open', '2026-07-28'),
      makeTask('undated', null),
      makeTask('outside', '2026-07-31'),
    ];

    expect(buildTaskAgenda(tasks, '2026-07-27', 3)).toEqual([
      {localDate: '2026-07-27', tasks: [tasks[0]]},
      {localDate: '2026-07-28', tasks: [tasks[1], tasks[2]]},
    ]);
  });

  it('rejects invalid or unbounded agenda windows', () => {
    const tasks: Task[] = [];

    expect(() => buildTaskAgenda(tasks, '2026-02-30', 14)).toThrow(/start date/i);
    expect(() => buildTaskAgenda(tasks, '2026-07-27', 0)).toThrow(/number of days/i);
    expect(() => buildTaskAgenda(tasks, '2026-07-27', 32)).toThrow(/number of days/i);
  });
});
