import type {Note, Task} from '../types/domain';
import {TASK_DEFAULT_PRIORITY, TASK_INBOX_LIST_ID} from './taskLifecycle';

export function createTaskFromNote(note: Note, id: string, timestamp: string): Task {
  return {
    id,
    title: note.title,
    details: note.body,
    status: 'open',
    dueLocalDate: null,
    priority: TASK_DEFAULT_PRIORITY,
    listId: TASK_INBOX_LIST_ID,
    sourceNoteId: note.id,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function getTaskSourceLabel(task: Task, notes: Note[]): string | null {
  if (task.sourceNoteId === null) {
    return null;
  }
  return `From note: ${notes.find(note => note.id === task.sourceNoteId)?.title ?? 'Deleted note'}`;
}
