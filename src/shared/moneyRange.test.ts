import {getMoneyRange, isInMoneyRange, type MoneyRangeSelection} from './moneyRange';

describe('money ranges', () => {
  const now = new Date(2026, 6, 26, 15, 30);

  it('returns no range for all', () => {
    expect(getMoneyRange(now, {period: 'all'})).toBeNull();
  });

  it('preserves the existing local day, week, and month boundaries', () => {
    expect(getMoneyRange(now, {period: 'day'})).toEqual({
      start: new Date(2026, 6, 26),
      end: new Date(2026, 6, 27),
    });
    expect(getMoneyRange(now, {period: 'week'})).toEqual({
      start: new Date(2026, 6, 20),
      end: new Date(2026, 6, 27),
    });
    expect(getMoneyRange(now, {period: 'month'})).toEqual({
      start: new Date(2026, 6, 1),
      end: new Date(2026, 7, 1),
    });
  });

  it('uses the configured local week start', () => {
    expect(getMoneyRange(now, {period: 'week'}, 0)).toEqual({
      start: new Date(2026, 6, 26),
      end: new Date(2026, 7, 2),
    });
  });

  it('returns the current local calendar year', () => {
    expect(getMoneyRange(new Date(2026, 11, 31, 23, 59), {period: 'year'})).toEqual({
      start: new Date(2026, 0, 1),
      end: new Date(2027, 0, 1),
    });
  });

  it('uses strict local custom boundaries with an exclusive end', () => {
    const selection: MoneyRangeSelection = {
      period: 'custom',
      startLocalDate: '2026-07-01',
      endLocalDate: '2026-08-01',
    };
    const range = getMoneyRange(now, selection);

    expect(range).toEqual({
      start: new Date(2026, 6, 1),
      end: new Date(2026, 7, 1),
    });
    expect(isInMoneyRange(new Date(2026, 6, 1, 0, 0).toISOString(), range)).toBe(true);
    expect(isInMoneyRange(new Date(2026, 7, 1, 0, 0).toISOString(), range)).toBe(false);
  });

  it('supports an empty custom interval and rejects invalid boundaries', () => {
    const empty = getMoneyRange(now, {
      period: 'custom',
      startLocalDate: '2026-07-26',
      endLocalDate: '2026-07-26',
    });
    expect(empty?.start).toEqual(empty?.end);
    expect(isInMoneyRange(new Date(2026, 6, 26, 12, 0).toISOString(), empty)).toBe(false);

    expect(() => getMoneyRange(now, {
      period: 'custom',
      startLocalDate: '2026-07-27',
      endLocalDate: '2026-07-26',
    })).toThrow(/end.*start/i);
    expect(() => getMoneyRange(now, {
      period: 'custom',
      startLocalDate: '2026-02-30',
      endLocalDate: '2026-03-01',
    })).toThrow(/YYYY-MM-DD/i);
  });

  it('keeps daylight-saving boundaries at local midnight', () => {
    const range = getMoneyRange(new Date(2026, 2, 29, 15, 30), {period: 'day'});
    expect(range?.start.getHours()).toBe(0);
    expect(range?.end.getHours()).toBe(0);
    expect(range?.end.getDate()).toBe(30);
  });
});
