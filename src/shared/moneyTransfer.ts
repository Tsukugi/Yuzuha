import type {MoneyAccount, MoneyEntry, MoneyTransfer} from '../types/domain';

export interface MoneyTransferInput {
  fromAccountId: string;
  toAccountId: string;
  amountMinor: number;
  currency: string;
  note: string;
}

export function validateMoneyTransfer(input: MoneyTransferInput, accounts: MoneyAccount[]): string | null {
  if (!Number.isInteger(input.amountMinor) || input.amountMinor <= 0) {
    return 'Transfer amount must be a positive whole number of minor units.';
  }
  if (input.fromAccountId === input.toAccountId) {
    return 'Choose two different accounts for a transfer.';
  }
  const fromAccount = accounts.find(account => account.id === input.fromAccountId);
  const toAccount = accounts.find(account => account.id === input.toAccountId);
  if (!fromAccount || !toAccount) {
    return 'Both transfer accounts must exist.';
  }
  if (fromAccount.isArchived || toAccount.isArchived) {
    return 'Transfers can use active accounts only.';
  }
  if (fromAccount.currency !== toAccount.currency || fromAccount.currency !== input.currency) {
    return 'Transfers must use accounts with the same currency.';
  }
  return null;
}

export function calculateAccountBalance(
  account: MoneyAccount,
  entries: MoneyEntry[],
  transfers: MoneyTransfer[],
): number {
  const entryBalance = entries.reduce((balance, entry) => {
    if (entry.accountId !== account.id || entry.currency !== account.currency) {
      return balance;
    }
    return balance + (entry.kind === 'income' ? entry.amountMinor : -entry.amountMinor);
  }, account.openingBalanceMinor);
  return transfers.reduce((balance, transfer) => {
    if (transfer.currency !== account.currency) {
      return balance;
    }
    if (transfer.fromAccountId === account.id) {
      return balance - transfer.amountMinor;
    }
    if (transfer.toAccountId === account.id) {
      return balance + transfer.amountMinor;
    }
    return balance;
  }, entryBalance);
}
