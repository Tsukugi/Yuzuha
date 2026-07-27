# Decision log

Status: Initial planning record. Add a dated entry when a decision changes.

## DEC-001: Android-first, dual-platform shell

- Status: Accepted.
- Decision: Build and validate Android MVP first, while keeping the native shell portable to iOS.
- Reason: App-time access is an Android-specific first feature, but the project intent includes both platforms.
- Consequence: Do not promise identical app-time behavior on iOS without a separate platform design.

## DEC-002: Local-first MVP

- Status: Accepted.
- Decision: No account or cloud sync is required for the first release.
- Reason: The core value is personal tracking and privacy is a product principle.
- Consequence: Export, deletion, migration, and device backup behavior need explicit design.

## DEC-003: SQLite for product records

- Status: Planned recommendation; package open.
- Decision: Use a SQLite-backed repository for money, usage snapshots, notes, and tasks.
- Reason: These records need filters, totals, search, and versioned migrations.
- Consequence: The team must select a maintained binding and test encryption/backup behavior before implementation.

## DEC-004: AsyncStorage is not the product database

- Status: Accepted.
- Decision: Limit AsyncStorage to small preferences and installer metadata.
- Reason: Large relational records and migrations do not fit its intended use.
- Consequence: Do not add feature records to AsyncStorage as a shortcut.

## DEC-005: Verified bundle before `MainApp`

- Status: Accepted.
- Decision: The shell checks and selects a verified bundle before rendering `MainApp`.
- Reason: The project explicitly ships an embedded installer and must avoid running unverified code.
- Consequence: Installer tests and release metadata are part of every startup-related change.

## DEC-006: Open choices before implementation

- Status: Open.
- Choices needed: minimum Android API, navigation package, SQLite binding, encryption approach, main currency behavior, backup policy, update signing key ownership, and analytics policy.

## DEC-007: Full product stays personal by default

- Status: Accepted.
- Decision: The product is for one person and their own devices. Live shared workspaces are not part of the core full-product scope.
- Reason: The user’s stated need is personal tracking; shared collaboration would change privacy, permissions, and conflict design.
- Consequence: Export/share of selected information may exist, but collaboration needs a separate decision.

## DEC-008: Local-only mode remains complete

- Status: Accepted.
- Decision: Account sync is optional and must not remove core capture, review, export, or delete behavior.
- Reason: Privacy and offline use are core product principles.
- Consequence: Every sync feature needs a local-only state and test.

## DEC-009: Sync uses encrypted change envelopes

- Status: Planned architecture; security review required.
- Decision: Sync sends encrypted change records, not plaintext product records.
- Reason: Notes, tasks, money, and app-time data are sensitive.
- Consequence: Recovery, conflict resolution, device enrollment, and service observability need explicit designs.

## DEC-010: Financial conflicts are never silently merged

- Status: Accepted.
- Decision: Same-object conflicts for money create a visible conflict record and preserve both revisions.
- Reason: An incorrect financial total is worse than a visible conflict.
- Consequence: Sync UX must support keep-local, keep-remote, keep-both, and edit-merged-copy.

## DEC-011: Projections are rebuildable

- Status: Accepted.
- Decision: Search indexes, dashboard cards, reports, and notification schedules are projections of source records.
- Reason: Rebuildable projections reduce migration and recovery risk.
- Consequence: Every projection needs a rebuild command, version, and fixture test.

## DEC-012: Provider connections remain optional

- Status: Accepted.
- Decision: Bank/card connections are not required for the personal core and remain a later evaluated integration.
- Reason: They add regional, legal, security, and support obligations.
- Consequence: Manual entry and import/export must remain first-class.

## DEC-013: Upgrade the implementation baseline

- Status: Accepted.
- Decision: Use React Native 0.86.0, React 19.2.8, Metro 0.86.x, CLI 20.2.x, and TypeScript 5.9.x for implementation.
- Reason: The user asked to use newer technology rather than preserve the older 0.83.0 scaffold baseline.
- Consequence: Node 20.19.4 or newer is required, Java 17 is used for Android builds, and the native project must be regenerated from the newer template.

## DEC-014: Use an app-owned SQLite repository boundary

- Status: Accepted.
- Decision: Use `@op-engineering/op-sqlite` 17.1.2 behind `SqliteWorkspaceStore` for local product data. Keep AsyncStorage for installer metadata, preferences, and one-time legacy import.
- Reason: Product records need transactions, migrations, period queries, and currency-safe reports. Feature UI must not depend on a native SQL API.
- Consequence: The first SQLite schema stores typed record rows and a repository schema version. Unsupported versions and malformed rows block the workspace with a deterministic error until a migration or repair path exists.

## DEC-015: Keep transfers separate from income and expense entries

- Status: Accepted.
- Decision: Store a transfer as a source record with two active same-currency account IDs. Project account balances from opening balances, entries, and transfers; do not represent a transfer as income or expense.
- Reason: Moving money between accounts must change account balances without changing spending or income reports.
- Consequence: Cross-currency transfers, split entries, and normalized financial tables need separate contracts and validation passes.

## DEC-016: Split entries keep one balance-affecting parent

- Status: Accepted.
- Decision: Store one parent money entry with linked split lines. The parent amount affects the account balance once; report projections expand the lines by category.
- Reason: Split lines must reconcile exactly without double-counting the account or period total.
- Consequence: A save requires at least two positive lines whose integer minor-unit sum exactly matches the parent. Split parents are managed from the split screen.

## DEC-017: Budget projections use local source records

- Status: Accepted.
- Decision: A budget stores one active expense category, currency, positive minor-unit limit, and day/week/month period. Used and remaining values are rebuilt from matching expense entries and split lines in the current local period.
- Reason: Budget values must follow the same source records as reports and must not count income, transfers, other currencies, or entries outside the selected period.
- Consequence: Recurring budgets and alerts remain separate future contracts.

## DEC-018: Normalize financial SQLite tables at repository schema 2

- Status: Accepted.
- Decision: Store money entries, transfers, split parents/lines, and budgets in normalized SQLite tables. Keep smaller non-financial collections in the typed `app_records` table during this phase.
- Reason: Financial queries need typed amounts, currencies, dates, account links, and category links without parsing JSON. The boundary also makes future reports and imports easier to test.
- Consequence: Repository schema 1 requires a deterministic rewrite migration. Unsupported repository versions still block instead of guessing.

## DEC-019: Carry forward one previous budget period

- Status: Accepted.
- Decision: A budget with `carry-forward` adds the previous day, week, or month unused positive balance to the current limit, capped at one base budget amount. `none` adds zero.
- Reason: The rule is easy to explain, deterministic across restarts, and prevents multi-period debt or unbounded accumulation in the first budget release.
- Consequence: Recurring budgets, multi-period carry chains, and alerts remain separate future contracts.

## DEC-020: Use versioned shareable exports and confirmed local deletion

- Status: Accepted.
- Decision: Provide JSON for all supported local records and CSV for money entries. Include explicit export and app schema versions, send the selected format through the Android system share sheet, and require confirmation before resetting the local workspace to seeded defaults.
- Reason: The first release needs user-controlled portability and deletion without adding a remote account or a provider-specific file service.
- Consequence: File-picker import, encrypted backup, and cross-device sync remain separate contracts.

## DEC-021: Use local calendar dates for recurring money rules

- Status: Accepted.
- Decision: Store a recurrence's next date as `YYYY-MM-DD`, cadence, interval, account/category links, missed-occurrence policy, and pause state. On workspace load and rule creation, apply the policy through the current local date, use a deterministic rule/date entry ID, and advance the rule in the same repository save.
- Reason: Calendar dates avoid elapsed-millisecond drift across restarts and timezone changes. Deterministic IDs prevent duplicate entries when the same workspace is reopened.
- Consequence: End-of-month anchor preferences, notifications, and recurring task rules remain separate contracts.

## DEC-022: Restore JSON by validated replacement

- Context: The local JSON export is the complete app-data contract, while merging arbitrary pasted data would make duplicate IDs and broken references hard to reason about.
- Decision: Restore only export schema 1 envelopes. Migrate supported app schemas, validate the complete record shape and key financial invariants, show record counts, and replace the current workspace only after explicit confirmation. A validation or save failure must leave the current workspace in place.
- Consequence: The first restore flow is paste-based JSON replacement. CSV import, encrypted backups, merge conflict UI, file picking, and sync restore remain separate work.

## DEC-023: Make missed recurrence handling explicit

- Context: A rule may be opened after several local calendar dates have passed, and silently choosing a catch-up behavior can create unexpected money records.
- Decision: Persist `all`, `one`, or `skip` on every recurring money rule. `all` creates every due date, `one` creates only the first due date, and `skip` creates none; each policy advances the rule beyond all missed dates in the same save.
- Consequence: Schema 8 rules migrate to `all`. End-of-month anchoring and recurring task policies remain separate decisions.

## DEC-024: Use a password-encrypted local backup envelope

- Context: Plain JSON export is useful for portability but exposes all workspace content to anyone who receives the shared text. The app needs a local backup that can be stored without plaintext.
- Decision: Use export schema 1 JSON as the plaintext payload, derive a 32-byte key with scrypt (`N=32768`, `r=8`, `p=1`), encrypt with XChaCha20-Poly1305, authenticate the versioned header as additional data, and require a password of at least 12 characters. Restore decrypts, validates, previews, and confirms before replacement.
- Consequence: Password recovery, recovery-key envelopes, attachments, file-picker files, and remote sync remain separate contracts. The password is not stored locally.

## DEC-025: Use the system document picker for encrypted backup files

- Context: Text sharing is portable but awkward for large encrypted backups and easy to lose in chat or clipboard history.
- Decision: Save and open the existing password-encrypted JSON envelope with `@react-native-documents/picker` and `react-native-file-access`. Save writes only to the app cache before the system picker copies the file; open reads the selected document and uses the existing authenticated decrypt/validation path. Picker cancellation is a no-op.
- Reason: The system provider handles Android and iOS storage destinations without adding account or server state. The file format stays the same as the text format.
- Consequence: File names and provider metadata are not security boundaries. Recovery keys, attachments, platform backup policy, and remote sync remain separate contracts.

## DEC-026: Decode encrypted backup payloads without a runtime text API

- Context: The Android runtime used by the debug APK does not provide `TextDecoder`, while the encrypted backup payload is UTF-8 JSON.
- Decision: Decode the authenticated plaintext with a small strict UTF-8 decoder owned by the backup module. Reject malformed, overlong, surrogate, and out-of-range sequences.
- Reason: The backup format stays unchanged and device behavior does not depend on an old text-encoding polyfill.
- Consequence: The decoder needs regression tests for normal Unicode content and malformed byte sequences as the backup format evolves.

## DEC-027: Use a separate local recovery-key backup credential

- Context: A password is easy to forget, while the local-first app still needs a user-controlled backup path that does not store a secret on the device.
- Decision: Generate 32 secure random bytes, display them as eight uppercase hexadecimal groups, require in-session re-entry, and use the normalized key as the credential for a separate authenticated backup envelope. Mark the envelope with `credential: recovery-key` and use a distinct recovery-backup file name. Restore normalizes grouped, ungrouped, and lowercase input only for that marker.
- Reason: The existing audited XChaCha20-Poly1305 and scrypt boundary remains the only crypto path. The key is never stored, logged, or uploaded, and the marker makes normalization deterministic without changing old password backups.
- Consequence: This is local backup portability, not account recovery or device enrollment. Attachments, sync recovery, password recovery, and native secure key storage remain separate contracts.

## DEC-028: Store note attachments locally before bundling their bytes

- Context: Notes need useful local file attachments, but putting file bytes into the existing JSON backup envelope would change its size, cleanup, and restore contracts.
- Decision: In the local pass, allow only images, PDFs, and plain-text files. Copy each selected file into app-private document storage under a validated attachment ID, enforce 10 MiB per file and 10 attachments per note, and store the file size and SHA-256 checksum with the note ID. JSON and encrypted backups carry metadata only until an attachment bundle format is designed and tested.
- Reason: This gives the user a deterministic local file boundary and keeps the current authenticated JSON backup format unchanged.
- Consequence: Backup restore can recreate metadata but not attachment files yet. Portable encrypted attachment bytes, previews, synced files, and attachment search remain separate contracts.

## DEC-029: Put verified attachment bytes inside encrypted backup ciphertext

- Context: Local note files now have stable metadata and checksums, but a metadata-only backup cannot recreate the note's file set on another device.
- Decision: Encrypted backup schema 2 stores each attachment's ID, byte size, SHA-256, and base64 bytes inside the authenticated ciphertext. The total attachment bytes per backup are limited to 32 MiB. Backup creation reads and verifies private files; restore validates all bytes, stages them in app-private storage, and then replaces the workspace. Schema 1 encrypted backups remain readable. Plain JSON export and restore stay metadata-only; a JSON restore with attachments is rejected.
- Reason: The existing XChaCha20-Poly1305 envelope already authenticates its ciphertext and header. Keeping file bytes inside that boundary avoids a second unauthenticated sidecar format.
- Consequence: Large attachment sets need a later bundle or sync contract. Attachment previews, synced files, platform backup policy, and password recovery remain separate contracts.

## DEC-030: Open local attachments through an Android FileProvider

- Context: Notes stores attachment bytes in app-private storage, but the first implementation had no way to open a saved file. An in-app renderer would add a second file parser and a wider test surface.
- Decision: On Android, expose only the selected attachment through an `androidx.core.content.FileProvider` URI. The native bridge checks the canonical file is directly under `filesDir/attachments`, accepts only the supported image, PDF, and plain-text MIME set, and starts the system chooser with read permission. Other platforms return an explicit unavailable error until they have their own tested adapter.
- Reason: The system viewer handles rendering while the private storage boundary stays narrow. The app does not grant directory access or upload the file.
- Consequence: Viewer availability depends on installed Android apps. Yuzuha does not yet provide an in-app renderer, iOS preview, attachment search, or synced attachment viewer.

## DEC-031: Store normalized note tags in app schema 11

- Context: Notes require local search over title, body, and tags, but the current note record has no tag field. Search cannot depend on display-only parsing or a remote index.
- Decision: Add `tags` to every note as a unique lowercase string array. Normalize comma-separated input by trimming, lowercasing, removing empty values, and deduplicating. Limit each note to 20 tags and each tag to 40 characters. Migrate schema 10 notes and old SQLite note rows to `tags: []`.
- Reason: A small typed field keeps the local-first search contract simple, portable through existing JSON/encrypted backups, and deterministic across Android restarts.
- Consequence: Search currently covers note title, body, and tags only. Attachment filename search, saved searches, global search, and synced indexes remain separate work.

## DEC-032: Keep note lifecycle state local and deterministic

- Context: Notes now need basic lifecycle controls without adding account or sync state.
- Decision: Add `isArchived` to app schema 12 with `false` as the migration default. Hide archived notes by default, expose an explicit archived view for restore, sort pinned notes first, and require confirmation before deletion. Deleting a note also removes its attachment metadata and private files.
- Reason: These rules are easy to explain, work offline, and keep the note list useful as it grows. The delete boundary prevents orphaned private files.
- Consequence: Archive and pin state are local fields. Synced lifecycle conflicts, saved searches, global search, and attachment filename search remain future contracts.

## DEC-033: Search attachment names without reading file bytes

- Context: Notes already stores validated attachment names, but local search only covered note title, body, and tags.
- Decision: Match the existing case-insensitive local query against attachment file names as metadata. Do not inspect attachment bytes, add an index, or send search input anywhere. Keep archived filtering and pinned-first ordering unchanged.
- Reason: File names are useful local metadata and the existing attachment model already validates them. Searching names adds retrieval value without widening privacy or file-parsing scope.
- Consequence: Saved searches, global search, and synced attachment indexes remain future contracts.

## DEC-034: Persist local saved searches in app schema 13

- Context: Notes search now covers note and attachment metadata, but repeating useful local queries needs a small durable record without introducing a global index or sync state.
- Decision: Store a trimmed saved-search name, trimmed note query, archived-note visibility flag, and created/updated timestamps in typed `saved_search` rows. Limit names to 80 characters and queries to 200 characters. Migrate schema 12 data to schema 13 with an empty collection. Include saved searches in JSON exports, encrypted backups, SQLite persistence, and validated restore.
- Reason: The record is small, local, portable, and deterministic. Apply restores the query and archived visibility together; Delete requires confirmation.
- Consequence: This is local Notes search only. Global search, synced saved searches, and remote sync remain separate work.

## DEC-035: Keep global search as a local derived projection

- Context: Yuzuha now has useful records in several local collections, but a first cross-feature search does not need a new persistent index or a sync protocol.
- Decision: Search the loaded `AppData` in memory. Match supported money, notes, tasks, saved searches, accounts/categories, transfers/splits/budgets, recurrence rules, time goals, and app-time metadata case-insensitively. Hide archived records unless the user enables archived results. Require granted Usage Access and `included: true` for app-time matches.
- Reason: The rule is small, inspectable, and follows the existing local-first privacy boundary. Deleted records are absent from the source collections, and no attachment bytes are read.
- Consequence: Search has no persistent index, date filters, command actions, or synced results yet. Those remain separate product work.

## DEC-036: Link note-created tasks by stable source ID

- Context: A note can contain a next action, and the Phase 3 contract requires converting it into a task without changing the source note.
- Decision: Add nullable `sourceNoteId` to tasks in app schema 14. The Notes action creates a new open task from the note title/body. A missing source ID remains valid so Tasks can show `Deleted note` after source deletion. Existing schema 13 tasks migrate with `null`.
- Reason: A stable ID preserves provenance without copying mutable note state into a hidden relationship or deleting the task when the note is deleted. The action remains local and works offline.
- Consequence: This pass does not add task editing, projects, reminders, recurrence, or synced links.

## DEC-037: Keep task lifecycle local and date-only in schema 15

- Context: Tasks now need useful local work controls, but reminders, recurring tasks, and sync need separate product contracts.
- Decision: Add `priority` and a required `listId` to tasks, seed one `Inbox` list, and keep due dates as validated `YYYY-MM-DD` strings. Implement create, edit, complete/reopen, confirmed delete, and deterministic All/Overdue/Today/Upcoming/Completed filters locally.
- Reason: Date-only values avoid timezone surprises, the Inbox default keeps creation simple, and the lifecycle is testable without a notification or sync service.
- Consequence: Custom list management, recurring tasks, reminders, synced links, account recovery, and remote sync remain future work.

## DEC-038: Make task-list deletion reference-safe

- Context: The schema already has task lists, but the first UI exposed only the seeded Inbox list.
- Decision: Allow local custom list create, rename, archive/restore, and delete. Normalize names by trim and case-insensitive uniqueness, cap names at 60 characters, protect Inbox from archive/delete, and reject deletion while any task references the list.
- Reason: These rules keep task links valid without moving tasks silently or adding a recovery workflow. Archived lists remain readable so existing tasks do not lose context.
- Consequence: Moving tasks between lists, recurring task lists, synced list changes, account recovery, and remote sync remain separate work.

## DEC-039: Keep recurring tasks local and deterministic in schema 16

- Context: Basic task lifecycle and custom lists exist, but repeating work needs a clear local data contract before reminders or sync.
- Decision: Add a separate task recurrence rule with a title, details, priority, list link, day/week/month cadence, interval, next local date, pause state, and explicit `all`, `one`, or `skip` missed-occurrence policy. Expand due rules on startup and rule creation using deterministic `task_<rule>_<date>` IDs. Deleting a rule keeps generated tasks and clears their rule links.
- Reason: Date-only expansion is testable across restarts and does not require notification permission, background execution, an account, or a server. Stable IDs make re-opening idempotent.
- Consequence: Notifications, background scheduling, series editing, templates, task occurrence history, sync, account recovery, and device enrollment remain separate work.

## DEC-040: Keep task reminders one-off and Android-local in schema 17

- Context: Open tasks now need a useful reminder, but quiet hours, snooze, notification actions, and cross-device sync need larger product contracts.
- Decision: Store one nullable future local timestamp on each task. Request Android notification permission only when the user sets a reminder. Schedule with a stable task ID through `AlarmManager`, cancel before replacing or clearing, cancel when a task is completed or deleted, and rebuild the future open-task set at startup and boot.
- Reason: One reminder per task keeps the data model small and the schedule deterministic. Generic notification text avoids exposing task details on a locked screen. Native alarms survive process death without requiring a server.
- Consequence: The current pass has no quiet hours, snooze, action buttons, recurring-rule notifications, iOS implementation, or sync. Schema 16 tasks migrate with `reminderAtMillis: null`.

## DEC-041: Route task reminder taps through the stable task ID

- Context: A native reminder can outlive the React Native process, and opening only the Home screen would make the reminder hard to act on.
- Decision: Put the task ID in the Android notification content intent. The native module consumes it once on cold start and emits it on warm `MainActivity` intents. MainApp switches to Tasks and loads the matching task into edit mode; a missing ID is ignored without changing workspace data.
- Reason: The existing task ID is already the schedule identity, so no new schema field or sensitive notification text is needed. The rule works after process death and keeps the notification payload privacy-safe.
- Consequence: Android task deep links are local-only. iOS intents, notification actions, snooze, and synced notification state remain separate contracts.

## DEC-042: Project Android reminders through local quiet hours in schema 18

- Context: One-off Android reminders are useful, but users need a local way to avoid delivery during a daily quiet window without changing the task's intended time.
- Decision: Add nullable `quietHoursStartLocalTime` and `quietHoursEndLocalTime` to app schema 18. Require both values to be present and different when enabled. For same-day and overnight windows, project an in-window reminder to the applicable local end time before native scheduling. Keep the logical `reminderAtMillis` unchanged and rebuild the projection on startup, restore, setting changes, and reminder edits.
- Reason: The rule is local, typed, deterministic, and preserves the user's original task time. Storing only a daily `HH:mm` pair avoids timezone and sync state until the broader notification contract exists.
- Consequence: There is still no snooze, notification action, category policy, recurring-rule notification, iOS reminder, or sync behavior. Schema 17 data migrates with quiet hours disabled.

## DEC-043: Keep Android reminder actions local and idempotent

- Context: A reminder can be useful without opening the full task form, but an action may arrive after the task was edited, deleted, or completed elsewhere.
- Decision: Android reminder notifications expose `Open` through the content intent and `Complete` through an action intent carrying the stable task ID. The local AppStore completes the task only when the current record exists and is open. Repeated, missing, or already-completed actions are no-ops. The logical reminder timestamp stays on the task record, while the native notification is dismissed after handling.
- Reason: The rule is deterministic, safe after process death, and does not add notification state or remote coordination to schema 18. The existing stable task ID keeps the payload opaque and reuses the local task lifecycle rules.
- Consequence: The current pass has Android `Open` and `Complete` only. Snooze, recurring-rule notifications, iOS actions, account recovery, device enrollment, and sync remain separate contracts.

## DEC-044: Make Android reminder snooze fixed and local

- Context: A delivered reminder needs a quick deferral, but user-selected durations, recurring notification state, and synced schedules need a larger contract.
- Decision: Android reminder notifications expose `Snooze 1h`. The action uses the local action time plus exactly 3,600,000 milliseconds as the new logical task reminder, removes the prior native schedule, schedules the quiet-hours projection, and commits the new timestamp. Missing or completed tasks are no-ops. The notification is dismissed after handling.
- Reason: One fixed duration is easy to explain, test, and keep consistent across process death without adding schema or preference state. The existing reminder field and projection path remain the single source of truth.
- Consequence: Current Android actions are `Open`, `Complete`, and `Snooze 1h`. User-selected durations, recurring-rule notifications, iOS actions, account recovery, device enrollment, and sync remain separate contracts.

## DEC-045: Store a small local snooze-duration policy in schema 19

- Context: A fixed one-hour snooze is useful, but different users need a short or longer local deferral. The choice must survive restarts and restore without becoming synced notification state.
- Decision: Add required `notificationSettings.snoozeDurationMinutes` to app schema 19. Accept only 15, 30, 60, or 120 minutes, default old schema 18 and legacy SQLite data to 60, show the choice in Tasks notification settings, and let the Android `Snooze` action use the selected value. Keep the native action label generic because Android reads the action only after JavaScript loads the local workspace.
- Reason: The bounded enum is easy to validate, migrate, explain, and test. It preserves the local-first boundary and keeps the task reminder timestamp as the only scheduled record.
- Consequence: Current Android supports local `Open`, `Complete`, and configurable `Snooze`. Recurring notification policy, per-notification custom durations, iOS actions, account recovery, device enrollment, and sync remain separate contracts.

## DEC-046: Pause the local task-reminder category in schema 20

- Context: Users need to stop task reminder interruptions temporarily without losing reminder times already attached to tasks.
- Decision: Add required `notificationSettings.taskRemindersEnabled` to app schema 20, default old schema 19 and legacy SQLite data to `true`, and expose an On/Off setting in Tasks. When disabled, AppStore sync clears all native task-reminder alarms, reminder creation stores only the logical timestamp, and stale `Snooze` actions are no-ops. Re-enabling rebuilds future alarms through the existing quiet-hours projection.
- Reason: The logical task timestamp remains the source of truth while the native schedule becomes an explicit projection controlled by one local category flag. This avoids deleting user data and prevents a stale notification action from silently re-enabling reminders.
- Consequence: The current category pause is local and Android-focused. Per-category automation, global pause, timezone rules, recurring-rule notifications, iOS reminders, and sync remain separate contracts.

## DEC-047: Copy an optional local reminder time from recurring task rules in schema 21

- Context: Recurring rules create tasks, but users currently have to edit every generated task to add the same reminder.
- Decision: Add nullable `reminderLocalTime` to task recurrence rules in app schema 21. Accept only strict `HH:mm`, copy it to each generated task's local reminder timestamp, and synchronize future generated reminders immediately and during startup/boot. Existing schema 20 rules migrate to `null`; existing tasks are not changed when a rule is later edited or deleted.
- Reason: The rule remains the single source for future occurrences while each task keeps its own timestamp for completion, snooze, and deletion behavior. The existing category pause and quiet-hours projection continue to control native scheduling.
- Consequence: A rule can create local task reminders but does not create a separate rule notification. Past occurrence timestamps are not scheduled, invalid date/time combinations such as a local DST gap produce no native schedule, and recurring summaries, sync, and iOS behavior remain separate contracts.

## DEC-048: Use a latest-only data boundary before public release

- Context: Yuzuha has no external users or released data. The repository carried app-schema migrations, a legacy AsyncStorage import, SQLite schema-1 rewriting, and old encrypted-backup readers.
- Decision: Accept only current app schema 21, export schema 1 carrying app schema 21 data, encrypted backup schema 2, and SQLite repository schema 2. Seed fresh SQLite databases directly from `emptyAppData()`. Reject older or incomplete data with explicit errors. Do not add an upgrade path until a public release creates a real compatibility obligation.
- Reason: Compatibility code adds resource cost and hides malformed data through defaults. A fresh unreleased product gets a smaller, clearer boundary and can choose an upgrade contract later with real user data and release support.
- Consequence: Existing development databases, old JSON exports, and old encrypted backups must be recreated. The next public release needs a deliberate migration or reset policy before it ships.

## DEC-049: Pause recurring-task reminders independently in schema 22

- Context: The global Task reminders switch pauses every task reminder, but recurring-task reminders are a distinct source of interruptions. The app has no public users or released data, so this setting can be added without carrying a compatibility path.
- Decision: Add required `notificationSettings.recurringTaskRemindersEnabled` to app schema 22, default fresh workspaces to `true`, and expose a separate local On/Off setting in Tasks. Native scheduling is allowed only when the global Task reminders flag is enabled and either the task has no recurrence rule or the recurring-task flag is enabled. Keep logical reminder timestamps when the recurring category is paused.
- Reason: One deterministic predicate controls startup, restore, recurrence expansion, reminder creation, snooze, task reopen, and rollback behavior. One-off task reminders remain useful when only recurring interruptions are paused.
- Consequence: Schema 21 data is rejected rather than upgraded. The current policy is local and Android-focused; recurring summaries, timezone rules, iOS reminders, and sync remain separate contracts.

## DEC-050: Store completed-prerequisite task dependencies in schema 23

- Context: Tasks need a small ordering contract before projects and richer workflows. A dependency must be local, inspectable, and safe to validate without adding a project or sync model.
- Decision: Add `taskDependencies` to app schema 23. Each record names a prerequisite task and a dependent task and uses the only current condition, `completed`. Reject missing references, self-links, duplicate links, and cycles. Keep a dependent task open while any prerequisite is incomplete; delete dependency edges when either task is deleted.
- Reason: A single condition and deterministic graph rule provide useful blocking behavior without pretending to implement projects, subtasks, or remote conflict handling. The source task and dependent task remain ordinary task records.
- Consequence: Schema 22 data is rejected rather than upgraded. Richer dependency types, projects, cross-feature links, sync, and calendar behavior remain separate contracts.

## DEC-051: Keep the first task agenda device-local and derived

- Context: Tasks already store validated local due dates, but the List view makes dated work harder to scan. A full calendar needs timezone, week-start, integration, and preference contracts that are not yet selected.
- Decision: Add a derived Agenda mode that groups tasks with due dates for the next 14 device-local calendar days. Include open and completed tasks in their date group, leave undated tasks in List mode, and do not add a schema field or persisted projection.
- Reason: The user gets a useful planning view without duplicating task data or inventing timezone behavior. The fixed bounded window is easy to test and keeps rendering work small.
- Consequence: Selected timezone/week-start preferences, month/week navigation, calendar integration, and remote agenda state remain planned.

## DEC-052: Remove dead legacy UI after the latest-only boundary

- Context: The unreleased build already removed old product-data imports and compatibility paths, but `MainApp` still contained a commented-out task screen from an earlier rewrite.
- Decision: Remove the dead commented screen. Keep historical migration and release notes as audit history, but keep only the current implementation in source files.
- Reason: Unused code increases review and maintenance cost without helping a user or a supported runtime path.
- Consequence: No schema or runtime behavior changes. Future compatibility work must be added only when a public release creates a real upgrade contract.

## DEC-053: Persist task order and keep list sorting local

- Context: The task contract requires manual, due-date, and priority sorting, but the current Task record had no persisted manual order and the UI preserved insertion order only.
- Decision: Add required non-negative `Task.sortOrder` in app schema 24. Allocate the next order within a list for new, note-linked, moved-list, and recurring tasks. List mode offers Manual, Due date, and Priority sorting; the All view swaps adjacent manual orders through Up and Down controls when Manual sorting is selected. Due-date sorting places undated tasks last; priority sorting uses High, Normal, then Low. Agenda keeps its existing source order within each local date.
- Reason: Manual order must survive restart, export, backup, and restore. Derived sort modes should not rewrite source records, and the fixed tie rules keep results deterministic without a separate index or sync contract.
- Consequence: Schema 23 data is rejected rather than upgraded. Cross-device ordering, selected timezone/week-start rules, bulk reorder, and sync remain separate contracts.

## DEC-054: Keep the first project contract local and task-scoped

- Context: The product needs grouping for tasks, but notes, money, focus sessions, subtasks, templates, and sync do not have a shared project contract yet.
- Decision: Add schema 25 `projects` with a unique local name, active/completed status, and archive state. Give each task one optional `projectId`. Offer project controls in Tasks, keep archived links readable, and reject project deletion while any task references it.
- Reason: This gives task grouping useful now without inventing cross-feature ownership or a sync conflict model. A single optional link is small, typed, and easy to validate across SQLite, JSON, encrypted backup, and search.
- Consequence: Schema 24 data is rejected rather than upgraded. Notes, money, app-time, focus, subtasks, templates, cross-device projects, and sync links remain separate future contracts.

## DEC-055: Keep focus sessions manual and local

- Context: The full-product time layer defines focus sessions with optional links, but Yuzuha does not yet have a platform app-blocking adapter or a background timing service.
- Decision: Add schema 26 `appGroups` and `focusSessions`. Allow one active manual session, derive elapsed time from stored timestamps, and record `completed`, `manual`, or `interrupted` outcomes. App groups store trimmed package-name labels and can be linked to a session.
- Reason: The user gets an auditable focus history without a background worker, hidden monitoring, or a false promise that the app can block other apps. Timestamp-derived duration survives restart and is easy to validate.
- Consequence: App blocking, background/notification focus automation, app-group assignment from a full installed-app catalog, cross-device sessions, and sync remain separate contracts. Schema 25 data is rejected rather than upgraded.

## DEC-056: Keep subtasks as one same-list parent link

- Context: Tasks need a small local hierarchy, but there is no need for a separate subtask table, cross-list hierarchy, or sync conflict model before public users exist.
- Decision: Add schema 27 `Task.parentTaskId`. Allow one optional parent in the same task list, reject missing parents, self-links, and cycles, and promote direct children when a parent is deleted.
- Reason: A single typed link keeps storage and UI small, supports nested subtasks through the same rule, and gives deletion a deterministic result without preserving a deleted record.
- Consequence: Cross-list subtasks, templates, recurring subtask trees, cross-device hierarchy merges, and sync remain separate future contracts. Schema 26 data is rejected rather than upgraded.

## DEC-057: Keep task templates local and task-shaped

- Context: Repeated task capture is useful, but a full template engine would need cross-feature payloads, variables, recurrence ownership, and sync conflict rules.
- Decision: Add schema 28 `TaskTemplate` records with a unique name, task title/details, priority, list, and optional project. Allow edit, archive/restore, delete, and direct creation of a normal task from an active template.
- Reason: The contract removes repeated typing while keeping one clear source of truth: templates are reusable inputs, and created tasks are ordinary independent records.
- Consequence: Templates do not copy reminders, due dates, parents, recurrence rules, source-note links, or dynamic variables. Cross-feature templates, template version history, recurring template expansion, and sync remain future contracts. Schema 27 data is rejected rather than upgraded.

## DEC-058: Keep quick capture as routing, not a new record type

- Context: Home should make common entry faster, but a second capture store would duplicate Money, Notes, and Tasks validation and create another restore/search contract.
- Decision: Add a local Quick capture menu with Add money, Add note, and Add task targets. Selecting a target changes the active tab and opens the existing feature form.
- Reason: The user gets one fast entry point while each feature keeps ownership of its fields, validation, persistence, and errors. The menu is cheap to render and has no background work.
- Consequence: Share intents, widgets, lock-screen capture, templates across features, and a global draft object remain separate future contracts. No app schema change is needed.

## DEC-059: Keep Android share capture ephemeral and text-only

- Context: Android share entry is useful for fast capture, but accepting files, URLs, or a second draft store would expand the privacy, storage, and restore contract before the product has users.
- Decision: Accept only `ACTION_SEND` text payloads, with optional subject, and cap each field at 20,000 characters before the native bridge. Show one review screen. On confirmation, save through the existing Note or Inbox Task AppStore methods; otherwise dismiss without persistence. Clear consumed activity extras and deduplicate the same cold/warm payload.
- Reason: This gives one useful entry point with a bounded memory cost and one source of truth for validation. It does not fetch remote content, add a schema field, run a worker, or create legacy compatibility work.
- Consequence: File/URI shares, widgets, dynamic shortcuts, iOS share handling, remote URL preview, persisted drafts, and sync remain separate contracts and need their own privacy and platform review.

## DEC-060: Keep launcher shortcuts static and navigation-only

- Context: Android launcher entry points can shorten the path to existing records, but dynamic shortcut state, personalized content, and widget data would add lifecycle, privacy, and persistence work before public users exist.
- Decision: Add four static shortcuts: Add money, Add note, Add task, and App time. Each carries only a fixed action ID into `MainActivity`; the typed native bridge handles cold and warm delivery and `MainApp` routes to an existing screen. Do not store shortcut state or run background refresh.
- Reason: This gives fast access while reusing the current forms and keeps launcher metadata free of money, note, task, and app-time content. The action contract is small and testable on both an emulator and phone.
- Consequence: Dynamic/user-configured shortcuts, widgets, lock-screen content, iOS shortcuts, and shortcut actions that prefill a record remain separate future contracts. No app schema change is needed.

## DEC-061: Save supported shared files as note attachments only

- Context: Android can share content URIs, and Yuzuha already has a private attachment store with size, MIME, and checksum validation. A task has no attachment field, so offering a task action for a file would silently discard the file.
- Decision: Accept only image/jpeg, image/png, image/gif, image/webp, application/pdf, and text/plain streams. Require a provider display name, reject known sizes over 10 MiB, show metadata in the existing review screen, and offer Save as note or Dismiss. Copy through the existing local-file path and commit the new note plus attachment together. Keep text shares on the existing note/task actions.
- Reason: This reuses the tested attachment boundary, keeps native payloads to URI metadata rather than bytes, and gives one deterministic destination for a file without adding a new record type or migration.
- Consequence: Unsupported file types, file-to-task links, remote URL fetching, persisted share drafts, widgets, iOS share handling, and sync remain separate contracts. The sending app must grant URI read access for the review/save window.

## DEC-062: Keep the first Android widget as a count-only projection

- Context: A home-screen widget can shorten review time, but exposing note text, task text, money values, or app-time rows would create a lock-screen privacy contract and more refresh work before public users exist.
- Decision: Add one Android summary widget that shows only open-task and non-archived-note counts. Refresh it after the JavaScript store loads or commits workspace data, store only the two counts in app-private preferences, use `updatePeriodMillis=0`, and open `MainActivity` when tapped.
- Reason: The count summary is useful, bounded, cheap to update, and does not require a worker, new schema, new record type, or raw content on the launcher.
- Consequence: SQLite remains authoritative if the projection is unavailable. User-selected cards, quick actions, dynamic widgets, lock-screen controls, iOS widgets, and sync remain separate contracts.

## DEC-063: Keep Android deep links local and tab-only

- Context: Deep links can shorten entry into the app, but record IDs, query parameters, remote URLs, and action payloads would create a new security and object-addressing contract before public users exist.
- Decision: Accept only `ACTION_VIEW` links with the exact custom routes `yuzuha://open/money`, `/notes`, `/tasks`, and `/app-time`. Validate and clear them natively, then route to existing tabs through a cold-start getter or warm-app event.
- Reason: The contract is useful, deterministic, local-only, and reuses existing screens without adding storage, network, or background work.
- Consequence: Malformed and unsupported links are ignored. Record-specific links, verified remote App Links, iOS deep links, and link-driven actions remain separate contracts.

## DEC-064: Keep the first calendar integration as a one-way task draft

- Context: A dated task can be useful in the user's calendar, but calendar reads, event ownership, permissions, selected timezone behavior, and reconciliation are not defined yet.
- Decision: Add a `Calendar` task-row action on Android only. Validate the task title and local due date, then open the system `ACTION_INSERT` editor with an all-day local interval and task details. Do not request calendar permissions, read calendar rows, store an event ID, add a schema field, or run a worker.
- Reason: This gives a useful handoff with a small, deterministic boundary and keeps Yuzuha's local task as the only product source of truth.
- Consequence: The user must confirm the external draft and Yuzuha cannot report whether it was saved. Two-way calendar behavior, reconciliation, selected calendar/timezone settings, focus-session export, and iOS parity remain separate future contracts.

## DEC-065: Do not clear unknown cold-start intents

- Context: `MainActivity` receives launcher actions and deep links through the same Android intent. The launcher bridge previously cleared every initial intent even when it did not recognize the action, which erased cold deep links before `DeepLinkModule` could read them.
- Decision: Clear the activity intent only after `LaunchActionsModule` recognizes one of its fixed launcher actions. Leave unknown intents unchanged for the next typed adapter.
- Reason: Each adapter owns only its own accepted input. The rule is deterministic and preserves independent entry-point contracts without adding retries or recovery behavior.
- Consequence: A cold deep link reaches its adapter; unknown intents remain available for later adapters and are otherwise ignored. The release smoke test covers the regression.

## DEC-066: Keep money CSV import strict and append-only

- Context: Money CSV export already provides a portable entry list, but arbitrary bank mappings, split payloads, duplicate policy, and import history are not defined. Silent coercion would change the meaning of money records.
- Decision: Accept only the current Yuzuha money CSV header and app schema. Bound the file to 5 MB and 5,000 rows, parse quoted fields, preserve IDs/timestamps, require current account/category references and matching account currency, reject split-linked rows and duplicates, preview errors/totals, and append only after confirmation in one local save.
- Reason: The contract gives current users a useful local merge path while keeping JSON/encrypted backup as the complete workspace format. Bounded parsing keeps memory and UI work predictable.
- Consequence: Arbitrary bank CSV mapping, missing-reference repair, split-row import, import history/undo, multi-file import, sync restore, and legacy CSV versions remain separate future contracts.

## DEC-067: Restore current JSON exports through the system picker

- Context: JSON restore already validates a complete current workspace, previews record counts, and requires destructive confirmation, but the first UI accepted only pasted text. File selection should not force large exports through the clipboard or add a second restore contract.
- Decision: Accept one `application/json` or `text/json` file through the system picker, copy it to the app cache, enforce a 5 MB bound, read it once, pass it to the existing current-schema parser, remove the cache copy, and reuse the existing preview and confirmed replacement path.
- Reason: This adds practical local portability with bounded memory and no new data model. The current parser remains the only JSON schema authority, so old or incomplete exports are rejected instead of migrated or guessed.
- Consequence: Encrypted backups remain on their credential/decryption path. Merge restore, arbitrary JSON mapping, multi-file selection, sync restore, and legacy JSON versions remain separate future contracts.

## DEC-068: Bound encrypted backup file reads before decryption

- Context: Encrypted backup creation limits plaintext to 64 MiB, but the document-picker open path could copy and read an arbitrarily large selected file before the envelope size check ran.
- Decision: Reject an encrypted backup above 96 MiB from picker metadata when available, check the cached file with `FileSystem.stat` before `readFile`, and always remove an oversized cache copy. Keep the existing schema 2, credential, scrypt, attachment, and restore contracts unchanged.
- Reason: The bound limits memory and decryption work at the file boundary while leaving room for base64 envelope overhead over the existing 64 MiB plaintext limit. It adds no worker, retry loop, migration, or network path.
- Consequence: Files above the bound cannot be opened through the file picker. Pasted encrypted text remains on the existing decryption path; account recovery, sync, and legacy encrypted backup schemas remain separate contracts.

## DEC-069: Query selected App Time periods one local day at a time

- Context: App Time originally read only one local day. A selected week or month needs a clear coverage range, but one wide native query could blur local-day ownership and make memory or query cost less predictable.
- Decision: Offer Today, This week, and This month. Split each selected local period into local calendar-day ranges, query them sequentially after Usage Access is confirmed, aggregate each result against its queried day, and replace usage snapshots once after all reads succeed.
- Reason: The rule gives the user an exact range and deterministic local-date totals while bounding each native call and avoiding a worker, timer, retry loop, or partial save.
- Consequence: A month refresh can issue up to 31 sequential native queries and may take longer than a day refresh. The selected UI period is not persisted, and selected timezone/week-start policy remains future work.

## DEC-070: Make the Android startup bundle gate native and latest-only

- Context: The JavaScript installer class only returned the embedded version. It could not protect the native host from an unverified remote file or satisfy the startup requirement before `MainApp`.
- Decision: Raise the Android minimum API to 33, run one bounded metadata request in the native shell before React host creation, verify the canonical metadata with the pinned Ed25519 public key, download at most 64 MiB, hash bytes as they are written, and atomically store the verified bundle plus activation state under app-private `filesDir/installer`. Pass the selected private path to `DefaultReactHost`; keep the embedded asset as the clean-install/offline baseline. JavaScript only reads the native result.
- Reason: The shell owns executable code selection. API 33 gives the current Android target a standard Ed25519 verifier without adding a native crypto dependency. One request, fixed timeouts, and no worker keep launch work bounded and avoid useless background resource use.
- Consequence: Android devices below API 33 are no longer supported. Live release publishing must use the pinned signing key and exact canonical payload. A failed remote check does not replace the newest verified local or embedded bundle; live signed activation still needs endpoint-release testing.

## DEC-071: Use one derived local period for Home cards

- Context: Home mixed monthly money totals with daily app-time totals and all-time task/note counts. That made the dashboard hard to compare and could add different currencies into the main-currency display.
- Decision: Add a local Today/This week/This month selector to Home. Filter money by the selected local range and configured main currency, usage by included local-date snapshots, tasks by open due date, and recent notes by active updated timestamp. Keep the selector in component state only.
- Reason: One visible period makes the dashboard explainable and reuses the existing period helpers without adding preferences, schema, native reads, or background work.
- Consequence: The selected Home period resets on relaunch. Money in other currencies remains available in Money reports but is not added to the Home main-currency card.

## DEC-072: Keep Period Review derived and read-only

- Context: The product needs a daily/weekly/monthly review across money, app time, tasks, and notes, but review history, reflection storage, and comparison baselines are not yet defined.
- Decision: Add a Review screen that calculates source-backed totals at render time for the selected local period and links back to existing feature screens. Do not save a review record, reflection, preference, or sync object.
- Reason: This gives the user one honest cross-feature view without creating a second source of truth or a new schema before review history and reflection rules are defined.
- Consequence: Review values change when source records change, and no past review can be reopened. Reflection text, saved baselines, comparison trends, and review history remain future contracts.

## DEC-073: Keep Money entry filters local and derived

- Context: Money history needs practical narrowing, but persisting filter preferences would add a new contract before the list and preference model need it.
- Decision: Add one typed screen-state filter for local All/Day/Week/Month period, expense/income type, category, and account. Apply it to the existing non-split entry list and keep an archived selected reference visible.
- Reason: The user gets predictable list narrowing without changing money records, reports, schema, migrations, or startup work. The existing split-entry display boundary remains the single list rule.
- Consequence: Filter state resets on relaunch and does not affect Money reports. Saved filters, cross-screen filter state, sync, and legacy filter formats remain separate future contracts.

## DEC-074: Derive Money filtered totals from the filtered list set

- Context: `MONEY-04` requires filter results and totals to agree, but the first filter pass only narrowed the history list while the separate report screen kept its own period-only state.
- Decision: Run one typed period/type/category/account filter over the existing non-split history source, use that result for the list, and group its integer minor-unit count, spending, income, and net totals by currency. Keep the separate split-aware report unchanged.
- Reason: The list and totals cannot drift, currencies cannot be mixed, and the pass adds no persisted filter preference, schema, migration, report rewrite, or background work.
- Consequence: Totals follow the non-split history boundary and filter state resets on relaunch. Split-line category totals remain in the existing report, while saved filters and cross-screen filter state remain future contracts.

## DEC-075: Add local payees as stable current-schema references

- Context: `MONEY-06` requires payees in money forms and reports, but display-name matching would break when a name changes or is archived.
- Decision: Add local payee records with trimmed case-insensitively unique names, archive instead of delete, and nullable `payeeId` references on money entries. Persist them in current JSON, encrypted backups, CSV, SQLite repository schema 3, and global search. Raise app schema to 29 and reject older versions.
- Reason: Stable IDs preserve history and keep local data portable without adding a provider, account, sync, or background contract. Latest-only schema rejection is safe because the app has no external users.
- Consequence: New and edited entries can choose only active payees; existing entries retain archived references. Recurring rules and split parents currently use no payee, and provider payees, sync, and migration remain future work.

## DEC-076: Keep Money report filters derived and split-aware

- Status: Accepted.
- Context: `MONEY-11` requires reports to explain scope while split entries must remain category-accurate and currencies must never be mixed.
- Decision: Apply one local period/type/category/account filter to report source entries. Apply the category part to split lines by stable `categoryId`, exclude transfers and out-of-range entries, and group results into separate currency cards. Keep filter state in the screen only.
- Reason: A single deterministic projection keeps the scope card, totals, and split categories aligned without adding persisted preferences, schema, migration, network work, or a background process.
- Consequence: Filter state resets when the report screen is left. Payee filters, saved report views, cross-screen filter state, and sync remain future work.

## DEC-077: Persist one local week-start setting

- Status: Accepted.
- Context: Weekly Home, Money, App Time, Review, and budget views used a fixed Monday boundary, while the product contract requires date views to state and use a selected local week rule.
- Decision: Add `AppData.weekStartsOn` with only Sunday (`0`) or Monday (`1`), default Monday, and pass it through the shared period helper and all current week-based projections. Persist it in current JSON, encrypted backups, and SQLite metadata.
- Reason: One small typed setting keeps every weekly projection aligned without timezone conversion, a worker, a network dependency, or compatibility guessing.
- Consequence: The current app schema becomes 30; missing or invalid values are rejected. The task Agenda remains device-local, and broader timezone, locale, and sync settings remain future work.
