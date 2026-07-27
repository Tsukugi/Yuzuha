import {createNoteLinkRecord, noteLinkKey, validateNoteLinkDraft} from './noteLinks';
import {emptyAppData} from '../types/domain';

describe('note links', () => {
  it('validates links to current tasks, projects, money, and focus sessions', () => {
    const data = emptyAppData();
    data.notes.push({
      id: 'note_linked',
      title: 'Linked note',
      body: '',
      tags: [],
      isPinned: false,
      isArchived: false,
      createdAt: '2026-07-30T12:00:00.000Z',
      updatedAt: '2026-07-30T12:00:00.000Z',
    });
    data.tasks.push({
      id: 'task_linked',
      title: 'Linked task',
      details: '',
      status: 'open',
      dueLocalDate: null,
      priority: 'normal',
      listId: 'task_list_inbox',
      parentTaskId: null,
      sortOrder: 0,
      projectId: null,
      sourceNoteId: null,
      recurrenceRuleId: null,
      reminderAtMillis: null,
      createdAt: '2026-07-30T12:00:00.000Z',
      updatedAt: '2026-07-30T12:00:00.000Z',
    });
    data.projects.push({id: 'project_linked', name: 'Project', status: 'active', isArchived: false, createdAt: '2026-07-30T12:00:00.000Z', updatedAt: '2026-07-30T12:00:00.000Z'});
    data.money.push({
      id: 'money_linked',
      kind: 'expense',
      amountMinor: 100,
      currency: 'EUR',
      accountId: 'account_everyday',
      categoryId: 'category_food',
      payeeId: null,
      category: 'Food',
      note: '',
      occurredAt: '2026-07-30T12:00:00.000Z',
      createdAt: '2026-07-30T12:00:00.000Z',
      updatedAt: '2026-07-30T12:00:00.000Z',
    });
    data.focusSessions.push({
      id: 'focus_linked',
      startedAt: '2026-07-30T12:00:00.000Z',
      endedAt: '2026-07-30T12:30:00.000Z',
      status: 'completed',
      stopReason: 'completed',
      taskId: null,
      projectId: null,
      noteId: null,
      appGroupId: null,
      createdAt: '2026-07-30T12:00:00.000Z',
      updatedAt: '2026-07-30T12:30:00.000Z',
    });

    expect(validateNoteLinkDraft({noteId: data.notes[0]?.id ?? '', targetType: 'task', targetId: 'task_linked'}, data, [])).toBeNull();
    expect(validateNoteLinkDraft({noteId: data.notes[0]?.id ?? '', targetType: 'project', targetId: 'project_linked'}, data, [])).toBeNull();
    expect(validateNoteLinkDraft({noteId: data.notes[0]?.id ?? '', targetType: 'money', targetId: 'money_linked'}, data, [])).toBeNull();
    expect(validateNoteLinkDraft({noteId: data.notes[0]?.id ?? '', targetType: 'focus-session', targetId: 'focus_linked'}, data, [])).toBeNull();
  });

  it('rejects missing targets and duplicate links, and creates a stable record', () => {
    const data = emptyAppData();
    data.notes.push({
      id: 'note_linked',
      title: 'Linked note',
      body: '',
      tags: [],
      isPinned: false,
      isArchived: false,
      createdAt: '2026-07-30T12:00:00.000Z',
      updatedAt: '2026-07-30T12:00:00.000Z',
    });
    const noteId = data.notes[0]?.id ?? '';
    const draft = {noteId, targetType: 'task' as const, targetId: 'missing'};
    expect(validateNoteLinkDraft(draft, data, [])).toMatch(/target/i);

    const link = createNoteLinkRecord({noteId, targetType: 'task', targetId: 'task_list_inbox'}, 'note_link_1', '2026-07-30T12:00:00.000Z');
    expect(noteLinkKey(link)).toBe(`${noteId}:task:task_list_inbox`);
    expect(validateNoteLinkDraft(link, {...data, tasks: [{
      id: 'task_list_inbox',
      title: 'Task',
      details: '',
      status: 'open',
      dueLocalDate: null,
      priority: 'normal',
      listId: 'task_list_inbox',
      parentTaskId: null,
      sortOrder: 0,
      projectId: null,
      sourceNoteId: null,
      recurrenceRuleId: null,
      reminderAtMillis: null,
      createdAt: '2026-07-30T12:00:00.000Z',
      updatedAt: '2026-07-30T12:00:00.000Z',
    }]}, [link])).toMatch(/already linked/i);
  });
});
