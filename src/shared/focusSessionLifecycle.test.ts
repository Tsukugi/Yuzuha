import {createAppGroupRecord, updateAppGroupRecord, validateAppGroupDraft} from './appGroupLifecycle';
import {createFocusSessionRecord, finishFocusSession, focusSessionDurationSeconds, validateFocusSessionDraft} from './focusSessionLifecycle';

describe('focus session lifecycle rules', () => {
  const appGroup = createAppGroupRecord(
    {name: 'Deep work', packageNames: ['com.editor', 'com.browser']},
    'app_group_1',
    '2026-07-27T09:00:00.000Z',
  );
  const draft = {
    taskId: 'task_1',
    projectId: 'project_1',
    noteId: 'note_1',
    appGroupId: appGroup.id,
  };

  it('validates links and creates one active session', () => {
    expect(validateFocusSessionDraft(draft, {
      taskIds: new Set(['task_1']),
      projectIds: new Set(['project_1']),
      noteIds: new Set(['note_1']),
      appGroupIds: new Set([appGroup.id]),
    })).toBeNull();
    expect(createFocusSessionRecord(draft, 'focus_1', '2026-07-27T09:00:00.000Z')).toEqual({
      id: 'focus_1',
      startedAt: '2026-07-27T09:00:00.000Z',
      endedAt: null,
      status: 'active',
      stopReason: null,
      taskId: 'task_1',
      projectId: 'project_1',
      noteId: 'note_1',
      appGroupId: 'app_group_1',
      createdAt: '2026-07-27T09:00:00.000Z',
      updatedAt: '2026-07-27T09:00:00.000Z',
    });
  });

  it('rejects missing links and invalid app groups', () => {
    expect(validateFocusSessionDraft({...draft, taskId: 'missing'}, {
      taskIds: new Set(['task_1']),
      projectIds: new Set(['project_1']),
      noteIds: new Set(['note_1']),
      appGroupIds: new Set([appGroup.id]),
    })).toMatch(/task/i);
    expect(validateAppGroupDraft({name: ' ', packageNames: ['com.editor']})).toMatch(/name/i);
    expect(validateAppGroupDraft({name: 'Group', packageNames: ['com.editor', 'com.editor']})).toMatch(/unique/i);
  });

  it('finishes sessions once and calculates elapsed seconds deterministically', () => {
    const active = createFocusSessionRecord({taskId: null, projectId: null, noteId: null, appGroupId: null}, 'focus_2', '2026-07-27T09:00:00.000Z');
    expect(focusSessionDurationSeconds(active, '2026-07-27T08:59:59.000Z')).toBe(0);
    expect(focusSessionDurationSeconds(active, '2026-07-27T09:42:09.000Z')).toBe(2529);
    const completed = finishFocusSession(active, 'completed', '2026-07-27T09:42:09.000Z');
    expect(completed).toMatchObject({status: 'completed', stopReason: 'completed', endedAt: '2026-07-27T09:42:09.000Z'});
    expect(() => finishFocusSession(completed, 'manual', '2026-07-27T09:43:00.000Z')).toThrow(/already finished/i);
    expect(() => finishFocusSession(active, 'manual', '2026-07-27T08:59:59.000Z')).toThrow(/after start/i);
  });
});

describe('app group lifecycle rules', () => {
  it('trims and deduplicates package names when creating a group', () => {
    expect(createAppGroupRecord({name: '  Writing  ', packageNames: [' com.editor ', 'com.browser']}, 'app_group_2', '2026-07-27T09:00:00.000Z')).toEqual({
      id: 'app_group_2',
      name: 'Writing',
      packageNames: ['com.editor', 'com.browser'],
      isArchived: false,
      createdAt: '2026-07-27T09:00:00.000Z',
      updatedAt: '2026-07-27T09:00:00.000Z',
    });
  });

  it('updates a group without changing its identity or archive state', () => {
    const original = {...createAppGroupRecord({name: 'Writing', packageNames: ['com.editor']}, 'app_group_3', '2026-07-27T09:00:00.000Z'), isArchived: true};
    expect(updateAppGroupRecord(original, {name: 'Research', packageNames: [' com.browser ', 'com.reader']}, '2026-07-27T10:00:00.000Z')).toEqual({
      id: 'app_group_3',
      name: 'Research',
      packageNames: ['com.browser', 'com.reader'],
      isArchived: true,
      createdAt: '2026-07-27T09:00:00.000Z',
      updatedAt: '2026-07-27T10:00:00.000Z',
    });
  });
});
