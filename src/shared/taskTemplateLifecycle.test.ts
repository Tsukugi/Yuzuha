import {createTaskTemplateRecord, createTaskFromTemplateRecord, deleteTaskTemplateRecord, setTaskTemplateArchived, updateTaskTemplateRecord, validateTaskTemplateDraft, validateTaskTemplateName} from './taskTemplateLifecycle';

describe('task template lifecycle rules', () => {
  const draft = {
    name: 'Weekly review',
    title: 'Review the week',
    details: 'Check the important items and choose one next action.',
    priority: 'high' as const,
    listId: 'task_list_inbox',
    projectId: null,
  };

  it('validates, creates, updates, archives, and deletes templates', () => {
    expect(validateTaskTemplateDraft({...draft, name: ''}, new Set(['task_list_inbox']), new Set())).toMatch(/name is required/i);
    expect(validateTaskTemplateDraft(draft, new Set(['task_list_inbox']), new Set())).toBeNull();
    const template = createTaskTemplateRecord(draft, 'template_weekly', '2026-07-27T12:00:00.000Z');
    expect(validateTaskTemplateName([template], {...draft, name: ' WEEKLY REVIEW '}, null)).toMatch(/unique/i);
    const updated = updateTaskTemplateRecord(template, {...draft, name: 'Daily review', priority: 'normal'}, '2026-07-27T13:00:00.000Z');
    expect(updated).toMatchObject({name: 'Daily review', priority: 'normal', updatedAt: '2026-07-27T13:00:00.000Z'});
    const archived = setTaskTemplateArchived([updated], updated.id, true, '2026-07-27T14:00:00.000Z');
    expect(archived[0]).toMatchObject({isArchived: true, updatedAt: '2026-07-27T14:00:00.000Z'});
    expect(deleteTaskTemplateRecord(archived, updated.id)).toHaveLength(0);
  });

  it('creates a normal task from a template without unrelated links', () => {
    const template = createTaskTemplateRecord(draft, 'template_weekly', '2026-07-27T12:00:00.000Z');
    const task = createTaskFromTemplateRecord(template, 'task_from_template', '2026-07-27T15:00:00.000Z', 4);
    expect(task).toMatchObject({
      id: 'task_from_template',
      title: 'Review the week',
      details: 'Check the important items and choose one next action.',
      status: 'open',
      priority: 'high',
      listId: 'task_list_inbox',
      projectId: null,
      parentTaskId: null,
      sourceNoteId: null,
      recurrenceRuleId: null,
      reminderAtMillis: null,
      sortOrder: 4,
    });
  });
});
