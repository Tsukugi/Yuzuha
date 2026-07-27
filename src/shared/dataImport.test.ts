import {buildJsonExport} from './dataExport';
import {JsonImportError, parseJsonImport} from './dataImport';
import {emptyAppData} from '../types/domain';
import {createTaskDependencyRecord} from './taskDependency';
import {createTaskRecord} from './taskLifecycle';

describe('JSON restore validation', () => {
  it('parses a current export and reports record counts', () => {
    const data = emptyAppData();
    data.notes.push({
      id: 'note_1',
      title: 'Keep this',
      body: 'Local note',
      tags: ['local'],
      isPinned: false,
      isArchived: false,
      createdAt: '2026-07-26T00:00:00.000Z',
      updatedAt: '2026-07-26T00:00:00.000Z',
    });
    data.attachments.push({
      id: 'attachment_1',
      noteId: 'note_1',
      name: 'reference.txt',
      mimeType: 'text/plain',
      byteSize: 24,
      sha256: 'a'.repeat(64),
      createdAt: '2026-07-26T00:00:00.000Z',
      updatedAt: '2026-07-26T00:00:00.000Z',
    });
    data.savedSearches.push({
      id: 'saved_search_1',
      name: 'Local notes',
      query: 'local',
      showArchived: false,
      createdAt: '2026-07-26T00:00:00.000Z',
      updatedAt: '2026-07-26T00:00:00.000Z',
    });
    data.tasks.push({
      id: 'task_1',
      title: 'Follow up',
      details: 'The source note may already be deleted.',
      status: 'open',
      dueLocalDate: null,
      priority: 'normal',
      listId: 'task_list_inbox',
      parentTaskId: null,
      sortOrder: 0,
      projectId: null,
      sourceNoteId: 'note_missing',
      recurrenceRuleId: null,
      reminderAtMillis: null,
      createdAt: '2026-07-26T00:00:00.000Z',
      updatedAt: '2026-07-26T00:00:00.000Z',
    });

    const preview = parseJsonImport(buildJsonExport(data, '2026-07-26T12:00:00.000Z'));

    expect(preview.data).toEqual(data);
    expect(preview.recordCounts.notes).toBe(1);
    expect(preview.recordCounts.attachments).toBe(1);
    expect(preview.recordCounts.accounts).toBe(1);
    expect(preview.recordCounts.savedSearches).toBe(1);
    expect(preview.recordCounts.taskLists).toBe(1);
    expect(preview.totalRecords).toBe(13);
  });

  it('rejects current data without the recurring reminder setting', () => {
    const data = emptyAppData();
    const envelope = JSON.parse(buildJsonExport(data, '2026-07-26T12:00:00.000Z')) as Record<string, unknown>;
    const currentData = envelope.data as Record<string, unknown>;
    const notificationSettings = currentData.notificationSettings as Record<string, unknown>;
    delete notificationSettings.recurringTaskRemindersEnabled;

    expect(() => parseJsonImport(JSON.stringify(envelope))).toThrow(/app header/i);
  });

  it('rejects current data without the week-start setting', () => {
    const data = emptyAppData();
    const envelope = JSON.parse(buildJsonExport(data, '2026-07-26T12:00:00.000Z')) as Record<string, unknown>;
    const currentData = envelope.data as Record<string, unknown>;
    delete currentData.weekStartsOn;

    expect(() => parseJsonImport(JSON.stringify(envelope))).toThrow(/app header/i);
  });

  it('imports a valid task dependency and counts it', () => {
    const data = emptyAppData();
    data.tasks.push(
      {
        id: 'task_source',
        title: 'Source',
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
        createdAt: '2026-07-26T00:00:00.000Z',
        updatedAt: '2026-07-26T00:00:00.000Z',
      },
      {
        id: 'task_dependent',
        title: 'Dependent',
        details: '',
        status: 'open',
        dueLocalDate: null,
        priority: 'normal',
        listId: 'task_list_inbox',
        parentTaskId: null,
        sortOrder: 1,
        projectId: null,
        sourceNoteId: null,
        recurrenceRuleId: null,
        reminderAtMillis: null,
        createdAt: '2026-07-26T00:00:00.000Z',
        updatedAt: '2026-07-26T00:00:00.000Z',
      },
    );
    data.taskDependencies.push(createTaskDependencyRecord(
      {sourceTaskId: 'task_source', dependentTaskId: 'task_dependent'},
      'dependency_1',
      '2026-07-26T00:00:00.000Z',
    ));

    const preview = parseJsonImport(buildJsonExport(data, '2026-07-26T12:00:00.000Z'));

    expect(preview.data.taskDependencies).toEqual(data.taskDependencies);
    expect(preview.recordCounts.taskDependencies).toBe(1);
  });

  it('rejects current data without the task dependency collection', () => {
    const data = emptyAppData();
    const envelope = JSON.parse(buildJsonExport(data, '2026-07-26T12:00:00.000Z')) as {data: Record<string, unknown>};
    delete envelope.data.taskDependencies;

    expect(() => parseJsonImport(JSON.stringify({...envelope, exportSchemaVersion: 1, appSchemaVersion: data.schemaVersion, exportedAt: '2026-07-26T12:00:00.000Z'}))).toThrow(/task dependencies/i);
  });

  it('rejects saved searches that are not stored in normalized form', () => {
    const data = emptyAppData();
    data.savedSearches.push({
      id: 'saved_search_1',
      name: ' Local notes ',
      query: ' local ',
      showArchived: false,
      createdAt: '2026-07-26T00:00:00.000Z',
      updatedAt: '2026-07-26T00:00:00.000Z',
    });

    expect(() => parseJsonImport(buildJsonExport(data, '2026-07-26T12:00:00.000Z'))).toThrow(JsonImportError);
  });

  it('rejects task lists that are not stored in normalized form', () => {
    const data = emptyAppData();
    data.taskLists.push({
      id: 'task_list_work',
      name: ' Inbox ',
      isArchived: false,
      createdAt: '2026-07-26T00:00:00.000Z',
      updatedAt: '2026-07-26T00:00:00.000Z',
    });

    expect(() => parseJsonImport(buildJsonExport(data, '2026-07-26T12:00:00.000Z'))).toThrow(/task list/i);
  });

  it('rejects duplicate manual task order within one list', () => {
    const data = emptyAppData();
    data.tasks = [
      createTaskRecord({title: 'First', details: '', dueLocalDate: null, priority: 'normal', listId: 'task_list_inbox'}, 'task_first', '2026-07-26T00:00:00.000Z', null, 0),
      createTaskRecord({title: 'Second', details: '', dueLocalDate: null, priority: 'normal', listId: 'task_list_inbox'}, 'task_second', '2026-07-26T00:00:00.000Z', null, 0),
    ];

    expect(() => parseJsonImport(buildJsonExport(data, '2026-07-26T12:00:00.000Z'))).toThrow(/manual order/i);
  });

  it('imports a project and a task linked to it', () => {
    const data = emptyAppData();
    data.projects.push({
      id: 'project_1',
      name: 'Website refresh',
      status: 'active',
      isArchived: false,
      createdAt: '2026-07-26T00:00:00.000Z',
      updatedAt: '2026-07-26T00:00:00.000Z',
    });
    data.tasks.push(createTaskRecord(
      {title: 'Draft page', details: '', dueLocalDate: null, priority: 'normal', listId: 'task_list_inbox', projectId: 'project_1'},
      'task_1',
      '2026-07-26T00:00:00.000Z',
      null,
      0,
      new Set(['project_1']),
    ));

    const preview = parseJsonImport(buildJsonExport(data, '2026-07-26T12:00:00.000Z'));

    expect(preview.data.projects).toEqual(data.projects);
    expect(preview.data.tasks[0]?.projectId).toBe('project_1');
    expect(preview.recordCounts.projects).toBe(1);
  });

  it('imports a task template and counts it', () => {
    const data = emptyAppData();
    data.templates.push({
      id: 'template_1',
      name: 'Weekly review',
      title: 'Review the week',
      details: 'Choose one next action.',
      priority: 'high',
      listId: 'task_list_inbox',
      projectId: null,
      isArchived: false,
      createdAt: '2026-07-26T00:00:00.000Z',
      updatedAt: '2026-07-26T00:00:00.000Z',
    });

    const preview = parseJsonImport(buildJsonExport(data, '2026-07-26T12:00:00.000Z'));

    expect(preview.data.templates).toEqual(data.templates);
    expect(preview.recordCounts.templates).toBe(1);
  });

  it('imports app groups and a completed focus session with links', () => {
    const data = emptyAppData();
    data.appGroups.push({
      id: 'app_group_1',
      name: 'Deep work',
      packageNames: ['com.editor'],
      isArchived: false,
      createdAt: '2026-07-26T00:00:00.000Z',
      updatedAt: '2026-07-26T00:00:00.000Z',
    });
    data.focusSessions.push({
      id: 'focus_1',
      startedAt: '2026-07-26T10:00:00.000Z',
      endedAt: '2026-07-26T10:30:00.000Z',
      status: 'completed',
      stopReason: 'completed',
      taskId: null,
      projectId: null,
      noteId: null,
      appGroupId: 'app_group_1',
      createdAt: '2026-07-26T10:00:00.000Z',
      updatedAt: '2026-07-26T10:30:00.000Z',
    });

    const preview = parseJsonImport(buildJsonExport(data, '2026-07-26T12:00:00.000Z'));

    expect(preview.data.appGroups).toEqual(data.appGroups);
    expect(preview.data.focusSessions).toEqual(data.focusSessions);
    expect(preview.recordCounts.appGroups).toBe(1);
    expect(preview.recordCounts.focusSessions).toBe(1);
  });

  it('rejects task reminders that are not positive safe integers', () => {
    const data = emptyAppData();
    data.tasks.push({
      id: 'task_1',
      title: 'Follow up',
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
      reminderAtMillis: -1,
      createdAt: '2026-07-26T00:00:00.000Z',
      updatedAt: '2026-07-26T00:00:00.000Z',
    });

    expect(() => parseJsonImport(buildJsonExport(data, '2026-07-26T12:00:00.000Z'))).toThrow(JsonImportError);
  });

  it('rejects recurring task reminder times that are not strict HH:mm', () => {
    const data = emptyAppData();
    data.taskRecurrences.push({
      id: 'rule_1',
      title: 'Review',
      details: '',
      priority: 'normal',
      listId: 'task_list_inbox',
      cadence: 'week',
      interval: 1,
      nextOccurrenceLocalDate: '2026-07-27',
      missedOccurrencePolicy: 'all',
      reminderLocalTime: '9:30' as never,
      isPaused: false,
      createdAt: '2026-07-26T00:00:00.000Z',
      updatedAt: '2026-07-26T00:00:00.000Z',
    });

    expect(() => parseJsonImport(buildJsonExport(data, '2026-07-26T12:00:00.000Z'))).toThrow(JsonImportError);
  });

  it('rejects an old app schema export', () => {
    const data = emptyAppData();
    const legacy: Record<string, unknown> = {...data, schemaVersion: 7};
    delete legacy.recurrences;

    expect(() => parseJsonImport(JSON.stringify({
      exportSchemaVersion: 1,
      appSchemaVersion: 7,
      exportedAt: '2026-07-26T12:00:00.000Z',
      data: legacy,
    }))).toThrow(/app data version/i);
  });

  it('rejects malformed JSON and duplicate record IDs', () => {
    expect(() => parseJsonImport('{not-json')).toThrow(JsonImportError);

    const data = emptyAppData();
    data.notes.push(
      {
        id: 'note_1',
        title: 'First',
        body: '',
        tags: [],
        isPinned: false,
        isArchived: false,
        createdAt: '2026-07-26T00:00:00.000Z',
        updatedAt: '2026-07-26T00:00:00.000Z',
      },
      {
        id: 'note_1',
        title: 'Second',
        body: '',
        tags: [],
        isPinned: false,
        isArchived: false,
        createdAt: '2026-07-26T00:00:00.000Z',
        updatedAt: '2026-07-26T00:00:00.000Z',
      },
    );

    expect(() => parseJsonImport(buildJsonExport(data, '2026-07-26T12:00:00.000Z'))).toThrow(/duplicate/i);
  });

  it('rejects duplicate payee names regardless of case', () => {
    const data = emptyAppData();
    data.payees.push(
      {id: 'payee_one', name: 'Market', isArchived: false, createdAt: '2026-07-26T00:00:00.000Z', updatedAt: '2026-07-26T00:00:00.000Z'},
      {id: 'payee_two', name: 'market', isArchived: false, createdAt: '2026-07-26T00:00:00.000Z', updatedAt: '2026-07-26T00:00:00.000Z'},
    );

    expect(() => parseJsonImport(buildJsonExport(data, '2026-07-26T12:00:00.000Z'))).toThrow(/payee.*duplicate/i);
  });

  it('rejects a split whose lines do not equal the parent amount', () => {
    const data = emptyAppData();
    data.money.push({
      id: 'money_1',
      kind: 'expense',
      amountMinor: 1000,
      currency: 'EUR',
      accountId: 'account_everyday',
      categoryId: null,
      payeeId: null,
      category: 'Split',
      note: '',
      occurredAt: '2026-07-26T12:00:00.000Z',
      createdAt: '2026-07-26T12:00:00.000Z',
      updatedAt: '2026-07-26T12:00:00.000Z',
      splitId: 'split_1',
    });
    data.splits.push({
      id: 'split_1',
      parentEntryId: 'money_1',
      lines: [
        {id: 'line_1', categoryId: 'category_food', category: 'Food', amountMinor: 400, note: ''},
        {id: 'line_2', categoryId: 'category_health', category: 'Health', amountMinor: 500, note: ''},
      ],
      createdAt: '2026-07-26T12:00:00.000Z',
      updatedAt: '2026-07-26T12:00:00.000Z',
    });

    expect(() => parseJsonImport(buildJsonExport(data, '2026-07-26T12:00:00.000Z'))).toThrow(/parent amount/i);
  });

  it('rejects an attachment that points to an unknown note', () => {
    const data = emptyAppData();
    data.attachments.push({
      id: 'attachment_1',
      noteId: 'missing_note',
      name: 'reference.txt',
      mimeType: 'text/plain',
      byteSize: 24,
      sha256: 'a'.repeat(64),
      createdAt: '2026-07-26T00:00:00.000Z',
      updatedAt: '2026-07-26T00:00:00.000Z',
    });

    expect(() => parseJsonImport(buildJsonExport(data, '2026-07-26T12:00:00.000Z'))).toThrow(/attachment .* note/i);
  });

  it('rejects a note with more than the attachment limit', () => {
    const data = emptyAppData();
    data.notes.push({
      id: 'note_1',
      title: 'Keep this',
      body: '',
      tags: [],
      isPinned: false,
      isArchived: false,
      createdAt: '2026-07-26T00:00:00.000Z',
      updatedAt: '2026-07-26T00:00:00.000Z',
    });
    data.attachments = Array.from({length: 11}, (_, index) => ({
      id: `attachment_${index}`,
      noteId: 'note_1',
      name: `file-${index}.txt`,
      mimeType: 'text/plain',
      byteSize: 1,
      sha256: String(index % 10).repeat(64),
      createdAt: '2026-07-26T00:00:00.000Z',
      updatedAt: '2026-07-26T00:00:00.000Z',
    }));

    expect(() => parseJsonImport(buildJsonExport(data, '2026-07-26T12:00:00.000Z'))).toThrow(/more than 10 attachments/i);
  });

  it('rejects a note with malformed lifecycle state', () => {
    const data = emptyAppData();
    data.notes.push({
      id: 'note_1',
      title: 'Keep this',
      body: '',
      tags: [],
      isPinned: false,
      isArchived: false,
      createdAt: '2026-07-26T00:00:00.000Z',
      updatedAt: '2026-07-26T00:00:00.000Z',
    });
    (data.notes[0] as unknown as {isArchived: unknown}).isArchived = 'yes';

    expect(() => parseJsonImport(buildJsonExport(data, '2026-07-26T12:00:00.000Z'))).toThrow(/invalid fields/i);
  });
});
