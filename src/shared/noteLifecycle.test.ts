import {filterNotes, updateNoteRecord, validateNoteDraft} from './noteLifecycle';
import type {Note} from '../types/domain';

const notes: Note[] = [
  {
    id: 'note_regular',
    title: 'Regular note',
    body: 'Body text',
    tags: ['work'],
    isPinned: false,
    isArchived: false,
    createdAt: '2026-07-27T10:00:00.000Z',
    updatedAt: '2026-07-27T10:00:00.000Z',
  },
  {
    id: 'note_pinned',
    title: 'Pinned note',
    body: '',
    tags: ['idea'],
    isPinned: true,
    isArchived: false,
    createdAt: '2026-07-27T09:00:00.000Z',
    updatedAt: '2026-07-27T09:00:00.000Z',
  },
  {
    id: 'note_archived',
    title: 'Archived note',
    body: '',
    tags: ['old'],
    isPinned: false,
    isArchived: true,
    createdAt: '2026-07-27T08:00:00.000Z',
    updatedAt: '2026-07-27T08:00:00.000Z',
  },
];

describe('note lifecycle rules', () => {
  it('filters archived notes by default and places pinned notes first', () => {
    expect(filterNotes(notes, '', false).map(note => note.id)).toEqual(['note_pinned', 'note_regular']);
    expect(filterNotes(notes, 'old', true).map(note => note.id)).toEqual(['note_archived']);
  });

  it('validates drafts and preserves lifecycle flags when editing', () => {
    expect(validateNoteDraft({title: ' ', body: '', tags: []})).toMatch(/title/i);
    expect(validateNoteDraft({title: 'Updated', body: 'Body', tags: ['work']})).toBeNull();
    expect(updateNoteRecord(notes[2], {title: 'Restored text', body: 'New body', tags: ['new']}, '2026-07-27T12:00:00.000Z')).toEqual({
      ...notes[2],
      title: 'Restored text',
      body: 'New body',
      tags: ['new'],
      updatedAt: '2026-07-27T12:00:00.000Z',
    });
  });
});
