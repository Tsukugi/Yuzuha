import {emptyAppData} from '../types/domain';
import {globalSearchDestination, globalSearchNavigation, searchGlobal} from './globalSearch';

describe('global search', () => {
  it('matches supported local records by their searchable text', () => {
    const data = emptyAppData();
    data.notes.push({
      id: 'note_work',
      title: 'Planning',
      body: 'Review the contract',
      tags: ['work'],
      isPinned: false,
      isArchived: false,
      createdAt: '2026-07-27T00:00:00.000Z',
      updatedAt: '2026-07-27T00:00:00.000Z',
    });
    data.attachments.push({
      id: 'attachment_contract',
      noteId: 'note_work',
      name: 'contract.pdf',
      mimeType: 'application/pdf',
      byteSize: 12,
      sha256: 'a'.repeat(64),
      createdAt: '2026-07-27T00:00:00.000Z',
      updatedAt: '2026-07-27T00:00:00.000Z',
    });
    data.tasks.push({
      id: 'task_work',
      title: 'Call the work contact',
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
      createdAt: '2026-07-27T00:00:00.000Z',
      updatedAt: '2026-07-27T00:00:00.000Z',
    });
    data.payees.push({
      id: 'payee_work',
      name: 'Work Market',
      isArchived: false,
      createdAt: '2026-07-27T00:00:00.000Z',
      updatedAt: '2026-07-27T00:00:00.000Z',
    });
    data.money.push({
      id: 'money_work',
      kind: 'expense',
      amountMinor: 1250,
      currency: 'EUR',
      accountId: 'account_everyday',
      categoryId: 'category_food',
      payeeId: 'payee_work',
      category: 'Food',
      note: 'Work lunch',
      occurredAt: '2026-07-27T00:00:00.000Z',
      createdAt: '2026-07-27T00:00:00.000Z',
      updatedAt: '2026-07-27T00:00:00.000Z',
    });
    data.savedSearches.push({
      id: 'saved_search_work',
      name: 'Work notes',
      query: 'work',
      showArchived: false,
      createdAt: '2026-07-27T00:00:00.000Z',
      updatedAt: '2026-07-27T00:00:00.000Z',
    });
    data.projects.push({
      id: 'project_work',
      name: 'Project work',
      status: 'active',
      isArchived: false,
      createdAt: '2026-07-27T00:00:00.000Z',
      updatedAt: '2026-07-27T00:00:00.000Z',
    });
    data.appGroups.push({
      id: 'app_group_work',
      name: 'Work apps',
      packageNames: ['com.editor'],
      isArchived: false,
      createdAt: '2026-07-27T00:00:00.000Z',
      updatedAt: '2026-07-27T00:00:00.000Z',
    });
    data.focusSessions.push({
      id: 'focus_work',
      startedAt: '2026-07-27T09:00:00.000Z',
      endedAt: '2026-07-27T09:30:00.000Z',
      status: 'completed',
      stopReason: 'completed',
      taskId: 'task_work',
      projectId: 'project_work',
      noteId: 'note_work',
      appGroupId: 'app_group_work',
      createdAt: '2026-07-27T09:00:00.000Z',
      updatedAt: '2026-07-27T09:30:00.000Z',
    });
    data.taskLists.push({
      id: 'task_list_project',
      name: 'Project work',
      isArchived: false,
      createdAt: '2026-07-27T00:00:00.000Z',
      updatedAt: '2026-07-27T00:00:00.000Z',
    });

    const results = searchGlobal(data, 'CONTRACT');
    expect(results.map(result => result.kind)).toEqual(['note']);
    expect(results[0]).toMatchObject({id: 'note_work', title: 'Planning'});

    const workResults = searchGlobal(data, 'work');
    expect(workResults.map(result => result.kind)).toEqual(['money', 'note', 'project', 'app-group', 'saved-search', 'task', 'task-list', 'focus-session']);
    expect(searchGlobal(data, 'market')).toMatchObject([{kind: 'money', id: 'money_work', title: expect.stringContaining('Work Market')}]);
  });

  it('hides archived records and inaccessible app-time data by default', () => {
    const data = emptyAppData();
    data.notes.push({
      id: 'note_archived',
      title: 'Archived secret',
      body: '',
      tags: [],
      isPinned: false,
      isArchived: true,
      createdAt: '2026-07-27T00:00:00.000Z',
      updatedAt: '2026-07-27T00:00:00.000Z',
    });
    data.timeGoals.push({id: 'goal_archived', name: 'Archived secret goal', period: 'week', targetSeconds: 3600, isArchived: true});
    data.usageSnapshots.push({
      id: 'usage_secret',
      packageName: 'com.example.secret',
      displayName: 'Secret App',
      localDate: '2026-07-27',
      durationSeconds: 60,
      sourceReadAt: '2026-07-27T00:00:00.000Z',
      included: true,
    });

    expect(searchGlobal(data, 'secret')).toEqual([]);
    expect(searchGlobal(data, 'secret', {includeArchived: true}).map(result => result.kind)).toEqual(['note', 'time-goal']);

    data.usageRead.permission = 'granted';
    expect(searchGlobal(data, 'secret', {includeArchived: true}).map(result => result.kind)).toEqual(['note', 'time-goal', 'usage']);
  });

  it('searches active and archived task templates with the archived filter', () => {
    const data = emptyAppData();
    data.templates.push(
      {
        id: 'template_active',
        name: 'Morning review',
        title: 'Review today',
        details: 'Choose one next action.',
        priority: 'normal',
        listId: 'task_list_inbox',
        projectId: null,
        isArchived: false,
        createdAt: '2026-07-27T00:00:00.000Z',
        updatedAt: '2026-07-27T00:00:00.000Z',
      },
      {
        id: 'template_archived',
        name: 'Archived review',
        title: 'Review later',
        details: '',
        priority: 'low',
        listId: 'task_list_inbox',
        projectId: null,
        isArchived: true,
        createdAt: '2026-07-27T00:00:00.000Z',
        updatedAt: '2026-07-27T00:00:00.000Z',
      },
    );

    expect(searchGlobal(data, 'review').filter(result => result.kind === 'task-template').map(result => result.id)).toEqual(['template_active']);
    expect(searchGlobal(data, 'review', {includeArchived: true}).filter(result => result.kind === 'task-template').map(result => result.id)).toEqual(['template_archived', 'template_active']);
  });

  it('searches a note through an active linked target and explains the link', () => {
    const data = emptyAppData();
    data.notes.push({
      id: 'note_linked',
      title: 'Meeting notes',
      body: 'Decisions from the meeting.',
      tags: [],
      isPinned: false,
      isArchived: false,
      createdAt: '2026-07-27T00:00:00.000Z',
      updatedAt: '2026-07-27T00:00:00.000Z',
    });
    data.tasks.push({
      id: 'task_linked',
      title: 'Launch checklist',
      details: 'Confirm the release steps.',
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
      createdAt: '2026-07-27T00:00:00.000Z',
      updatedAt: '2026-07-27T00:00:00.000Z',
    });
    data.noteLinks.push({
      id: 'note_link_1',
      noteId: 'note_linked',
      targetType: 'task',
      targetId: 'task_linked',
      createdAt: '2026-07-27T00:00:00.000Z',
    });

    const noteResult = searchGlobal(data, 'launch checklist').find(result => result.kind === 'note');
    expect(noteResult).toMatchObject({id: 'note_linked', title: 'Meeting notes'});
    expect(noteResult?.detail).toContain('Linked task: Launch checklist');
  });

  it('hides archived linked target text by default and keeps deleted links explicit', () => {
    const data = emptyAppData();
    data.notes.push({
      id: 'note_links',
      title: 'Reference note',
      body: '',
      tags: [],
      isPinned: false,
      isArchived: false,
      createdAt: '2026-07-27T00:00:00.000Z',
      updatedAt: '2026-07-27T00:00:00.000Z',
    });
    data.projects.push({
      id: 'project_archived',
      name: 'Hidden plan',
      status: 'active',
      isArchived: true,
      createdAt: '2026-07-27T00:00:00.000Z',
      updatedAt: '2026-07-27T00:00:00.000Z',
    });
    data.noteLinks.push(
      {
        id: 'note_link_archived',
        noteId: 'note_links',
        targetType: 'project',
        targetId: 'project_archived',
        createdAt: '2026-07-27T00:00:00.000Z',
      },
      {
        id: 'note_link_deleted',
        noteId: 'note_links',
        targetType: 'task',
        targetId: 'task_deleted',
        createdAt: '2026-07-27T00:00:00.000Z',
      },
    );

    expect(searchGlobal(data, 'hidden plan').some(result => result.kind === 'note')).toBe(false);
    const archivedNote = searchGlobal(data, 'hidden plan', {includeArchived: true}).find(result => result.kind === 'note');
    expect(archivedNote?.detail).toContain('Linked project: Hidden plan');
    expect(searchGlobal(data, 'deleted task').some(result => result.kind === 'note')).toBe(false);
    expect(searchGlobal(data, 'task').find(result => result.kind === 'note')?.detail).toContain('Linked task: Deleted task');
  });

  it('maps every result kind to its owning feature tab', () => {
    const kinds = [
      'money', 'note', 'project', 'app-group', 'saved-search', 'task', 'task-list', 'focus-session',
      'account', 'category', 'transfer', 'split', 'budget', 'recurrence', 'time-goal', 'usage', 'task-template',
    ] as const;

    expect(kinds.map(globalSearchDestination)).toEqual([
      'money', 'notes', 'tasks', 'appTime', 'notes', 'tasks', 'tasks', 'appTime',
      'money', 'money', 'money', 'money', 'money', 'money', 'appTime', 'appTime', 'tasks',
    ]);
  });

  it('focuses money, task, note, project, template, list, and app-group results while keeping other results tab-only', () => {
    expect(globalSearchNavigation({kind: 'task', id: 'task_focus'})).toEqual({destination: 'tasks', focusTaskId: 'task_focus', focusNoteId: null, focusMoneyId: null, focusProjectId: null, focusTemplateId: null, focusListId: null, focusAppGroupId: null});
    expect(globalSearchNavigation({kind: 'note', id: 'note_focus'})).toEqual({destination: 'notes', focusTaskId: null, focusNoteId: 'note_focus', focusMoneyId: null, focusProjectId: null, focusTemplateId: null, focusListId: null, focusAppGroupId: null});
    expect(globalSearchNavigation({kind: 'money', id: 'money_focus'})).toEqual({destination: 'money', focusTaskId: null, focusNoteId: null, focusMoneyId: 'money_focus', focusProjectId: null, focusTemplateId: null, focusListId: null, focusAppGroupId: null});
    expect(globalSearchNavigation({kind: 'project', id: 'project_focus'})).toEqual({destination: 'tasks', focusTaskId: null, focusNoteId: null, focusMoneyId: null, focusProjectId: 'project_focus', focusTemplateId: null, focusListId: null, focusAppGroupId: null});
    expect(globalSearchNavigation({kind: 'task-template', id: 'template_focus'})).toEqual({destination: 'tasks', focusTaskId: null, focusNoteId: null, focusMoneyId: null, focusProjectId: null, focusTemplateId: 'template_focus', focusListId: null, focusAppGroupId: null});
    expect(globalSearchNavigation({kind: 'task-list', id: 'list_focus'})).toEqual({destination: 'tasks', focusTaskId: null, focusNoteId: null, focusMoneyId: null, focusProjectId: null, focusTemplateId: null, focusListId: 'list_focus', focusAppGroupId: null});
    expect(globalSearchNavigation({kind: 'app-group', id: 'app_group_focus'})).toEqual({destination: 'appTime', focusTaskId: null, focusNoteId: null, focusMoneyId: null, focusProjectId: null, focusTemplateId: null, focusListId: null, focusAppGroupId: 'app_group_focus'});
  });
});
