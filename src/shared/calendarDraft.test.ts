import {validateCalendarTaskDraft} from './calendarDraft';

describe('calendar task draft', () => {
  it('accepts a dated task and keeps its text local to the draft', () => {
    expect(validateCalendarTaskDraft({title: 'Review plan', details: 'Choose one next step.', dueLocalDate: '2026-07-28'})).toBeNull();
  });

  it('rejects missing titles, invalid dates, and missing dates', () => {
    expect(validateCalendarTaskDraft({title: ' ', details: '', dueLocalDate: '2026-07-28'})).toMatch(/title/i);
    expect(validateCalendarTaskDraft({title: 'Review', details: '', dueLocalDate: '2026-02-30'})).toMatch(/valid due date/i);
    expect(validateCalendarTaskDraft({title: 'Review', details: '', dueLocalDate: ''})).toMatch(/required/i);
  });
});
