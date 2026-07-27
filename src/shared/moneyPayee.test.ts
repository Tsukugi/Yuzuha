import {createMoneyPayee, validateMoneyPayeeName} from './moneyPayee';
import type {MoneyPayee} from '../types/domain';

describe('money payees', () => {
  const timestamp = '2026-07-27T12:00:00.000Z';
  const existing: MoneyPayee = {
    id: 'payee_acme',
    name: 'Acme Market',
    isArchived: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  it('trims names and rejects blank or duplicate payees', () => {
    expect(validateMoneyPayeeName('   ', [existing])).toBe('Enter a payee name.');
    expect(validateMoneyPayeeName(' acme market ', [existing])).toBe('A payee with this name already exists.');
    expect(validateMoneyPayeeName(' Acme Market ', [existing], existing.id)).toBeNull();
  });

  it('creates a current local payee record', () => {
    expect(createMoneyPayee('  Corner Shop  ', 'payee_corner', timestamp)).toEqual({
      id: 'payee_corner',
      name: 'Corner Shop',
      isArchived: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  });
});
