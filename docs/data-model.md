# Data model

Status: The local SQLite repository boundary is implemented with app data schema 7 and repository schema 2. Transfer records, account-balance projections, exact-sum split entries, normalized financial tables, budget projections, and one-period carry-forward are live; normalized report and sync tables remain future work.

## Storage rules

- Product records use SQLite with versioned migrations.
- Monetary values use integer minor units plus an ISO 4217 currency code.
- Timestamps are stored as UTC; the user timezone is stored with date-based records where local-day grouping matters.
- IDs are generated locally as opaque UUIDs.
- Soft deletion is used only where undo or audit behavior needs it. Permanent delete is required for the user data deletion flow.
- No raw note content or transaction description is written to logs.

## Entities

### Money entry

| Field | Type | Rule |
| --- | --- | --- |
| `id` | UUID | Primary key. |
| `kind` | enum | `income` or `expense`. |
| `amountMinor` | integer | Positive value in the currency’s minor unit. |
| `currency` | string | Uppercase ISO 4217 code. |
| `occurredAt` | UTC datetime | Required. |
| `localDate` | `YYYY-MM-DD` | Derived using the entry timezone at creation. |
| `category` | string | Required for expenses; optional for income in MVP. |
| `accountLabel` | string | Optional local label, not a bank account connection. |
| `note` | string | Optional, user-entered. |
| `createdAt` / `updatedAt` | UTC datetime | Required. |

### Money transfer

| Field | Type | Rule |
| --- | --- | --- |
| `id` | UUID | Primary key. |
| `fromAccountId` / `toAccountId` | UUID | Must reference two different active accounts. |
| `amountMinor` | integer | Positive value in the account currency. |
| `currency` | string | Must match both account currencies. |
| `occurredAt` | UTC datetime | Required. |
| `note` | string | Optional, user-entered. |
| `createdAt` / `updatedAt` | UTC datetime | Required. |

### Money split

| Field | Type | Rule |
| --- | --- | --- |
| `id` | UUID | Primary key. |
| `parentEntryId` | UUID | Links to one parent money entry. |
| `lines` | array | At least two lines; positive integer amounts sum exactly to the parent amount. |
| `lines[].categoryId` | UUID | Active category matching the parent kind. |
| `lines[].amountMinor` | integer | Positive amount in the parent currency. |
| `createdAt` / `updatedAt` | UTC datetime | Required. |

### Money budget

| Field | Type | Rule |
| --- | --- | --- |
| `id` | UUID | Primary key. |
| `categoryId` | UUID | Active expense or both-kind category. |
| `amountMinor` | integer | Positive limit in the selected currency. |
| `currency` | string | Three-letter uppercase code. |
| `period` | enum | `day`, `week`, or `month`, using the local period helper. |
| `rollover` | enum | `none` or `carry-forward`; carry-forward uses only the previous period's unused positive balance. |
| `isArchived` | boolean | Archived budgets are not shown or projected. |
| `createdAt` / `updatedAt` | UTC datetime | Required. |

### App usage snapshot

| Field | Type | Rule |
| --- | --- | --- |
| `id` | UUID | Primary key. |
| `packageName` | string | Android package identifier. |
| `displayName` | string | Resolved label at read time. |
| `localDate` | `YYYY-MM-DD` | User timezone date. |
| `durationSeconds` | integer | Never negative. |
| `included` | boolean | Exclusion setting is applied at query time or snapshot time by a documented choice. |
| `sourceReadAt` | UTC datetime | When Android data was read. |

The implementation must choose one source-of-truth rule for `included` before coding. The recommended rule is to store raw local snapshots and apply current exclusions when calculating totals, so an exclusion can be undone without re-reading Android data.

### Note

| Field | Type | Rule |
| --- | --- | --- |
| `id` | UUID | Primary key. |
| `title` | string | Required after trim; maximum length is defined in validation constants. |
| `body` | string | Optional text. |
| `tags` | JSON array or join table | Must be normalized before search implementation is finalized. |
| `isPinned` | boolean | Default `false`. |
| `isArchived` | boolean | Default `false`. |
| `createdAt` / `updatedAt` | UTC datetime | Required. |

### Task

| Field | Type | Rule |
| --- | --- | --- |
| `id` | UUID | Primary key. |
| `title` | string | Required after trim. |
| `details` | string | Optional. |
| `status` | enum | `open` or `completed`. |
| `priority` | enum | `low`, `normal`, or `high`. |
| `listId` | UUID nullable | Optional list. |
| `dueLocalDate` | `YYYY-MM-DD` nullable | No time-of-day in MVP. |
| `completedAt` | UTC datetime nullable | Set when completed. |
| `sortOrder` | integer | Stable ordering within a list. |
| `createdAt` / `updatedAt` | UTC datetime | Required. |

### Preferences

Small settings may live in AsyncStorage or a settings table:

- main currency
- user timezone override, if supported
- dashboard card order and visibility
- app-time exclusions
- onboarding completion
- installer status and last-known-good bundle metadata

## Derived values

- Money totals are calculated from filtered entries, grouped by currency. Never add different currencies together.
- App-time totals are calculated from snapshots after the date range and exclusion filters are applied.
- Overdue means `status = open` and `dueLocalDate` is before today in the selected timezone.
- Home cards show `Not available` when source data or permission is missing; zero is only shown when a valid query returned zero.

## Migration policy

1. Every schema change increments a schema version.
2. Migrations are forward-only and idempotent within one transaction.
3. Destructive migrations require an export/backup decision and explicit approval.
4. Each migration has a fixture test for an older schema and a fresh-install test.
5. A failed migration blocks the product UI and shows a clear support/export path; it must not silently discard records.

## Current local storage

The current product data uses `SqliteWorkspaceStore` and the native `@op-engineering/op-sqlite` 17.1.2 bridge. App data is schema 7 and the SQLite repository is schema 2. Accounts, categories, notes, tasks, usage snapshots, time goals, and exclusions remain typed JSON rows in `app_records`; money entries, transfers, split parents/lines, and budgets use normalized tables with typed columns. Repository schema 1 is migrated in one transaction by decoding its old financial rows, writing the normalized tables, and removing the old financial rows. AsyncStorage schema 1 through 6 is migrated into app schema 7 without dropping records and remains the legacy import source for first open.

App-time exclusions are stored as package names and also copied to the `included` flag on refreshed snapshots. Totals use `included = true`, so changing an exclusion does not require another Android read.

Transfers are source records separate from income and expense entries. Account balances project opening balance, account-linked income/expenses, and transfer inflows/outflows. Reports only consume income/expense entries, so transfers do not change spending or income totals.

Split entries store one parent money entry and one linked `split` record. Account balances use the parent once. Reports replace the parent category with its validated lines, preserving the parent total while showing each line category.

Budgets store their limit and rollover policy as a source record. The projection counts only matching expense entries or split lines with the same category ID, currency, and local day/week/month range. `none` uses the saved limit. `carry-forward` adds the previous period's unused positive balance, capped at the saved limit, to the current effective limit. It returns used, remaining, percentage, and a deterministic status; transfers and income never count.

## Full-product entities

### Account and workspace

An `account` identifies an optional sync identity. A `workspace` is the user’s personal set of records. Local-only mode may use a local workspace ID without an account ID. The app must not assume that a display email is the workspace identity.

### Money extensions

- `money_account`: label, currency, opening balance, archived state.
- `category`: parent ID, kind, name, color/icon, archived state.
- `payee`: normalized name and display name.
- `transaction_split`: parent transaction ID, category ID, amount minor, note.
- `budget`: category ID, amount minor, currency, period rule, rollover policy.
- `goal`: name, target minor, currency, target date, linked account/category.
- `recurrence_rule`: schedule, timezone, next occurrence, missed policy, enabled state.
- `import_session`: format, source name, row count, preview hash, status, error count, committed time.

### Time extensions

- `app_group`: name, package IDs, color, archived state.
- `time_goal`: app group or all apps, target duration, period, timezone, enabled state.
- `focus_session`: start, end, stop reason, linked task/project/note/app group.
- `usage_read`: source, permission state, range, read time, coverage, reason code.

### Knowledge and work extensions

- `folder`: note folder name and parent folder ID.
- `attachment`: parent ID, MIME type, byte size, local path, checksum, encryption state.
- `project`: name, status, list/folder links, dates, archive state.
- `task_dependency`: source task ID, dependent task ID, dependency type.
- `task_occurrence`: generated task instance linked to a recurrence rule, with occurrence status and source revision.
- `entity_link`: source type/ID, target type/ID, link type, created time.
- `template`: object type, title, structured payload, version, archived state.
- `saved_search`: query, filters, sort, feature scope.

### Sync and operations

- `device`: device ID, display name, platform, key envelope, last sync, revoked time.
- `change_record`: change ID, object ID/type, base revision, operation, encrypted payload, device ID, logical clock, status.
- `tombstone`: object ID/type, delete revision, acknowledged-device set or retention expiry.
- `sync_cursor`: workspace ID, device ID, pull cursor, last success, last error code.
- `conflict`: object ID/type, local revision, remote revision, field map, resolution state.
- `notification_schedule`: source ID/type, category, trigger, timezone, stable notification ID, state.
- `automation_rule`: trigger, conditions, action, enabled state, last run, last result.
- `review`: period, timezone, generated source revisions, reflection text, completion state.

## Indexes and projections

Required indexes include object ID, update time, local date, status, due date, category, account, tag, and sync revision. Full-text indexes cover note title/body, task title/details, payee, category, and configured link labels. Projection tables can be rebuilt from source records and are never the only copy of user data.

## Sync invariants

- Object IDs are globally unique within a workspace.
- A change is applied at most once by change ID.
- Tombstones prevent late updates from resurrecting data.
- Financial conflict records preserve both source revisions until the user resolves them.
- A remote change is not acknowledged until local application commits.
- Local timestamps are not used as the only conflict order; device logical clocks and base revisions are required.

## Retention and deletion

Local deletion removes source rows, projections, attachment files, search entries, schedules, and local references in one workflow. Synced deletion adds a tombstone first, then removes ciphertext and projections after the sync retention rule permits it. Support and telemetry records use their own shorter retention policy and never contain record content.
