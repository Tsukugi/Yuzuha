import type {MoneyPayee} from '../types/domain';

export const MONEY_PAYEE_MAX_NAME_LENGTH = 80;

export function validateMoneyPayeeName(
  name: string,
  payees: MoneyPayee[],
  excludedPayeeId?: string,
): string | null {
  const normalizedName = name.trim();
  if (normalizedName.length === 0) {
    return 'Enter a payee name.';
  }
  if (normalizedName.length > MONEY_PAYEE_MAX_NAME_LENGTH) {
    return `Payee names must be ${MONEY_PAYEE_MAX_NAME_LENGTH} characters or fewer.`;
  }
  const duplicate = payees.some(payee =>
    payee.id !== excludedPayeeId && payee.name.trim().toLocaleLowerCase() === normalizedName.toLocaleLowerCase(),
  );
  return duplicate ? 'A payee with this name already exists.' : null;
}

export function createMoneyPayee(name: string, id: string, timestamp: string): MoneyPayee {
  return {
    id,
    name: name.trim(),
    isArchived: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function updateMoneyPayee(payee: MoneyPayee, name: string, timestamp: string): MoneyPayee {
  return {...payee, name: name.trim(), updatedAt: timestamp};
}
