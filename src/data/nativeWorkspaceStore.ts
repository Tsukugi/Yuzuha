import {open} from '@op-engineering/op-sqlite';
import {LocalStore} from './localStore';
import {SqliteWorkspaceStore} from './sqliteStore';

export function createNativeWorkspaceStore(): SqliteWorkspaceStore {
  const database = open({name: 'yuzuha.sqlite'});
  return new SqliteWorkspaceStore({
    execute: (query, params) => database.execute(query, params),
    transaction: async callback => {
      await database.transaction(async transaction => {
        await callback({
          execute: (query, params) => transaction.execute(query, params),
          transaction: async nested => nested({
            execute: (nestedQuery, nestedParams) => transaction.execute(nestedQuery, nestedParams),
            transaction: async () => {
              throw new Error('Nested SQLite transactions are not supported.');
            },
          }),
        });
      });
    },
  }, new LocalStore());
}
