# Data model

Status: Phase 3 schema version 3 is implemented in the AsyncStorage boundary. SQLite remains the full-product migration target.

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

## Current Phase 3 schema

The current JSON store has schema version 3 with `mainCurrency`, money accounts, money categories, usage snapshots, a usage-read record, app-time exclusions, and daily/weekly time goals. Existing version 1 and version 2 data is read from legacy keys, migrated without dropping money/notes/tasks, and written to the version 3 key before the app continues.

App-time exclusions are stored as package names and also copied to the `included` flag on refreshed snapshots. Totals use `included = true`, so changing an exclusion does not require another Android read.

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
