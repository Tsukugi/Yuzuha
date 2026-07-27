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
