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
| TASK-04 | The user can create, rename, archive, restore, and delete custom task lists. | Inbox cannot be archived/deleted, and a list with tasks cannot be deleted. |

Current implementation extension: the user can create, pause/resume, and delete date-based recurring task rules, with an optional validated local `HH:mm` reminder time. Startup creates due open tasks using the stored All, One, or Skip missed-occurrence policy, copies the rule reminder time into generated task timestamps, and synchronizes future generated reminders. A task list with a rule cannot be deleted. An open task can have one optional future Android local reminder; permission is explicit, completing, deleting, clearing, or replacing the reminder removes the old native schedule, tapping the notification opens the matching task in edit mode, `Complete` performs one open-to-completed transition, and `Snooze` replaces the logical reminder using the selected 15/30/60/120-minute duration through the quiet-hours projection. The local Task reminders category can be switched off to clear native alarms while retaining logical reminder times; re-enabling rebuilds future alarms. Missing, completed, and paused-category action targets are ignored. Daily local quiet hours are optional and project in-window reminders to the configured local end without changing the stored task timestamp.

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

## Split entry implementation review

Implemented and verified:

- `MONEY-08`: a split has one balance-affecting parent and at least two positive lines;
- `MONEY-08`: integer minor-unit lines must sum exactly to the parent before save;
- `MONEY-08`: each line uses an active category matching the parent kind;
- `MONEY-11` extension: report totals remain unchanged while split lines appear under their own categories;
- schema version 4 to schema version 5 migration adds an empty split collection without dropping existing records.

Not yet complete: budgets, recurring money rules, exports, normalized money tables, and sync.

## Budget implementation review

Implemented and verified:

- `MONEY-09`: budgets store an active expense category, currency, positive limit, and day/week/month period;
- `MONEY-09`: used, remaining, percentage, and status are projected from matching expense entries and split lines;
- `MONEY-09` trust rule: income, transfers, other currencies, and entries outside the selected period do not count;
- schema version 5 to schema version 6 migration adds an empty budget collection without dropping existing records.

Not yet complete: recurring rules, alerts, exports, and sync.

The current budget implementation supports one previous-period carry-forward rule. Multi-period rollover and recurring budget creation remain planned.

## Normalized storage and rollover implementation review

Implemented and verified:

- financial records use normalized SQLite tables behind the typed repository boundary;
- repository schema 1 is migrated to schema 2 in one transaction without dropping old financial records;
- app data schema 6 budgets migrate to schema 7 with an explicit `none` rollover rule;
- budget projections support `none` and one-period `carry-forward` with the previous period's unused positive balance capped at one base limit;
- emulator and phone smoke checks pass for migration, persistence, install, launch, and cleared-logcat behavior.

Not yet complete: multi-period rollover, recurring rules, alerts, exports, and sync.

## Export and deletion implementation review

Implemented and verified:

- `CORE-05`: the user can open Data tools, share a complete versioned JSON export, and request a versioned money CSV export;
- `CORE-05`: local deletion requires a confirmation dialog and resets the repository to seeded empty-workspace defaults;
- `MONEY-05`: CSV and JSON exports include schema versions and currency fields;
- emulator smoke confirms the Android share sheet opens and deletion changes Home to EUR 0.00, 0 saved notes, and 0 open tasks;
- phone smoke confirms the final APK installs and resumes `MainActivity` without cleared-logcat app errors.

Not yet complete: multi-period rollover, recurring rules, alerts, and sync.

## Recurring money implementation review

Implemented and verified:

- `MONEY-10`: the user can create day, week, or month money rules with a validated account, category, amount, interval, and local start date;
- due entries are generated from local calendar dates and the rule's next date advances in the same save;
- generated entry IDs are deterministic from the rule ID and occurrence date, so reopening the app does not duplicate entries;
- schema 8 to schema 9 migration adds the default `all` missed-occurrence policy without dropping existing records;
- old SQLite recurrence rows without a policy are read as `all` and survive the next normal repository save;
- emulator smoke shows one monthly EUR 2.50 entry generated for today, next occurrence 2026-08-26, and the same EUR 2.50 total after restart.

Not yet complete: missed-occurrence choices, end-of-month anchor preferences, recurring task rules, alerts, and sync.

## Import and restore implementation review

Implemented and verified:

- JSON export schema 1 can be pasted into Data tools and previewed without changing local data;
- supported app schemas are migrated to schema 12 before restore;
- restore rejects malformed JSON, unsupported versions, duplicate IDs, missing references, invalid timestamps/currencies, and split totals that do not match their parent;
- the user must confirm the preview before the validated data replaces the current workspace.

Not yet complete: CSV import, merge behavior, sync restore, and account recovery.

## Encrypted backup implementation review

Implemented and verified:

- the user can create a password-encrypted backup from Data tools;
- the backup uses a versioned header, secure random salt and nonce, scrypt key derivation, and XChaCha20-Poly1305 authenticated encryption;
- the user can decrypt a backup with the password, preview its creation date and record counts, and confirm replacement only after validation;
- wrong passwords, tampering, weak passwords, unsupported parameters, and plaintext leakage are covered by tests.

Not yet complete: platform backup policy, remote encrypted sync, and password recovery.

## Encrypted backup file portability review

Implemented and verified:

- the user can save an encrypted JSON backup through the system document picker;
- the user can select an encrypted JSON backup file and receive the same authenticated decrypt, validation, and preview flow as pasted text;
- temporary app-cache files are removed after a successful or failed save operation, and a canceled picker leaves the workspace unchanged;
- file operations preserve the existing password, crypto, and restore validation rules.

Not yet complete: platform backup policy, remote encrypted sync, and password recovery.

## Recurring policy implementation review

Implemented and verified:

- every recurring money rule stores `all`, `one`, or `skip` missed-occurrence behavior;
- `all` creates every due date, `one` creates only the first due date, and `skip` creates none;
- every policy advances the next occurrence beyond the full missed range, so restart does not repeat skipped dates;
- schema 8 rules migrate to schema 9 with `all` as the explicit default;
- the recurrence form shows the policy and the rule list shows the stored choice.

Not yet complete: end-of-month anchor preferences, recurring task rules, notifications, sync, and account recovery.

## Latest-only data boundary

This section supersedes compatibility claims in the earlier phase-review sections below and above it; those entries record what earlier code did before the latest-only change. The unreleased build accepts app schema 26, export schema 1 carrying app schema 26 data, encrypted backup schema 2, and SQLite repository schema 2 only. Fresh SQLite startup seeds current empty data. Old app data, old encrypted backups, old repository schema 1, and incomplete current records are rejected with explicit errors; no legacy AsyncStorage product-data import or migration chain is shipped. A public release must define an upgrade or reset policy before external users receive the app.

Current task extension: local projects support active/completed status, archive/restore, and reference-safe deletion. Tasks can carry one optional project link, and JSON, encrypted backup, SQLite, and global search preserve and validate that link.

Current focus extension: App Time supports local app groups and one manual focus session at a time. Sessions can link to a task, project, note, and app group, record completed/manual stop state, persist through JSON, encrypted backup, and SQLite, and appear in global search. App groups label package names only; they do not block apps or inspect app content.

## Local recovery-key backup implementation review

Implemented and verified:

- the user can generate a 32-byte secure recovery key in Data tools;
- the key is shown in eight uppercase hexadecimal groups and must be re-entered before saving;
- a separate recovery-key encrypted JSON file is saved through the system document picker without storing the key;
- restore accepts the grouped or ungrouped key, normalizes it from the authenticated envelope marker, and previews the same validated workspace records;
- malformed recovery keys, wrong keys, and tampered envelopes fail before any workspace write.

Not yet complete: account recovery, device enrollment, platform backup policy, remote encrypted sync, and password recovery.

## Local note attachment implementation review

Implemented and verified:

- `NOTE-06` local pass: a note can hold up to 10 image, PDF, or plain-text files;
- each file is copied into app-private storage and checked for a safe name, supported MIME type, size from 1 byte through 10 MiB, and a lowercase SHA-256 checksum;
- attachment metadata is stored in SQLite-backed app records, included in JSON/encrypted-backup metadata, and validated against its parent note on restore;
- Notes shows file names and sizes and removes the private file before removing the metadata.

Android preview is implemented: Notes can open a supported private image, PDF, or plain-text attachment through a validated FileProvider URI and the system chooser. iOS preview, synced attachments, and attachment search are not yet complete.

## Local note tags and search implementation review

Implemented and verified:

- app data schema 12 adds note lifecycle state to the normalized tag array already stored on every note;
- schema 10 AsyncStorage notes and older SQLite note rows migrate to an empty tag array and `isArchived: false` without changing their title or body;
- tags are trimmed, lowercased, deduplicated, and limited to 20 values of at most 40 characters;
- Notes search matches title, body, tags, and attachment file names case-insensitively and keeps the query local. It never inspects attachment bytes.

Note lifecycle is implemented and verified:

- users can edit title, body, and tags with the same validation as note creation;
- users can pin/unpin notes, archive/restore notes, and delete notes after confirmation;
- archived notes are hidden by default, with an explicit Show archived notes control; pinned notes sort first;
- deleting a note removes its attachment metadata and private attachment files.

Saved-search controls are implemented and verified:

- users can save the current local note query with a trimmed name and the current archived-note visibility mode;
- users can Apply a saved search or delete it after confirmation;
- names are limited to 80 characters and queries to 200 characters;
- saved searches persist locally and are included in JSON and encrypted backup data.

Local global-search controls are implemented and verified:

- Home opens Search and the screen searches supported local money, notes, tasks, saved searches, account/category, transfer/split/budget, recurrence, time-goal, and app-time metadata records;
- matching is case-insensitive and result order is deterministic;
- archived notes, accounts, categories, budgets, and time goals stay hidden unless archived results are enabled;
- app-time results require granted Usage Access and an included snapshot.

Not yet complete: synced search, synced notes, and remote sync.

Note-to-task conversion is implemented and verified:

- a note can create a new open task with the note title and body;
- the task stores `sourceNoteId` and the source note remains unchanged;
- deleting the source note leaves the task and its source ID, so the task can show `Deleted note`;
- schema 13 tasks migrate to schema 14 with `sourceNoteId: null`.

Task lifecycle basics are implemented and verified: create, edit, complete/reopen, delete after confirmation, due date, priority, Inbox list, All/Overdue/Today/Upcoming/Completed views, persisted manual order with Up/Down controls, Manual/Due date/Priority sorting, and a device-local 14-day Agenda view. Recurring task rules, task dependencies with cycle rejection and completed-prerequisite blocking, one-off Android local reminders, the local 15/30/60/120-minute snooze setting, separate global and recurring-task reminder categories, and the local `Open`/`Complete`/`Snooze` reminder actions are implemented; selected timezone/week-start settings, broader notification automation, and remote sync remain planned.

## Portable encrypted attachment implementation review

Implemented and verified:

- new encrypted backup schema 2 payloads include every note attachment's ID, size, checksum, and base64 file bytes inside authenticated ciphertext;
- backup creation reads each private file and rejects missing, changed, over-limit, or checksum-invalid files before sharing or saving;
- restore validates the complete attachment set, stages private files, and only then replaces the workspace after user confirmation;
- encrypted backup schema 2 is the only supported encrypted backup format, while plain JSON restore rejects attachments because it has no file bytes.

Not yet complete: platform backup policy, synced attachments, iOS preview, remote encrypted sync, and password recovery.
