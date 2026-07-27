import {isValidLocalDate} from './moneyRecurrence';

export interface CalendarTaskDraft {
  title: string;
  details: string;
  dueLocalDate: string;
}

export function validateCalendarTaskDraft(draft: CalendarTaskDraft): string | null {
  if (typeof draft.title !== 'string' || !draft.title.trim()) {
    return 'Task title is required before adding it to the calendar.';
  }
  if (typeof draft.details !== 'string') {
    return 'Task details are invalid.';
  }
  if (typeof draft.dueLocalDate !== 'string' || !isValidLocalDate(draft.dueLocalDate)) {
    return 'A valid due date is required before adding the task to the calendar.';
  }
  return null;
}
