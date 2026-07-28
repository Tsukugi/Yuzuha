# Yuzuha agent instructions

Use simple wording. Do not claim that a feature exists until the implementation and tests prove it.

## Project rules

1. Yuzuha is an Android-first React Native app with a dual-platform native shell. The product tracks money, app time, notes, and tasks.
2. The native shell includes an embedded installer. At startup it must check the bundle version, download a newer verified release when one is available, and only then present `MainApp`.
3. The implementation baseline is React Native 0.86.0, React 19.2.8, TypeScript 5.9.x, Metro 0.86.x, and the bundled React Native CLI 20.2.x. This supersedes the older January 2026 planning baseline. Record any version change in the release notes and decision log.
4. Keep `README.md`, this file, and the whole `docs/` tree current when features, configuration, or release behavior changes.
5. Any change to startup, bundle caching, or installer metadata must update `docs/installer.md` and the relevant developer note in `docs/architecture.md`, `docs/testing.md`, or `docs/release.md`.

6. Android release builds must use a private non-debug keystore supplied through ignored `android/keystore.properties` or `YUZUHA_RELEASE_*` environment variables. Release keystores, signing properties, and passwords must never be committed.

Current release status: GitHub release `Tsukugi/Yuzuha` `v0.1.0` is published with the verified `Yuzuha-0.1.0.apk` asset. The local release key remains outside the committed tree.

## Work style

- Reproduce a bug with a test before fixing it.
- For improvements, inspect the implementation first and explain the current behavior before changing it.
- Do not use blind fixes, recovery fixes, or vague best-effort behavior. Define a deterministic rule and test it.
- When planning, challenge the assumptions using the review questions in `docs/product-plan.md`.
- Prefer small, typed modules with clear ownership.

## Current repository status

The recurring-task pass is implemented: date-based rules can be created, paused/resumed, and deleted. Startup expands due rules once using explicit all/one/skip missed-occurrence policies. Custom lists can be created, renamed, archived/restored, and deleted only when unused by tasks or recurring rules. Inbox cannot be archived or deleted.

The task-reminder pass is implemented: an open task can have one optional Android local reminder. The reminder uses a strict local date-time, Android notification permission, a stable task ID, AlarmManager, and boot rescheduling. Completing, deleting, clearing, or replacing a reminder cancels the old schedule. Daily local quiet hours are stored and project reminders inside the quiet window to its end. The local Task reminders category setting can remove all native reminder alarms without deleting logical reminder times; re-enabling it rebuilds future alarms. The notification opens the matching task, its `Complete` action completes an existing open task exactly once, or its configurable `Snooze` action stores the selected duration after the action time and reschedules through quiet hours. Missing, completed, and paused-category targets are ignored. Sync remains planned.

The current implementation also supports encrypted backup file save/open, local recovery-key backups, local note attachment storage, note tags and case-insensitive search over title/body/tag/attachment names, note edit/pin/archive/restore/delete controls, local saved searches, local global search across supported workspace records, note-to-task conversion with stable source links, task create/edit/delete controls, task priorities, task lists, due-date filters, Android attachment opening through a validated FileProvider bridge, and attachment bytes in new encrypted backups through the system document picker. Plain JSON exports carry attachment metadata only. iOS attachment preview, account recovery, device enrollment, and sync remain planned.

Current schema boundary: the local note-link pass supersedes the earlier schema notes. The unreleased build accepts only app schema 32 and repository schema 3; older app, SQLite, backup, and CSV versions are rejected, with no migration path.

Current report status: Money reports now accept local Day/Week/Month, type, category, and account filters. The scope card states the exact range, active filters, and exclusions; split lines are filtered by their own category IDs and currencies remain separate. Report filters are derived state only and add no schema, migration, network request, or background process.

Current Android UI review status: the primary Home, Money, Notes, Tasks, Search, App Time, Data tools, Review, and Money report screens use labeled progressive-disclosure sections for optional filters, settings, management, formatting, restore/import actions, focus tools, and task tools. The primary capture controls remain visible. Data tools starts with all export, import, restore, and delete sections closed. The pass adds no schema, network request, worker, or background process. Check the implementation and UI smoke evidence before describing the layout as shipped.

The phase-by-phase paragraphs below retain old schema numbers as historical review notes. The current boundary above is authoritative: schema 32 and repository schema 3 only, with no legacy migration or import path.

Historical schema sequence: the task-reminder pass added schema 17 `reminderAtMillis` task data; later passes added notification settings, dependencies, task order, projects, focus sessions, subtasks, and templates. The schema 28/repository schema 2 wording in this historical paragraph is not the current compatibility boundary. The current unreleased build accepts only schema 32 and repository schema 3; old migration/import paths are removed. Broader notifications, account recovery, device enrollment, sync, and later full-product phases remain planned.

Historical implementation inventory: the current core inventory from the earlier Money-filtered-totals pass is kept below for context. Its repository schema 2 and schema 28 references are historical; the authoritative current boundary is schema 32/repository schema 3 above. Check implementation evidence before describing planned work as shipped.

The current core status supersedes earlier pass labels: the current Android slice includes the calendar-draft pass, latest-import-undo boundary, and local note links described below. A fresh install starts directly at schema 32; older app data and backup versions are intentionally rejected until a public upgrade policy exists. Check implementation evidence before describing planned work as shipped.

Current note-link status: Notes can link to tasks, projects, money entries, and focus sessions through stable local IDs. The Notes screen shows linked records, lets the user add or remove links, and shows a deleted-target label when the target no longer exists. Links are local data and add no network request, worker, or background process. Check implementation evidence before describing planned work as shipped.

The current core also includes the Home Quick capture menu. Its Add money, Add note, and Add task actions open the matching form directly; normal screen navigation opens the current list view. It adds no schema and starts no background process. Check implementation evidence before describing planned work as shipped.

Current App Time status: the Android screen offers Today, This week, and This month. Each refresh reads one local calendar day at a time, runs sequentially, and saves all selected-day snapshots in one local commit after every query succeeds. The screen states the exact local date range and last-read time. The selector is UI state only; it adds no schema, worker, timer, or polling loop. Check implementation evidence before describing planned work as shipped.

Current installer status: Android `MainApplication` starts the native verified-bundle gate before React host creation. It checks one signed HTTPS metadata response, accepts only a newer compatible release, verifies Ed25519 metadata plus exact size and SHA-256, atomically stores the bundle in app-private files, and otherwise uses the newest verified local or embedded bundle. Android API 33 is the current minimum. No legacy bundle path, retry loop, or polling worker is shipped. Check implementation evidence before describing planned work as shipped.

Current Home status: Home offers the same Today, This week, and This month local period choices as App Time. Money cards filter to the main currency and selected range; app-time totals, open-task due counts, and recent note updates use that range. This is derived view state only and adds no schema or background process. Check implementation evidence before describing planned work as shipped.

Current Money status: Money entry history offers local All/Day/Week/Month, type, category, and account filters. The visible current non-split entry list and currency-separated filtered totals use the same filter, archived selected references remain visible, and the pass adds no schema, migration, network request, or background process. Check implementation evidence before describing planned work as shipped.

Current Payee status: Money has optional stable payee references on entries, local payee creation, case-insensitive unique names, archive controls, JSON/encrypted-backup/SQLite persistence, current CSV fields, and global-search matching. Payees are local records and add no account, network, or background process.

Current Money report status: the separate report screen uses one typed local period/type/category/account filter over source entries and split lines, shows exact scope text, excludes transfers and out-of-range entries, and keeps each currency in its own card. It adds no persisted filter preference or background work.

Current date status: Home exposes a persisted Sunday/Monday week-start setting. Home, Review, Money, App Time, and budget projections use that same setting; JSON, encrypted backup, and SQLite require it as current data. No old-data migration or background process was added.

Current Review status: Home opens a read-only daily/weekly/monthly Review. It combines source-backed money, app time, tasks, and notes using the selected local range, states Usage Access freshness, and offers links back to each source screen. It adds no schema, writes no data, and does not refresh native usage. Check implementation evidence before describing planned work as shipped.

The current Android shell also accepts `ACTION_SEND` `text/plain` intents and supported `EXTRA_STREAM` files for images, PDFs, and plain text. It clears consumed extras, caps text at 20,000 characters and files at 10 MiB, shows a review before saving, and uses the existing private attachment copy/checksum path for note attachments. File-only shares save as notes, not tasks, so the file cannot be silently discarded. URI permission must come from the sending app; dynamic shortcuts and iOS share handling remain planned. Check implementation evidence before describing planned work as shipped.

The current Android shell also exposes four static launcher shortcuts: Add money, Add note, Add task, and App time. Add money, Add note, and Add task open the matching add form; App time opens the App Time screen. They route through a typed cold/warm intent bridge, add no schema or shortcut persistence, and start no background process. The Android summary widget shows only open-task and active-note counts, updates after committed workspace changes, uses no periodic worker, and opens MainActivity on tap. Dynamic shortcuts and iOS shortcuts remain planned. Check implementation evidence before describing planned work as shipped.

The current Android shell also accepts four strict local deep links: `yuzuha://open/money`, `yuzuha://open/notes`, `yuzuha://open/tasks`, and `yuzuha://open/app-time`. Cold and warm links route to existing tabs through a typed native bridge. Unknown paths, query data, IDs, and remote URLs are rejected; no schema, record, network request, or background process is added. Check implementation evidence before describing planned work as shipped.

The current Android Tasks screen shows `Calendar` only as a one-way draft action for a task with a valid local due date. The native bridge validates the title and date, opens the system `ACTION_INSERT` calendar editor, and stores nothing about the external event. Unknown launcher actions do not clear the activity intent, so a later deep-link adapter can still consume a valid cold-start link. Check implementation evidence before describing planned work as shipped.

Data tools also support strict current-format money CSV import. The picker copies the file to cache, validates the current header/schema and every row, previews errors and totals, and appends only after confirmation. The latest receipt persists through AppStore, JSON, encrypted backup, and SQLite. Undo removes only the latest import while every imported entry still exists with the same creation and update timestamps; missing or edited entries block it without a write. The import has bounded file/row limits and does not add a migration or legacy format. Check implementation evidence before describing planned work as shipped.

Data tools also support current Yuzuha JSON export file restore. The picker copies one file to cache, bounds and validates the current export, previews record counts, and replaces the workspace only after destructive confirmation. Old or incomplete schemas are rejected; no migration, network request, or background work is added. Check implementation evidence before describing planned work as shipped.

Encrypted backup file opening also checks the selected and cached file size before reading it. The current bound is 96 MiB, matching the existing bounded encrypted payload design; oversized files are rejected and the cache copy is removed. Check implementation evidence before describing planned work as shipped.
