# Release process

Status: Planned release process.

## Current pass release notes

2026-07-27 recurring task-reminder pass:

- app data schema 21 adds nullable `taskRecurrenceRule.reminderLocalTime` with strict local `HH:mm` validation; schema 20 rules migrate to no automatic reminder time;
- generated task occurrences copy the rule time into `reminderAtMillis`, and future generated reminders synchronize immediately through the existing Task reminders category and quiet-hours projection;
- past generated reminder timestamps are retained as logical task values but are not added to native schedules;
- JSON, encrypted backup, SQLite, and legacy AsyncStorage paths validate or default the new rule field;
- recurring-rule reminder tests, full unit tests, lint, typecheck, bundle checks, Android debug/release builds, emulator UI/scheduling smoke, and phone launch smoke passed;
- rule-level notifications, recurring notification summaries, iOS reminders, and sync remain planned.

2026-07-27 Android task-reminder category-pause pass:

- app data schema 20 adds required `notificationSettings.taskRemindersEnabled`, defaulting existing schema 19 data and legacy SQLite settings to `true`;
- Tasks notification settings can pause the local Task reminders category; pausing removes native alarms without deleting logical task reminder times, and re-enabling rebuilds future alarms;
- setting a reminder while paused stores the logical timestamp without requesting permission or scheduling native work; stale `Snooze` actions while paused are no-ops;
- JSON import, encrypted backup validation, SQLite persistence, and local-store keys accept schema 20; focused migration and AppStore tests cover the pause contract;
- recurring-rule notifications, broader category policy, iOS reminders, and sync remain planned.

2026-07-27 Android snooze-duration policy pass:

- app data schema 19 adds `notificationSettings.snoozeDurationMinutes` with allowed values 15, 30, 60, and 120; existing schema 18 data defaults to 60;
- Tasks notification settings let the user choose the local snooze duration, while the Android notification action remains generic `Snooze`;
- JSON, encrypted backup, SQLite, and legacy AsyncStorage paths migrate and persist the setting; native scheduling still applies quiet-hours projection;
- focused persistence and duration tests, full unit tests, lint, typecheck, bundle checks, debug/release builds, emulator setting/action/alarm smoke, and phone launch smoke passed;
- recurring-rule notifications, broader category policy, iOS reminders, and sync remain planned.

2026-07-27 Android notification Snooze 1h pass:

- the Android reminder notification now offers `Snooze 1h` alongside `Open` and `Complete`;
- the action stores exactly one hour after the action time as the task's logical reminder, applies the existing quiet-hours projection to the native alarm, and replaces the old native schedule before committing;
- missing and completed task targets are ignored; the notification is dismissed after handling; no app-data schema, permission, or minimum-OS change was made;
- focused snooze/bridge tests, full unit tests, lint, typecheck, bundle checks, debug/release builds, emulator action/alarm smoke, and phone launch smoke passed;
- user-selected snooze durations, recurring-rule notifications, iOS reminders, and sync remain planned.

2026-07-27 Android notification Complete-action pass:

- the Android reminder notification now offers `Open` through its content tap and `Complete` through an explicit action button;
- `Complete` routes through the stable task ID and the local AppStore, completes an existing open task once, preserves its logical reminder timestamp, and ignores missing or already-completed tasks;
- the notification is explicitly dismissed after either action; no app-data schema, permission, or minimum-OS change was made;
- focused bridge and AppStore tests, full unit tests, lint, typecheck, bundle checks, debug/release builds, emulator action/dismissal smoke, and phone launch smoke passed;
- snooze, recurring-rule notifications, iOS reminders, and sync remain planned.

2026-07-27 local quiet-hours pass:

- app data schema 18 adds nullable `notificationSettings.quietHoursStartLocalTime` and `quietHoursEndLocalTime`;
- Tasks can save or disable a daily local quiet-hours window using strict `HH:mm` validation;
- reminders inside same-day or overnight quiet hours are projected to the window end for Android scheduling, while the logical task timestamp remains unchanged;
- SQLite repository metadata, JSON import/export, encrypted backups, and legacy schema 17 migration persist or validate the settings;
- full unit, lint, typecheck, bundle, debug/release build, emulator UI/alarm, and phone launch checks passed;
- snooze, notification actions, recurring-rule notifications, iOS reminders, and sync remain planned.

2026-07-27 task-reminder deep-link pass:

- notification content intents carry the stable task ID;
- cold starts read and consume the initial task ID, while warm Android launches emit the task ID to JavaScript;
- tapping a task reminder opens the matching task in the Tasks edit form;
- no schema, permission, or minimum-OS change;
- iOS notification intents, snooze, action buttons, recurring-rule notifications, and sync remain planned.

2026-07-27 task-reminder pass:

- app data schema 17 adds nullable task `reminderAtMillis`, with schema 16 tasks migrating to no reminder;
- open tasks can set one future local Android reminder using strict `YYYY-MM-DDTHH:mm` input;
- Android uses explicit `POST_NOTIFICATIONS` permission, stable task IDs, `AlarmManager`, a privacy-safe notification, and boot rescheduling;
- startup and confirmed restore synchronize future open-task reminders; completing, deleting, clearing, or replacing a reminder cancels the old schedule;
- JSON, encrypted backup, SQLite, and legacy AsyncStorage paths validate and persist the new field;
- native release metadata now includes `POST_NOTIFICATIONS` and `RECEIVE_BOOT_COMPLETED`; minimum OS is unchanged;
- snooze, notification actions, recurring-rule notifications, and sync remain planned.

2026-07-27 recurring-task pass:

- app data schema 16 adds task recurrence rules and nullable task `recurrenceRuleId` links;
- Tasks can create, pause/resume, and delete local day/week/month rules with intervals from 1 to 365;
- rule creation and startup expand due rules with deterministic local dates and explicit All, One, or Skip missed-occurrence behavior;
- schema 15 data receives an empty rule collection and `recurrenceRuleId: null`; JSON, encrypted backup, and SQLite paths validate and persist the new records;
- task-list deletion rejects lists referenced by a recurring rule;
- no permission, native, or minimum-OS change; notifications and background scheduling remain planned.

2026-07-27 task-list management pass:

- Tasks can create, rename, archive/restore, and delete custom lists locally;
- list names are trimmed, case-insensitive unique, and limited to 60 characters;
- Inbox cannot be archived or deleted, and lists with tasks cannot be deleted;
- JSON restore and SQLite persistence keep task-list records and validate task references;
- no schema, permission, or minimum-OS change;
- known limits remain notifications, background scheduling, account recovery, and remote sync.

2026-07-27 task-lifecycle pass:

- app data schema 15 adds task priority and required task-list links, with the seeded `Inbox` list;
- Tasks support create, edit, complete/reopen, delete after confirmation, and All/Overdue/Today/Upcoming/Completed views;
- schema 14 tasks migrate with `normal` priority and the `Inbox` list; SQLite and all portable data paths validate the new fields;
- no permission or minimum-OS change;
- known limits remain recurring task rules, reminders, synced notes, account recovery, and remote sync.

2026-07-27 note-to-task pass:

- app data schema 14 adds an optional `sourceNoteId` to tasks and migrates schema 13 tasks with `null`;
- Notes can create a new open task from the note title/body without changing the note;
- Tasks show the source note title, or `Deleted note` when the source no longer exists;
- JSON restore, encrypted backups, SQLite persistence, and local migration validation include the new task link;
- no permission or minimum-OS change;
- known limits remain task editing, recurring task rules, reminders, synced notes, account recovery, and remote sync.

2026-07-27 global-search pass:

- Home opens a local Search screen that searches supported money, notes, tasks, saved searches, account/category, transfer/split/budget, recurrence, time-goal, and app-time metadata records;
- archived records stay hidden unless the user enables archived results;
- app-time results require granted Usage Access and an included snapshot;
- no schema, permission, or minimum-OS change;
- known limits remain synced search, command actions, and account/device recovery.

2026-07-27 saved-search pass:

- app data schema 13 adds local saved-search records and migrates schema 12 with an empty saved-search collection;
- Notes can save the current trimmed query and archived-note visibility, then Apply or Delete a saved search;
- saved searches are included in JSON exports, encrypted backups, SQLite persistence, and confirmed restore validation;
- no permission or minimum-OS change;
- known limits remain global search, synced notes, account recovery, and remote sync.

2026-07-27 note lifecycle pass:

- app data schema 12 adds `isArchived`, with schema 11 notes migrating to `false`;
- Notes now supports edit, pin/unpin, archive/restore, and confirmed delete;
- archived notes are hidden by default and pinned notes sort first;
- confirmed note deletion removes related attachment metadata and private files;
- no permission or minimum-OS change;
- known limits remain attachment filename search, saved searches, global search, synced notes, account recovery, and remote sync.

2026-07-27 attachment filename search pass:

- local Notes search now matches validated attachment file names case-insensitively;
- search uses metadata only and never reads attachment bytes;
- no schema, permission, or minimum-OS change;
- known limits remain saved searches, global search, synced notes, account recovery, and remote sync.

## Release types

### JavaScript bundle release

Use for UI and business-logic changes that do not require native changes.

1. Run lint, unit, integration, and bundle checks.
2. Build Android and iOS bundles from the pinned toolchain.
3. Record the app version, runtime, native minimum, file size, SHA-256, and signature.
4. Upload immutable bundle files.
5. Publish matching metadata only after the file is available.
6. Run an online update, offline launch, and invalid-bundle test.
7. Monitor activation and startup failures.

### Native release

Use when changing permissions, native APIs, the embedded bundle, cache behavior, database encryption, or the minimum OS version.

1. Update native version and migration notes.
2. Test upgrade from the previous production build.
3. Verify the embedded bundle starts without network access.
4. Verify the installer can move from embedded to remote and back to last-known-good.
5. Build signed artifacts in CI.
6. Complete privacy, security, accessibility, and store metadata review.
7. Publish staged rollout and keep rollback artifacts available.

## Pre-release checklist

- [ ] Product requirements for the release are accepted.
- [ ] `README.md`, `AGENTS.md`, and affected `docs/` files are updated.
- [ ] `npm run lint` passes.
- [ ] Jest and integration tests pass.
- [ ] `npm run check-bundle` passes against release metadata.
- [ ] Android debug and release builds pass.
- [ ] Clean install, upgrade, offline, and process-death tests pass.
- [ ] Installer signature, hash, size, compatibility, and rollback tests pass.
- [ ] Database migration and export/delete tests pass.
- [ ] No P0/P1 defects are open.
- [ ] Permissions and privacy text match the shipped behavior.
- [ ] Release notes name known limits and data changes.

## Rollback

For a bad JavaScript bundle, stop publishing its metadata, mark it bad in the release system, and point new launches to the last-known-good version. Existing clients follow the installer rollback rule in `installer.md`. Do not delete the previous verified bundle until the incident is closed.

For a native release, stop the staged rollout and publish the previous native artifact if the store allows it. If native rollback is not possible, release a patch with the smallest safe change and keep the embedded bundle usable.

## Release notes must include

- user-visible changes;
- data schema or migration changes;
- permission changes;
- minimum native version;
- JavaScript bundle version and hash;
- known limits and rollback status.

## Developer note: startup changes

Any release that changes the bundle gate, cache, metadata schema, activation, or startup order must include installer test evidence. A normal UI release may still be blocked if it fails to start from the verified bundle.

## Full-product release tracks

### Data release

Use when adding or changing schema, migrations, exports, encrypted backup parameters, restore validation, sync encoding, conflict records, or deletion. The release record includes old/new schema versions, migration fixtures, export compatibility, crypto parameters, rollback limits, and a restore test. For local JSON or encrypted restore, record the export schema, supported app-schema migrations, validation rules, preview/confirmation behavior, password handling, and proof that a failed restore keeps the current workspace.

### Sync release

Use when changing encryption, key wrapping, device enrollment, API cursors, conflict rules, tombstones, or account deletion. Require a security review, two-device test, offline test, recovery test, service rollout plan, and a client rollback plan.

### Integration release

Use when adding permissions, widgets, share actions, calendar, shortcuts, providers, or background execution. Require a capability matrix, permission/revoke test, store disclosure review, locked-screen privacy test, and platform-specific release notes.

### Localization/accessibility release

Use when adding languages, layout systems, charts, gestures, or large feature areas. Require translation completeness, pseudo-localization, RTL, screen reader, large text, contrast, reduced motion, and locale/date/currency tests.

## Public rollout stages

1. Internal build: trusted devices, debug diagnostics, test data only.
2. Closed beta: staged native or bundle rollout with explicit feedback and rollback owner.
3. Open beta: monitor startup, migration, sync, export, and crash metrics; keep known limits public.
4. General release: publish support, privacy, data portability, and incident contacts.
5. Maintenance: patch supported native versions, bundle versions, schema versions, and security dependencies according to the support policy.

Full-product phases may ship independently, but a later phase cannot silently change the meaning of existing money totals, task recurrence, reminders, or exported data.
