# Product requirements

Status: Planned. Requirement IDs are stable references for issues, tests, and release notes.

## Startup and installer

| ID | Requirement | Acceptance condition |
| --- | --- | --- |
| START-01 | The shell checks the installed bundle version before presenting `MainApp`. | `MainApp` is not rendered until the installer returns a launch decision. |
| START-02 | A newer compatible remote bundle is downloaded when metadata is valid and the network is reachable. | The new bundle is verified, activated atomically, and used for the current launch. |
| START-03 | An invalid, incompatible, or tampered bundle is never activated. | The app keeps the last verified bundle and records a reason code. |
| START-04 | Offline startup uses the newest verified local bundle. | Airplane-mode launch reaches the app when a verified local bundle exists. |
| START-05 | The embedded bundle remains available as the first-install baseline. | A clean install can launch without network access. |

## Shared behavior

| ID | Requirement | Acceptance condition |
| --- | --- | --- |
| CORE-01 | The app works without an account. | A user can use the MVP after local setup only. |
| CORE-02 | User data is stored locally and survives a normal restart. | Records created before a restart are still present and unchanged. |
| CORE-03 | All list screens support empty, loading, error, and populated states. | Each state has a clear message and a useful next action. |
| CORE-04 | Dates and totals show the selected period and timezone. | The same record is not counted in two local days. |
| CORE-05 | The user can export and delete local data. | Export contains all supported records; delete requires confirmation and removes them. |

## Money

| ID | Requirement | Acceptance condition |
| --- | --- | --- |
| MONEY-01 | The user can add income or expense entries. | Required fields are validated before save. |
| MONEY-02 | Amounts use integer minor units, not floating-point math. | `10.99` in EUR is stored as `1099` minor units. |
| MONEY-03 | The user can edit and delete entries. | Totals update immediately and remain correct after restart. |
| MONEY-04 | The user can filter by date, type, category, and account label. | Filter results and totals use the same filter. |
| MONEY-05 | The user can export entries. | CSV and JSON exports contain a schema version and currency fields. |

## App time

| ID | Requirement | Acceptance condition |
| --- | --- | --- |
| TIME-01 | The app explains and links to Android Usage Access settings. | A user can reach the system settings from the empty state. |
| TIME-02 | The app reads usage totals only after permission is granted. | No usage query runs before the permission check. |
| TIME-03 | The app shows period totals, per-app totals, and last-read time. | The display states the selected date range and data age. |
| TIME-04 | The user can exclude apps from summaries. | Exclusions apply to future dashboard totals and are visible in settings. |
| TIME-05 | Usage reads are deterministic for a timezone and date range. | Re-reading the same system data produces the same result. |

## Notes

| ID | Requirement | Acceptance condition |
| --- | --- | --- |
| NOTE-01 | The user can create, edit, archive, pin, and delete notes. | Each action has a visible result and survives restart. |
| NOTE-02 | Notes support title, body, tags, and timestamps. | Empty titles are rejected or replaced by a documented rule. |
| NOTE-03 | Search covers title, body, and tags. | Search is case-insensitive and returns matching notes only. |

## Tasks

| ID | Requirement | Acceptance condition |
| --- | --- | --- |
| TASK-01 | The user can create, edit, complete, reopen, and delete tasks. | State changes are persisted and reversible where stated. |
| TASK-02 | Tasks support due date, priority, list, and details. | Invalid dates and blank titles are rejected with inline errors. |
| TASK-03 | The user can view overdue, today, upcoming, and completed tasks. | Each view uses one documented timezone and completion rule. |

## Quality requirements

- Android MVP target: the current supported Android release and the two previous major releases, subject to the final minimum API decision.
- TypeScript strict mode remains enabled.
- No P0 or P1 defects are open for release.
- Main flows have unit and device-level coverage as described in `testing.md`.
- UI supports system font scaling, screen readers, touch targets of at least 44 dp, and sufficient color contrast.
- The app does not send personal content to a server by default.
- A crash or installer error must leave the user with a deterministic, usable launch path.

## Full-product identity and sync

| ID | Phase | Requirement | Acceptance condition |
| --- | --- | --- | --- |
| SYNC-01 | 4 | Local-only mode remains usable without an account. | No core screen redirects to account creation. |
| SYNC-02 | 4 | The user can opt in to encrypted sync. | No local record uploads before the user confirms the scope. |
| SYNC-03 | 4 | Devices are explicitly enrolled and revocable. | A revoked device cannot submit new changes after the service receives revocation. |
| SYNC-04 | 4 | Sync is idempotent and resumable. | Replaying a batch does not duplicate records, and a cursor resumes after restart. |
| SYNC-05 | 4 | Conflicts are visible. | Same-object money conflicts produce a conflict record; they are not silently merged. |
| SYNC-06 | 4 | The user can pause and resume sync. | Local edits continue while paused and are queued with a visible outbox state. |
| SYNC-07 | 4 | The user can create and restore an encrypted backup. | Restore is previewed and committed atomically without replacing the current workspace on failure. |
| SYNC-08 | 4 | The user can delete the account-side workspace. | Ciphertext, device records, and account references follow the deletion policy. |

## Full-product money

| ID | Phase | Requirement | Acceptance condition |
| --- | --- | --- | --- |
| MONEY-06 | 2 | The user can create accounts, categories, and payees. | Reports and entry forms use stable IDs, not display-name matching. |
| MONEY-07 | 2 | The user can record transfers. | Transfers change account balances but not income or spending totals. |
| MONEY-08 | 2 | The user can split an entry. | Split lines sum exactly to the parent amount before save. |
| MONEY-09 | 2 | The user can create budgets and goals. | Used, remaining, and target values use the selected currency and period. |
| MONEY-10 | 2 | The user can create recurring money rules. | The next occurrence is deterministic across restart and timezone changes. |
| MONEY-11 | 2 | The user can view reports. | Each report states date range, currency, filters, and excluded data. |
| MONEY-12 | 4 | The user can import money data. | Preview, mapping, duplicate detection, and one-step rollback happen before commit. |
| MONEY-13 | 6 | A connected provider may update transactions. | Credentials are protected, disconnect is supported, and provider failures do not corrupt manual records. |

## Full-product app time

| ID | Phase | Requirement | Acceptance condition |
| --- | --- | --- | --- |
| TIME-06 | 2 | The user can create app groups. | A package belongs to a group or an explicit ungrouped state. |
| TIME-07 | 2 | The user can create daily or weekly time goals. | Goal comparisons state source, range, timezone, and freshness. |
| TIME-08 | 2 | The user can record focus sessions. | A session has a valid start/end or an explicit stopped state. |
| TIME-09 | 5 | Platform capability differences are visible. | iOS and Android never show an unavailable control as if it worked. |
| TIME-10 | 6 | Optional app blocking or advanced controls require a separate platform review. | No screen promises blocking before a supported adapter exists. |

## Full-product notes and knowledge

| ID | Phase | Requirement | Acceptance condition |
| --- | --- | --- | --- |
| NOTE-04 | 3 | Notes support rich text with plain-text fallback. | Export and search remain usable when rich formatting is unsupported. |
| NOTE-05 | 3 | The user can link notes to tasks, projects, money, and focus sessions. | Links use stable IDs and show a deleted-item state. |
| NOTE-06 | 3 | The user can attach supported local files. | Type, size, checksum, and delete behavior are validated before save. |
| NOTE-07 | 3 | The user can use templates and saved searches. | A template creates a new object; it never edits the source template. |
| NOTE-08 | 4 | Synced notes expose revision history and restore. | Restore creates a new revision and can be synced to other devices. |

## Full-product tasks and projects

| ID | Phase | Requirement | Acceptance condition |
| --- | --- | --- | --- |
| TASK-04 | 2 | The user can create projects, subtasks, and dependencies. | Cyclic dependencies are rejected before save. |
| TASK-05 | 2 | The user can create recurring task rules. | The missed-occurrence policy is shown and tested. |
| TASK-06 | 3 | The user can reschedule or snooze reminders. | The old schedule is removed before the new one is stored. |
| TASK-07 | 3 | The user can create task templates. | Template edits do not mutate already-created tasks. |
| TASK-08 | 3 | The user can open a calendar or agenda view. | Dates use the selected timezone and week-start setting. |

## Search, reviews, and cross-feature behavior

| ID | Phase | Requirement | Acceptance condition |
| --- | --- | --- | --- |
| CROSS-01 | 2 | Home cards read from feature data sources. | A card cannot show a value that is not returned by its source query. |
| CROSS-02 | 3 | Global search covers supported features. | Search explains matches and respects archive, delete, and access rules. |
| CROSS-03 | 3 | The user can run daily, weekly, and monthly reviews. | Every comparison names its baseline and period. |
| CROSS-04 | 3 | The user can convert a note into a task. | The new task links to the source note and the source remains unchanged. |
| CROSS-05 | 3 | Destructive cross-feature actions are reversible or confirmed. | The UI states which linked records will remain. |

## Notifications, automation, and integrations

| ID | Phase | Requirement | Acceptance condition |
| --- | --- | --- | --- |
| NOTIFY-01 | 3 | Notifications are grouped by category and controlled by quiet hours. | A paused category does not schedule new notifications. |
| NOTIFY-02 | 3 | Reminder actions are idempotent. | Tapping Complete twice does not create two state changes. |
| AUTO-01 | 3 | User automation rules have one trigger, conditions, and one action. | A rule has enable/disable, preview, and run history. |
| AUTO-02 | 3 | Automation cannot commit money or delete data silently. | Such actions require a user-confirmed draft or confirmation screen. |
| INT-01 | 3 | The user can capture through share actions and widgets. | Preview, permission, offline, and revoke states are complete. |
| INT-02 | 3 | The user can import and export supported formats. | Unsupported fields are visible instead of silently dropped. |
| INT-03 | 3 | Calendar integration is opt-in. | Revoking permission stops new reads/writes without deleting existing Yuzuha records. |

## Quality and service requirements

| ID | Phase | Requirement | Acceptance condition |
| --- | --- | --- | --- |
| QUAL-01 | 5 | Core flows support screen readers, large text, dark theme, and RTL layout. | Accessibility and pseudo-localization suites pass on supported platforms. |
| QUAL-02 | 5 | The app supports the agreed language and regional formats. | Dates, currencies, plural forms, and week rules use locale data. |
| QUAL-03 | 5 | Diagnostics exclude personal content. | Redaction tests fail if forbidden fields enter an event or support package. |
| QUAL-04 | 5 | Startup, sync, migration, and deletion have operational reason codes. | Support can identify the class of failure without reading user records. |
| QUAL-05 | 5 | Full-product releases have rollback plans. | The release record names the previous bundle/native/data version. |

## Phase 2 implementation review

Implemented and verified:

- `MONEY-06` foundation: seeded accounts/categories plus user-created accounts/categories;
- `TIME-01` and `TIME-02`: Android Usage Access explanation, settings link, permission check, and query gate;
- `TIME-03`: daily total, top-app list, last-read time, and source freshness;
- `TIME-05`: day-range normalization and deterministic local-date aggregation;
- `CORE-04`: current-month money totals and local-day app-time grouping;
- schema 1 to schema 2 migration with a regression test.

Not yet complete in Phase 2: app exclusions, weekly goals, reports, split transactions, and SQLite storage.

## Phase 3 implementation review

Implemented and verified:

- `MONEY-01` extension: existing money entries can be edited or permanently deleted;
- `MONEY-06` extension: accounts and categories can be archived, while the last active account cannot be archived;
- `TIME-06` partial: package-level app-time exclusions are stored locally and reflected in totals;
- `TIME-07`: daily and weekly goals can be saved and show progress from included snapshots;
- schema version 2 to schema version 3 migration with a fixture test.

Not yet complete in Phase 3: reports, transfers, split transactions, app groups, SQLite storage, and the wider notes/tasks automation scope.

## Phase 4 implementation review

Implemented and verified:

- `CORE-05` extension: the product repository uses transactional SQLite with an explicit schema version and legacy import;
- `MONEY-11` partial: day, week, and month reports show income, spending, net, and category totals;
- `MONEY-11` trust rule: each currency has its own report and incompatible currencies are never added together;
- repository failure behavior: unsupported schema versions and malformed rows block the workspace instead of guessing.

## Money transfer implementation review

Implemented and verified:

- `MONEY-07`: transfers are stored separately from income and expense entries;
- `MONEY-07`: active same-currency accounts are required, and account balances include transfer inflows/outflows;
- `MONEY-07` trust rule: transfers do not change income, spending, or category report totals;
- schema version 3 to schema version 4 migration adds an empty transfer collection without dropping existing records.

Not yet complete: normalized money tables, budgets, split transactions, exports, and sync.
