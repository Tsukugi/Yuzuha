import type {Note} from '../types/domain';
import {createTaskFromNote, getTaskSourceLabel} from './noteTask';

describe('note to task conversion', () => {
  it('creates an open linked task without changing the source note', () => {
    const note: Note = {
      id: 'note_1',
      title: 'Send the proposal',
      body: 'Email the final proposal before Friday.',
      tags: ['work'],
      isPinned: true,
      isArchived: false,
      createdAt: '2026-07-27T00:00:00.000Z',
      updatedAt: '2026-07-27T00:00:00.000Z',
    };
    const sourceBefore = {...note, tags: [...note.tags]};

    expect(createTaskFromNote(note, 'task_1', '2026-07-27T12:00:00.000Z')).toEqual({
      id: 'task_1',
      title: 'Send the proposal',
      details: 'Email the final proposal before Friday.',
      status: 'open',
      dueLocalDate: null,
      priority: 'normal',
      listId: 'task_list_inbox',
      sourceNoteId: 'note_1',
      createdAt: '2026-07-27T12:00:00.000Z',
      updatedAt: '2026-07-27T12:00:00.000Z',
    });
    expect(note).toEqual(sourceBefore);
  });

  it('shows a deleted-source label when the linked note is gone', () => {
    const task = createTaskFromNote({
      id: 'note_1',
      title: 'Send the proposal',
      body: '',
      tags: [],
      isPinned: false,
      isArchived: false,
      createdAt: '2026-07-27T00:00:00.000Z',
      updatedAt: '2026-07-27T00:00:00.000Z',
    }, 'task_1', '2026-07-27T12:00:00.000Z');

    expect(getTaskSourceLabel(task, [])).toBe('From note: Deleted note');
    expect(getTaskSourceLabel({...task, sourceNoteId: null}, [])).toBeNull();
  });
});
