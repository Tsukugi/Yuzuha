import {migrateV2ToV3, migrateV3ToV4, migrateV4ToV5} from './migrations';
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
    expect(migrateV3ToV4(data).transfers).toEqual([]);
  });

  it('adds an empty transfer collection when opening schema 3 data', () => {
    const data = migrateV3ToV4({
      schemaVersion: 3,
      mainCurrency: 'EUR',
      money: [],
      accounts: [],
      categories: [],
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
      usageExcludedPackages: [],
      timeGoals: [],
    });

    expect(data.schemaVersion).toBe(4);
    expect(data.transfers).toEqual([]);
    expect(migrateV4ToV5(data).splits).toEqual([]);
  });

  it('adds an empty split collection when opening schema 4 data', () => {
    const data = migrateV4ToV5({
      schemaVersion: 4,
      mainCurrency: 'EUR',
      money: [],
      transfers: [],
      accounts: [],
      categories: [],
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
      usageExcludedPackages: [],
      timeGoals: [],
    });

    expect(data.schemaVersion).toBe(5);
    expect(data.splits).toEqual([]);
  });
});
