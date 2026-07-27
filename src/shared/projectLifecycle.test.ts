import {createProjectRecord, deleteProjectRecord, updateProjectRecord, validateProjectDraft} from './projectLifecycle';

describe('project lifecycle rules', () => {
  const valid = {name: 'Website refresh', status: 'active' as const};

  it('validates, creates, and updates a project', () => {
    expect(validateProjectDraft(valid)).toBeNull();
    expect(createProjectRecord(valid, 'project_1', '2026-07-27T12:00:00.000Z')).toEqual({
      id: 'project_1',
      name: 'Website refresh',
      status: 'active',
      isArchived: false,
      createdAt: '2026-07-27T12:00:00.000Z',
      updatedAt: '2026-07-27T12:00:00.000Z',
    });

    const project = createProjectRecord(valid, 'project_1', '2026-07-27T12:00:00.000Z');
    expect(updateProjectRecord(project, {name: 'Updated', status: 'completed'}, '2026-07-27T13:00:00.000Z')).toMatchObject({
      id: 'project_1',
      name: 'Updated',
      status: 'completed',
      isArchived: false,
      createdAt: '2026-07-27T12:00:00.000Z',
    });
  });

  it('rejects invalid drafts and deletes only unused projects', () => {
    expect(validateProjectDraft({name: ' ', status: 'active'})).toMatch(/name/i);
    expect(validateProjectDraft({name: 'Project', status: 'paused' as never})).toMatch(/status/i);
    const project = createProjectRecord(valid, 'project_1', '2026-07-27T12:00:00.000Z');
    expect(() => deleteProjectRecord([project], [{id: 'task_1', projectId: project.id} as never], project.id)).toThrow(/tasks/i);
    expect(deleteProjectRecord([project], [], project.id)).toEqual([]);
    expect(() => deleteProjectRecord([], [], project.id)).toThrow(/no longer exists/i);
  });
});
