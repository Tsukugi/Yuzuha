import {createTaskRecord} from './taskLifecycle';
import {createTaskDependencyRecord, getBlockingTaskIds, validateTaskDependencyDraft} from './taskDependency';
import type {Task} from '../types/domain';

function makeTask(id: string): Task {
  return createTaskRecord(
    {title: id, details: '', dueLocalDate: null, priority: 'normal', listId: 'task_list_inbox'},
    id,
    '2026-07-27T12:00:00.000Z',
  );
}

describe('task dependencies', () => {
  it('accepts a prerequisite and rejects duplicate, self, and cyclic links', () => {
    const tasks = [makeTask('task_a'), makeTask('task_b'), makeTask('task_c')];
    const dependency = createTaskDependencyRecord(
      {sourceTaskId: 'task_b', dependentTaskId: 'task_a'},
      'dependency_a_b',
      '2026-07-27T12:00:00.000Z',
    );

    expect(validateTaskDependencyDraft({sourceTaskId: 'task_b', dependentTaskId: 'task_a'}, tasks, [])).toBeNull();
    expect(validateTaskDependencyDraft({sourceTaskId: 'task_b', dependentTaskId: 'task_a'}, tasks, [dependency])).toMatch(/already exists/i);
    expect(validateTaskDependencyDraft({sourceTaskId: 'task_a', dependentTaskId: 'task_a'}, tasks, [])).toMatch(/itself/i);
    expect(validateTaskDependencyDraft({sourceTaskId: 'task_a', dependentTaskId: 'task_b'}, tasks, [dependency])).toMatch(/cycle/i);
    expect(validateTaskDependencyDraft({sourceTaskId: 'task_c', dependentTaskId: 'task_a'}, tasks, [dependency])).toBeNull();
  });

  it('reports only incomplete prerequisite tasks as blockers', () => {
    const source = makeTask('task_source');
    const dependent = makeTask('task_dependent');
    const dependency = createTaskDependencyRecord(
      {sourceTaskId: source.id, dependentTaskId: dependent.id},
      'dependency_source_dependent',
      '2026-07-27T12:00:00.000Z',
    );

    expect(getBlockingTaskIds(dependent.id, [source, dependent], [dependency])).toEqual([source.id]);
    source.status = 'completed';
    expect(getBlockingTaskIds(dependent.id, [source, dependent], [dependency])).toEqual([]);
  });
});
