import {aggregateUsage, aggregateUsagePeriod, assignUsageRangeDate, getLocalDayRanges, sumUsage} from './usage';

describe('usage aggregation', () => {
  it('splits a selected local period into bounded day queries', () => {
    const range = {
      start: new Date(2026, 6, 27),
      end: new Date(2026, 7, 3),
    };
    const days = getLocalDayRanges(range);

    expect(days).toHaveLength(7);
    expect(days[0]).toEqual({start: new Date(2026, 6, 27), end: new Date(2026, 6, 28)});
    expect(days[6]).toEqual({start: new Date(2026, 7, 2), end: new Date(2026, 7, 3)});
  });

  it('groups records by app and local date', () => {
    const snapshots = aggregateUsage(
      [
        {packageName: 'com.chat', displayName: 'Chat', durationSeconds: 60, beginTimeMillis: new Date(2026, 6, 26, 10).getTime()},
        {packageName: 'com.chat', displayName: 'Chat', durationSeconds: 90, beginTimeMillis: new Date(2026, 6, 26, 12).getTime()},
      ],
      '2026-07-26T14:00:00.000Z',
    );
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].durationSeconds).toBe(150);
    expect(sumUsage(snapshots, new Set(['2026-07-26']))).toBe(150);
  });

  it('keeps daily query results on their queried local dates', () => {
    const snapshots = aggregateUsagePeriod(
      [
        {
          records: [{packageName: 'com.chat', displayName: 'Chat', durationSeconds: 60, beginTimeMillis: 0}],
          rangeStartMillis: new Date(2026, 6, 26).getTime(),
        },
        {
          records: [{packageName: 'com.chat', displayName: 'Chat', durationSeconds: 90, beginTimeMillis: 0}],
          rangeStartMillis: new Date(2026, 6, 27).getTime(),
        },
      ],
      '2026-07-27T12:00:00.000Z',
    );

    expect(snapshots.map(snapshot => snapshot.localDate).sort()).toEqual(['2026-07-26', '2026-07-27']);
    expect(snapshots.reduce((total, snapshot) => total + snapshot.durationSeconds, 0)).toBe(150);
  });

  it('does not include zero or excluded records', () => {
    const snapshots = aggregateUsage(
      [{packageName: 'com.zero', displayName: 'Zero', durationSeconds: 0, beginTimeMillis: Date.now()}],
      '2026-07-26T14:00:00.000Z',
    );
    expect(snapshots).toHaveLength(0);

    expect(
      sumUsage(
        [
          {
            id: 'usage_included',
            packageName: 'com.included',
            displayName: 'Included',
            localDate: '2026-07-26',
            durationSeconds: 120,
            sourceReadAt: '2026-07-26T14:00:00.000Z',
            included: true,
          },
          {
            id: 'usage_excluded',
            packageName: 'com.excluded',
            displayName: 'Excluded',
            localDate: '2026-07-26',
            durationSeconds: 300,
            sourceReadAt: '2026-07-26T14:00:00.000Z',
            included: false,
          },
        ],
        new Set(['2026-07-26']),
      ),
    ).toBe(120);
  });

  it('assigns records from a single-day query to that queried local day', () => {
    const start = new Date(2026, 6, 26).getTime();
    const normalized = assignUsageRangeDate(
      [{packageName: 'com.chat', displayName: 'Chat', durationSeconds: 60, beginTimeMillis: 0}],
      start,
    );
    expect(normalized[0].beginTimeMillis).toBe(start);
  });
});
