import type {MoneyAccount, MoneyCategory, MoneyEntry, MoneySplit, MoneySplitLine, MoneyKind} from '../types/domain';

export interface MoneySplitLineInput {
  categoryId: string;
  category: string;
  amountMinor: number;
  note: string;
}

export interface MoneySplitInput {
  kind: MoneyKind;
  amountMinor: number;
  currency: string;
  accountId: string;
  category: string;
  note: string;
  lines: MoneySplitLineInput[];
}

export function validateMoneySplit(
  input: MoneySplitInput,
  accounts: MoneyAccount[],
  categories: MoneyCategory[],
): string | null {
  if (!Number.isInteger(input.amountMinor) || input.amountMinor <= 0) {
    return 'Split amount must be a positive whole number of minor units.';
  }
  if (input.lines.length < 2) {
    return 'A split entry needs at least two lines.';
  }
  const account = accounts.find(item => item.id === input.accountId);
  if (!account || account.isArchived) {
    return 'Choose an active account for the split entry.';
  }
  if (account.currency !== input.currency) {
    return 'The split entry currency must match the account.';
  }
  let lineTotal = 0;
  for (const line of input.lines) {
    if (!Number.isInteger(line.amountMinor) || line.amountMinor <= 0) {
      return 'Every split line must have a positive whole amount.';
    }
    const category = categories.find(item => item.id === line.categoryId);
    if (!category || category.isArchived || (category.kind !== 'both' && category.kind !== input.kind)) {
      return 'Every split line must use an active matching category.';
    }
    lineTotal += line.amountMinor;
  }
  if (lineTotal !== input.amountMinor) {
    return 'Split lines must add up exactly to the parent amount.';
  }
  return null;
}

export function createMoneySplit(
  input: MoneySplitInput,
  parentEntryId: string,
  splitId: string,
  timestamp: string,
  createId: (prefix: string) => string,
): {entry: MoneyEntry; split: MoneySplit} {
  const lines: MoneySplitLine[] = input.lines.map(line => ({
    ...line,
    id: createId('split_line'),
  }));
  return {
    entry: {
      id: parentEntryId,
      kind: input.kind,
      amountMinor: input.amountMinor,
      currency: input.currency,
      accountId: input.accountId,
      categoryId: null,
      category: input.category,
      note: input.note,
      occurredAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
      splitId,
    },
    split: {
      id: splitId,
      parentEntryId,
      lines,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  };
}
