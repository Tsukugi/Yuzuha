import type {AppData} from '../types/domain';

export interface WidgetSummary {
  openTaskCount: number;
  activeNoteCount: number;
}

export function buildWidgetSummary(data: Pick<AppData, 'tasks' | 'notes'>): WidgetSummary {
  return {
    openTaskCount: data.tasks.filter(task => task.status === 'open').length,
    activeNoteCount: data.notes.filter(note => !note.isArchived).length,
  };
}

export function widgetSummaryText(summary: WidgetSummary): string {
  const taskLabel = `${summary.openTaskCount} open task${summary.openTaskCount === 1 ? '' : 's'}`;
  const noteLabel = `${summary.activeNoteCount} active note${summary.activeNoteCount === 1 ? '' : 's'}`;
  return `${taskLabel} · ${noteLabel}`;
}
