import {noteMatchesQuery, normalizeNoteTags, validateNoteTags} from './noteSearch';
import type {Note} from '../types/domain';

const note: Note = {
  id: 'note_1',
  title: 'Project Journal',
  body: 'A short plan for the next release.',
  tags: ['work', 'planning'],
  isPinned: false,
  isArchived: false,
  createdAt: '2026-07-27T12:00:00.000Z',
  updatedAt: '2026-07-27T12:00:00.000Z',
};

describe('note tags and search', () => {
  it('normalizes comma-separated tags into unique lowercase values', () => {
    expect(normalizeNoteTags(' Work, ideas, work, ,Reading ')).toEqual(['work', 'ideas', 'reading']);
  });

  it('rejects duplicate, uppercase, and over-limit stored tags', () => {
    expect(validateNoteTags(['work', 'work'])).toBe(false);
    expect(validateNoteTags(['Work'])).toBe(false);
    expect(validateNoteTags(Array.from({length: 21}, (_, index) => `tag${index}`))).toBe(false);
  });

  it('matches title, body, and tags case-insensitively', () => {
    expect(noteMatchesQuery(note, '')).toBe(true);
    expect(noteMatchesQuery(note, 'JOURNAL')).toBe(true);
    expect(noteMatchesQuery(note, 'RELEASE')).toBe(true);
    expect(noteMatchesQuery(note, 'PLANNING')).toBe(true);
    expect(noteMatchesQuery(note, 'missing')).toBe(false);
  });

  it('matches attachment names case-insensitively when supplied', () => {
    expect(noteMatchesQuery(note, 'PDF', ['Quarterly-Plan.PDF'])).toBe(true);
    expect(noteMatchesQuery(note, 'missing', ['Quarterly-Plan.PDF'])).toBe(false);
  });
});
