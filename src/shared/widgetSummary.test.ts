import {emptyAppData} from '../types/domain';
import {buildWidgetSummary, widgetSummaryText} from './widgetSummary';

describe('widget summary', () => {
  it('projects only open tasks and active notes', () => {
    const data = emptyAppData();
    data.tasks = [
      {...data.tasks[0], status: 'open'},
      {...data.tasks[0], id: 'completed', status: 'completed'},
    ];
    data.notes = [
      {...data.notes[0], isArchived: false},
      {...data.notes[0], id: 'archived', isArchived: true},
    ];

    expect(buildWidgetSummary(data)).toEqual({openTaskCount: 1, activeNoteCount: 1});
  });

  it('uses deterministic singular and plural labels', () => {
    expect(widgetSummaryText({openTaskCount: 0, activeNoteCount: 0})).toBe('0 open tasks · 0 active notes');
    expect(widgetSummaryText({openTaskCount: 1, activeNoteCount: 1})).toBe('1 open task · 1 active note');
  });
});
