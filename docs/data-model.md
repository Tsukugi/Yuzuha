# Data model

Status: The local SQLite repository boundary is implemented with app data schema 25 and repository schema 2. Transfer records, account-balance projections, exact-sum split entries, normalized financial tables, budget projections, one-period carry-forward, recurring money and task rules with missed-occurrence policy, optional local reminder times on recurring task rules, task projects and optional task-to-project links, task dependencies with cycle rejection and completed-prerequisite blocking, persisted task order with manual/due-date/priority sorting, a derived device-local 14-day task agenda, one Android local reminder per open task, local daily quiet-hours settings and alarm projection, separate global and recurring-task reminder category pauses, Android `Open`, idempotent `Complete`, and configurable `Snooze` reminder actions, note tags and local title/body/tag/attachment-name search, note lifecycle controls, local saved searches, local global search, note-to-task conversion, task lifecycle controls, task-list lifecycle controls, local note attachment metadata/files, portable encrypted attachment bytes, and validated JSON restore are live; selected timezone/week-start settings, broader notification automation, normalized report, and sync tables remain future work.

## Storage rules

- Product records use SQLite with the current schema check. The unreleased build does not migrate old product data.
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

### Money recurrence rule

| Field | Type | Rule |
| --- | --- | --- |
| `id` | UUID | Primary key. |
| `kind` | enum | `income` or `expense`. |
| `amountMinor` | integer | Positive amount copied into generated entries. |
| `currency` | string | Must match the active account currency. |
| `accountId` / `categoryId` | UUID | Source links used for each generated entry. |
| `cadence` | enum | `day`, `week`, or `month`. |
| `interval` | integer | Whole number from 1 to 365. |
| `nextOccurrenceLocalDate` | `YYYY-MM-DD` | Next local calendar date to generate. |
| `missedOccurrencePolicy` | enum | `all` creates every missed date, `one` creates the first missed date, and `skip` creates none. All advance past the full missed range. |
| `isPaused` | boolean | Paused rules do not generate entries. |
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
| `tags` | lowercase string array | Up to 20 unique tags, each 1-40 characters; tags are trimmed and lowercased before save. |
| `isPinned` | boolean | Default `false`. |
| `isArchived` | boolean | Default `false`. |
| `createdAt` / `updatedAt` | UTC datetime | Required. |

### Note attachment

| Field | Type | Rule |
| --- | --- | --- |
| `id` | UUID | Primary key and private-file name component. |
| `noteId` | UUID | Must reference an existing note. |
| `name` | string | Trimmed file name, maximum 255 characters. |
| `mimeType` | string | `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `application/pdf`, or `text/plain`. |
| `byteSize` | integer | From 1 byte through 10 MiB. |
| `sha256` | lowercase hex | 64-character checksum of the stored file. |
| `createdAt` / `updatedAt` | UTC datetime | Required. |

Attachment bytes are stored in app-private document storage under a path derived from the attachment ID. A note can have at most 10 attachments. Plain JSON exports contain attachment metadata only. New encrypted backup schema 2 payloads include verified attachment bytes, with a 32 MiB total attachment limit. Android preview does not add data fields: it validates this private path and exposes one file at a time through a read-only FileProvider URI. Local note search now also matches attachment file names; it does not inspect attachment bytes.

### Saved search

| Field | Type | Rule |
| --- | --- | --- |
| `id` | UUID | Primary key. |
| `name` | string | Required after trim; maximum 80 characters. |
| `query` | string | Required after trim; maximum 200 characters. It uses the local note search matcher. |
| `showArchived` | boolean | Restored with the query and controls whether archived notes are included. |
| `createdAt` / `updatedAt` | UTC datetime | Required. |

Saved searches are local records. JSON exports and encrypted backups include them. Synced indexes and synced saved-search state remain planned.

Global search is a derived view over `AppData` and adds no entity or migration. It searches record fields already stored locally; archived visibility and Usage Access are query-time rules.

### Task

| Field | Type | Rule |
| --- | --- | --- |
| `id` | UUID | Primary key. |
| `title` | string | Required after trim. |
| `details` | string | Optional. |
| `status` | enum | `open` or `completed`. |
| `priority` | enum | `low`, `normal`, or `high`. |
| `listId` | UUID | Required task-list link. New tasks use the seeded `Inbox` list. |
| `dueLocalDate` | `YYYY-MM-DD` nullable | No time-of-day in MVP. |
| `sourceNoteId` | UUID nullable | Optional stable source-note link. It may point to a deleted note so the UI can show a deleted-source state. |
| `recurrenceRuleId` | UUID nullable | Optional link to the task rule that generated this task. Deleting a rule keeps the task and clears this link. |
| `projectId` | UUID nullable | Optional link to a local task project. Archived projects remain readable on linked tasks. |
| `reminderAtMillis` | integer nullable | One optional future local timestamp for an Android reminder. Completed tasks cannot have an active reminder. |
| `completedAt` | UTC datetime nullable | Set when completed. |
| `sortOrder` | integer | Stable ordering within a list. |
| `createdAt` / `updatedAt` | UTC datetime | Required. |

### Task project

| Field | Type | Rule |
| --- | --- | --- |
| `id` | UUID | Primary key. |
| `name` | string | Required after trim; maximum 80 characters; unique case-insensitively. |
| `status` | enum | `active` or `completed`. |
| `isArchived` | boolean | Archived projects are not offered for new task links. Existing links remain readable. |
| `createdAt` / `updatedAt` | UTC datetime | Required. |

Projects are local grouping records. A project can be deleted only when no task references it; task deletion does not delete the project.

### Task list

| Field | Type | Rule |
| --- | --- | --- |
| `id` | UUID | Primary key. |
| `name` | string | Required after trim. |
| `isArchived` | boolean | Archived lists are not offered for new tasks. Existing tasks remain readable. |
| `createdAt` / `updatedAt` | UTC datetime | Required. |

The current task UI supports custom lists. The seeded `Inbox` list cannot be archived or deleted. Other lists can be archived and remain readable; deletion is allowed only when no task references the list.

### Task dependency

| Field | Type | Rule |
| --- | --- | --- |
| `id` | UUID | Primary key. |
| `sourceTaskId` | UUID | Task that must reach the condition. |
| `dependentTaskId` | UUID | Task that waits for the source task. |
| `dependencyType` | enum | Current value is `completed`. |
| `createdAt` / `updatedAt` | UTC datetime | Required. |

The source and dependent tasks must exist and must be different. Duplicate links and cycles are rejected. An open dependent task with an open source task is shown as blocked and cannot be completed until every source task reaches `completed`. Deleting either task removes its dependency records in the same local save.

### Task recurrence rule

| Field | Type | Rule |
| --- | --- | --- |
| `id` | UUID | Primary key. Generated task IDs use the stable rule ID and occurrence date. |
| `title` / `details` | string | Copied into each generated open task. Title is required after trim. |
| `priority` | enum | `low`, `normal`, or `high`. |
| `listId` | UUID | Must reference an existing task list. |
| `cadence` | enum | `day`, `week`, or `month`, using local calendar dates. |
| `interval` | integer | Whole number from 1 to 365. |
| `nextOccurrenceLocalDate` | `YYYY-MM-DD` | Next date to generate. |
| `missedOccurrencePolicy` | enum | `all` creates every due task, `one` creates the first due task, and `skip` creates none; all advance beyond the full due range. |
| `reminderLocalTime` | `HH:mm` nullable | Optional local time copied to generated tasks. A date/time that is already past is not scheduled. |
| `isPaused` | boolean | Paused rules do not expand. |
| `createdAt` / `updatedAt` | UTC datetime | Required. |

Rules expand during startup and rule creation. An optional rule `HH:mm` is combined with each generated occurrence's local date and copied to `reminderAtMillis`; future values are synchronized immediately and on startup/boot, while past values are not scheduled. One-off Android task reminders are stored on the task and rebuilt at startup and boot. Task dependencies store a prerequisite task, a dependent task, and the `completed` condition; self-links, duplicates, and cycles are rejected, and an incomplete prerequisite blocks completion while leaving the dependent task open. Reminder notification actions use the task ID but add no persisted action state: `Complete` changes only an existing open, unblocked task to completed, and `Snooze` replaces the logical reminder using the selected duration. `notificationSettings` stores the required global and recurring-task reminder flags, an optional daily local window, and a 15/30/60/120-minute snooze duration; both quiet-hour values are null when disabled, and a reminder inside the window is scheduled at the window end while its logical task timestamp stays unchanged. When either relevant category is disabled, native reminder alarms are cleared but logical task timestamps remain. Broader notifications, background automation, templates, and editing one occurrence versus a series are planned.

### Notification settings

| Field | Type | Rule |
| --- | --- | --- |
| `quietHoursStartLocalTime` | `HH:mm` nullable | Daily local quiet-hours start; null only when quiet hours are disabled. |
| `quietHoursEndLocalTime` | `HH:mm` nullable | Daily local quiet-hours end; must be different from the start when enabled. |
| `snoozeDurationMinutes` | enum | Local `Snooze` duration: 15, 30, 60, or 120 minutes; defaults to 60. |
| `taskRemindersEnabled` | boolean | Local Task reminders category switch; defaults to `true`. Disabled means no native task-reminder alarms. |
| `recurringTaskRemindersEnabled` | boolean | Local recurring-task reminder category switch; defaults to `true`. It affects only tasks linked to recurring rules. |

Quiet hours may be same-day or overnight. The schedule projection uses the device's local calendar and moves an in-window reminder to the next applicable end time. This projection is deterministic and does not change the stored task reminder timestamp.

### Preferences

Small settings need an explicit current owner before implementation:

- main currency
- user timezone override, if supported
- dashboard card order and visibility
- app-time exclusions
- onboarding completion
- installer status and last-known-good bundle metadata

The current build does not persist these preference records through AsyncStorage.

## Derived values

- Money totals are calculated from filtered entries, grouped by currency. Never add different currencies together.
- App-time totals are calculated from snapshots after the date range and exclusion filters are applied.
- Overdue means `status = open` and `dueLocalDate` is before today in the selected timezone.
- Home cards show `Not available` when source data or permission is missing; zero is only shown when a valid query returned zero.

## Schema policy

1. The unreleased build has one current app schema and one current SQLite repository schema.
2. App schema 25 and repository schema 2 are accepted. Older and unknown schemas are rejected clearly.
3. A future public release may add a forward migration only after a product decision, fixture test, and rollback plan.
4. A fresh install creates the current empty workspace directly; it does not import old product data.

## Current local storage

The current product data uses `SqliteWorkspaceStore` and the native `@op-engineering/op-sqlite` 17.1.2 bridge. App data is schema 25 and the SQLite repository is schema 2. Accounts, categories, notes, attachments, saved searches, projects, notification settings, task lists, task recurrence rules, tasks, task dependencies, usage snapshots, time goals, exclusions, and recurrence rules remain typed JSON rows in `app_records`; money entries, transfers, split parents/lines, and budgets use normalized tables with typed columns. The repository seeds a fresh database with current empty data and rejects old or unknown repository schemas. JSON restore accepts export schema 1 only when its app data is schema 25, validates project names and fields, task-project links, current task-list links, task recurrence links, task priority, task dates, reminder timestamps, per-list task sort order, both notification category settings, recurrence reminder times, dependency references, duplicate links, and cycles, then replaces all app collections in one repository save after confirmation; a JSON restore containing attachments is rejected because JSON has no attachment bytes. Encrypted backup schema 2 restores its validated attachment files through a staged private-file boundary. Old app data, old SQLite rows, and old encrypted backup schemas are not upgraded in this unreleased build.

## Export and deletion

The data tools expose export schema version 1. JSON contains the complete `AppData` object plus the export version, app schema version, and export time. CSV contains money entries with export/app schema versions, minor-unit amounts, currencies, IDs, categories, notes, timestamps, and split IDs. Both formats are sent through the Android system share sheet after the user requests them. Local deletion requires confirmation and writes `emptyAppData()` through the same repository transaction, leaving only the seeded empty-workspace defaults.

App-time exclusions are stored as package names and also copied to the `included` flag on refreshed snapshots. Totals use `included = true`, so changing an exclusion does not require another Android read.

Transfers are source records separate from income and expense entries. Account balances project opening balance, account-linked income/expenses, and transfer inflows/outflows. Reports only consume income/expense entries, so transfers do not change spending or income totals.

Split entries store one parent money entry and one linked `split` record. Account balances use the parent once. Reports replace the parent category with its validated lines, preserving the parent total while showing each line category.

Budgets store their limit and rollover policy as a source record. The projection counts only matching expense entries or split lines with the same category ID, currency, and local day/week/month range. `none` uses the saved limit. `carry-forward` adds the previous period's unused positive balance, capped at the saved limit, to the current effective limit. It returns used, remaining, percentage, and a deterministic status; transfers and income never count.

Recurrence expansion compares validated `YYYY-MM-DD` strings in the device's current local calendar. Daily and weekly rules add calendar days; monthly rules clamp a day to the last day of a shorter month. Each generated entry uses a deterministic rule/date ID, and the rule's next date advances in the same save as the generated entries.

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
