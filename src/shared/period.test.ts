import {getLocalDateKeys, getPeriodRange, isInPeriod, localDateKey} from './period';

describe('period helpers', () => {
  const now = new Date(2026, 6, 26, 15, 30);

  it('returns the local day range', () => {
    const range = getPeriodRange(now, 'day');
    expect(range.start).toEqual(new Date(2026, 6, 26));
    expect(range.end).toEqual(new Date(2026, 6, 27));
  });

  it('starts weeks on Monday', () => {
    const range = getPeriodRange(now, 'week');
    expect(range.start).toEqual(new Date(2026, 6, 20));
  });

  it('filters a timestamp using an inclusive start and exclusive end', () => {
    const range = getPeriodRange(now, 'month');
    expect(isInPeriod(new Date(2026, 6, 1, 0, 0).toISOString(), range)).toBe(true);
    expect(isInPeriod(new Date(2026, 7, 1, 0, 0).toISOString(), range)).toBe(false);
  });

  it('formats a local date key', () => {
    expect(localDateKey(now)).toBe('2026-07-26');
  });

  it('returns each local date in a range', () => {
    expect(getLocalDateKeys(getPeriodRange(now, 'week')).size).toBe(7);
  });
});
