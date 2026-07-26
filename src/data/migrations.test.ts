import {migrateV2ToV3} from './migrations';
import type {MoneyCategory} from '../types/domain';

describe('schema migrations', () => {
  it('adds Phase 3 exclusion and time-goal fields to schema 2 data', () => {
    const data = migrateV2ToV3({
      schemaVersion: 2,
      mainCurrency: 'EUR',
      money: [],
      accounts: [],
      categories: [] as MoneyCategory[],
      notes: [],
      tasks: [],
      usageSnapshots: [],
      usageRead: {
        permission: 'unknown',
        lastReadAt: null,
        rangeStartMillis: null,
        rangeEndMillis: null,
        errorCode: null,
      },
    });

    expect(data.schemaVersion).toBe(3);
    expect(data.usageExcludedPackages).toEqual([]);
    expect(data.timeGoals).toEqual([]);
  });
});

