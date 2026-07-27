import {migrateStoredData, migrateV10ToV11, migrateV11ToV12, migrateV2ToV3, migrateV3ToV4, migrateV4ToV5, migrateV5ToV6, migrateV6ToV7, migrateV7ToV8, migrateV8ToV9} from './migrations';
import {emptyAppData} from '../types/domain';
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
    expect(migrateV5ToV6(data).budgets).toEqual([]);
  });

  it('adds an empty budget collection when opening schema 5 data', () => {
    const data = migrateV5ToV6({
      schemaVersion: 5,
      mainCurrency: 'EUR',
      money: [],
      transfers: [],
      splits: [],
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

    expect(data.schemaVersion).toBe(6);
    expect(data.budgets).toEqual([]);
  });

  it('adds the explicit no-rollover rule when opening schema 6 data', () => {
    const data = migrateV6ToV7({
      schemaVersion: 6,
      mainCurrency: 'EUR',
      money: [],
      transfers: [],
      splits: [],
      budgets: [{
        id: 'budget_food',
        categoryId: 'category_food',
        category: 'Food',
        amountMinor: 2000,
        currency: 'EUR',
        period: 'month',
        isArchived: false,
        createdAt: '2026-07-26T00:00:00.000Z',
        updatedAt: '2026-07-26T00:00:00.000Z',
      }],
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

    expect(data.schemaVersion).toBe(7);
    expect(data.budgets[0].rollover).toBe('none');
    expect(migrateV7ToV8(data).recurrences).toEqual([]);
  });

  it('adds an empty recurrence collection when opening schema 7 data', () => {
    const data = migrateV7ToV8({
      schemaVersion: 7,
      mainCurrency: 'EUR',
      money: [],
      transfers: [],
      splits: [],
      budgets: [],
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

    expect(data.schemaVersion).toBe(8);
    expect(data.recurrences).toEqual([]);
  });

  it('adds the default all-missed policy when opening schema 8 data', () => {
    const data = migrateV8ToV9({
      schemaVersion: 8,
      mainCurrency: 'EUR',
      money: [],
      transfers: [],
      splits: [],
      budgets: [],
      recurrences: [{
        id: 'rule_1',
        kind: 'expense',
        amountMinor: 1000,
        currency: 'EUR',
        accountId: 'account_everyday',
        categoryId: 'category_food',
        category: 'Food',
        note: '',
        cadence: 'month',
        interval: 1,
        nextOccurrenceLocalDate: '2026-07-26',
        isPaused: false,
        createdAt: '2026-07-26T00:00:00.000Z',
        updatedAt: '2026-07-26T00:00:00.000Z',
      }],
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

    expect(data.schemaVersion).toBe(9);
    expect(data.recurrences[0].missedOccurrencePolicy).toBe('all');
  });

  it('adds note tags when opening schema 10 data', () => {
    const legacy = {
      ...emptyAppData(),
      schemaVersion: 10 as const,
      notes: [{
        id: 'note_1',
        title: 'Legacy',
        body: '',
        isPinned: false,
        createdAt: '2026-07-27T00:00:00.000Z',
        updatedAt: '2026-07-27T00:00:00.000Z',
      }],
    } as never;

    const data = migrateV10ToV11(legacy);

    expect(data.schemaVersion).toBe(11);
    expect(data.notes[0].tags).toEqual([]);
  });

  it('adds the attachment collection and note tags when opening schema 9 data', () => {
    const legacy: Record<string, unknown> = {...emptyAppData(), schemaVersion: 9};
    delete legacy.attachments;

    const data = migrateStoredData(legacy);

    expect(data?.schemaVersion).toBe(12);
    expect(data?.attachments).toEqual([]);
    expect(data?.notes).toEqual([]);
  });

  it('adds the archive flag when opening schema 11 data', () => {
    const legacy = {
      ...emptyAppData(),
      schemaVersion: 11 as const,
      notes: [{
        id: 'note_1',
        title: 'Legacy',
        body: '',
        tags: [],
        isPinned: false,
        createdAt: '2026-07-27T00:00:00.000Z',
        updatedAt: '2026-07-27T00:00:00.000Z',
      }],
    } as never;

    const data = migrateV11ToV12(legacy);

    expect(data.schemaVersion).toBe(12);
    expect(data.notes[0].isArchived).toBe(false);
  });
});
