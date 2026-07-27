import {createTaskRecord} from './taskLifecycle';
import {linkTaskParent, promoteSubtasksAfterDelete, validateTaskParentLink} from './taskSubtask';

describe('task subtask rules', () => {
  it('accepts a same-list parent and rejects self, cross-list, and cyclic links', () => {
    const parent = createTaskRecord({title: 'Parent', details: '', dueLocalDate: null, priority: 'normal', listId: 'task_list_inbox'}, 'task_parent', '2026-07-27T12:00:00.000Z');
    const child = createTaskRecord({title: 'Child', details: '', dueLocalDate: null, priority: 'normal', listId: 'task_list_inbox'}, 'task_child', '2026-07-27T12:00:00.000Z');
    const otherListChild = createTaskRecord({title: 'Other list', details: '', dueLocalDate: null, priority: 'normal', listId: 'task_list_other'}, 'task_other', '2026-07-27T12:00:00.000Z');
    const linkedChild = linkTaskParent(child, parent.id, '2026-07-27T13:00:00.000Z');
    expect(validateTaskParentLink(child.id, parent.id, [parent, child])).toBeNull();
    expect(linkedChild.parentTaskId).toBe(parent.id);
    expect(validateTaskParentLink(parent.id, parent.id, [parent, child])).toMatch(/own parent/i);
    expect(validateTaskParentLink(child.id, otherListChild.id, [parent, child, otherListChild])).toMatch(/same list/i);
    expect(validateTaskParentLink(parent.id, child.id, [parent, linkedChild])).toMatch(/cycle/i);
  });

  it('clears a deleted parent link and keeps children', () => {
    const parent = createTaskRecord({title: 'Parent', details: '', dueLocalDate: null, priority: 'normal', listId: 'task_list_inbox'}, 'task_parent', '2026-07-27T12:00:00.000Z');
    const child = linkTaskParent(
      createTaskRecord({title: 'Child', details: '', dueLocalDate: null, priority: 'normal', listId: 'task_list_inbox'}, 'task_child', '2026-07-27T12:00:00.000Z'),
      parent.id,
      '2026-07-27T13:00:00.000Z',
    );
    const promoted = promoteSubtasksAfterDelete([parent, child], parent.id, '2026-07-27T14:00:00.000Z');
    expect(promoted).toHaveLength(1);
    expect(promoted[0]).toMatchObject({id: child.id, parentTaskId: null, updatedAt: '2026-07-27T14:00:00.000Z'});
  });
});
