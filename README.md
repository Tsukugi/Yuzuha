# Yuzuha

Yuzuha is a private, local-first personal tracker for Android. It brings four kinds of information into one calm place:

- money and spending
- time spent in other apps
- notes
- tasks

The app has an Android-first product plan and a native shell that can also support iOS. The shell checks for a newer JavaScript bundle before it presents `MainApp`.

## Repository status

Task lists now support local create, rename, archive/restore, and delete controls. Recurring task rules can create date-based tasks on startup, with explicit All, One, or Skip handling for missed dates. Tasks can also have one optional Android local reminder. Inbox is protected, and a list with tasks or recurring rules must be emptied before deletion.

The current core includes the TypeScript app shell, a transactional SQLite repository, an embedded-bundle launch gate, Android/iOS native projects, Home/Money/Notes/Tasks flows, Android app-time reads, package exclusions, time goals, local app groups, manual focus sessions with optional task/project/note/app-group links, note links to tasks/projects/money/focus sessions, bounded note formatting with plain-text fallback, money editing/deletion, archive controls, currency-separated reports, same-currency account transfers, exact-sum split entries, source-backed budgets, normalized financial tables, one-period budget carry-forward, versioned JSON/CSV exports, password-encrypted XChaCha20-Poly1305 backups with previewed restore, validated JSON restore with preview and confirmation, confirmed local deletion, recurring money rules with deterministic missed-occurrence policies, local note attachments for images, PDFs, and plain text, normalized note tags, case-insensitive search over note text, tags, attachment names, and current linked targets, note edit/pin/archive/restore/delete controls, local saved searches, local global search across supported workspace records with readable linked-note matches and tappable owning-tab routing plus exact money, note, task, project, task-template, task-list, app-group, and budget focus, app-group and budget editing, note-to-task conversion with stable source links, task create/edit/delete controls, task priorities, task lists, local task projects with active/completed/archive controls, optional task-to-project links, one optional same-list task parent with cycle rejection and child promotion on parent deletion, local task templates with active/archive controls and direct task creation, task dependencies with cycle rejection and completed-prerequisite blocking, persisted manual task order with Up/Down controls, manual/due-date/priority list sorting, a device-local 14-day task agenda, due-date filters, recurring task rules with optional local reminder times, one optional Android task reminder per task, notification permission handling, boot rescheduling, local daily quiet-hours settings, deterministic quiet-hours alarm projection, separate global and recurring-task reminder switches that clear native alarms without deleting logical reminder times, notification taps that open the matching task, and idempotent Android `Complete` and configurable `Snooze` actions. Sync and broader full-product notification phases remain planned.

The current Android reminder notification also supports a `Snooze` action using the local 15/30/60/120-minute setting, with 60 minutes as the default. The local Task reminders setting can pause the category: native alarms are removed, logical reminder times remain saved, and stale snooze actions do nothing while paused. It replaces the logical reminder and reschedules through local quiet hours when enabled; recurring notifications and sync remain planned.

Home now shows one compact Money widget with the current main-currency balance and selected-period activity. Tapping it opens the Money list. Home, Money, Notes, and Tasks each have a floating add action. Home expands it into Add money, Add note, and Add task; the other screens open their existing add form directly.

The Android Money/Home UI pass removes the app title/description block from the shell, keeps the primary action visible, and puts optional controls behind labeled sections. Money shows a reference-style balance/activity card, current entries, Add money entry, split-aware spending bars, and a daily income/spending chart. Home keeps only the compact Money widget. The shared UI scale uses tighter headings, cards, lists, forms, shadows, and FAB spacing across the primary screens to keep the layout quiet. Secondary tools now use smaller nested disclosures for backup choices, focus links, task management, task overview, and budget creation; note cards show one action until expanded. This is derived view state and styling only and adds no schema, network request, worker, or background process.

Primary Money, Notes, and Tasks add forms now have the same explicit Cancel action. Save buttons show a saving state and ignore repeat taps while the local write is in progress. The AppStore also serializes local commits so overlapping writes keep both changes instead of allowing a later save to replace an earlier one.

The app supports System, Light, and Dark contrast modes plus five temporary color palettes: Moss, Ocean, Sunset, Plum, and Citrus. System follows the Android setting; contrast and palette choices reset on relaunch and do not change local data. Theme colors are applied to the startup screen, shell, Money charts, forms, lists, and secondary screens.

Five preview-only theme idea cards are kept in [`docs/theme-ideas/`](docs/theme-ideas/). They document the palette directions used by the current Settings selectors.

Notes now opens with an always-visible search field, All/Pinned/Archived filters, pinned and recent sections, compact tappable note cards, collapsed note actions/details, and one floating Add note action. The note form still appears only after Add note, edit focus, or a launcher action. This is local view state and styling only; note data, attachments, links, and saved searches keep their current behavior.

Tasks now opens with All/Today/Upcoming/Completed tabs, Today and Upcoming sections, a collapsed task overview, compact task rows, and one floating Add task action. Task tools and deeper filters stay below the main dashboard, with each management group collapsed until needed. The task form still appears only after Add task, edit focus, or a launcher action; reminders, projects, dependencies, recurrence, agenda, and lists keep their current behavior.

Android also accepts `text/plain` share intents and supported file shares for images, PDFs, and plain text. Text shows a review before saving as a note or an Inbox task. A file shows its name/type/size and can be saved as a note attachment after review. Text is limited to 20,000 characters; files are limited to 10 MiB and checked by checksum. Captures are ephemeral until confirmed and do not fetch links or start background work.

Android launcher shortcuts now open Add money, Add note, Add task, or App time. The first three open the matching add form; App time opens its screen. They create no record, store no shortcut state, and start no background work.

The Android summary widget shows only the number of open tasks and active notes. It updates after committed workspace changes, uses no periodic worker, stores no record text, and opens Yuzuha when tapped. Dynamic shortcuts and iOS share/widget handling remain planned.

Android also accepts four strict local deep links: `yuzuha://open/money`, `yuzuha://open/notes`, `yuzuha://open/tasks`, and `yuzuha://open/app-time`. They open existing tabs only. IDs, query data, remote URLs, and network fetching are rejected.

App Time offers Today, This week, and This month reports. Refresh reads each local day once, shows the exact local date range and last-read time, and saves the complete selected-period result together. It adds no background polling.

Home now uses the same local Day/Week/Month selector. Money totals use only the main currency in that range; app time, due-task counts, and recent note updates state the selected range. The selector is view state only and adds no schema or background work.

Money entry history now has local Period, Type, Category, and Account filters. The visible list and currency-separated filtered totals use the same current records and filter, preserve the split-entry list rules, and add no schema, migration, or background work.

Periodic money operations start from the normal Add money entry form. Turning on Repeat reveals the cadence and interval; repeating every day also shows compact Mon/Tue/Wed/Thu/Fri/Sat/Sun toggles. New operations start today, and only selected weekdays are applied. The separate Periodic money view is list-first and supports pause, resume, and confirmed delete; existing generated entries stay in history.

Home can open a read-only period Review. It combines main-currency money, included app time, due and overdue tasks, completed tasks, and active notes updated in the selected local range. Review changes no records and does not refresh Android usage.

Android startup checks one signed update manifest before creating the React host. A newer compatible bundle is downloaded only after metadata, Ed25519 signature, size, and SHA-256 checks pass; otherwise the newest verified private bundle or embedded baseline starts. The check has one bounded request and no polling worker.

Home now opens a dedicated `Settings` view. On Android, its expanded `Code
updates` section can check for and prepare a newer signed JavaScript bundle
while the current app keeps running; the prepared code applies after the next
launch and rolls back if it does not report a healthy root. Native app changes
still require a new APK. Data tools keeps the same update control as a
secondary path.
The OTA trust anchor is a new project Ed25519 key; its private key stays
outside the repository, and changing the pin requires a new APK plus
republished signed metadata. See the release procedure for the public-key
fingerprint and local secret-loading command.
The current signed Settings bundle is GitHub OTA `v0.1.7` and requires native
`0.1.3`.

A dated task can open the Android system calendar editor with its title, details, and all-day local due date. Yuzuha does not request calendar permissions, read calendar data, store an event ID, or run a worker. The user confirms the draft in the system editor.

Data tools can import a current Yuzuha money CSV through the system document picker. The file is previewed first; duplicate IDs, broken references, split-linked rows, invalid values, and oversized files block the import. Confirmation appends the entries in one local save. JSON or encrypted backup is required for complete workspace portability.

Data tools can also choose a current Yuzuha JSON export file through the system document picker. The file is copied to cache, bounded, validated, previewed, and restored only after destructive confirmation. Old or incomplete schemas leave the current workspace unchanged.

## Technology baseline

The current encrypted backup flow can also save and open the current authenticated JSON envelope through the system document picker. New encrypted backups include verified note attachment bytes, local saved-search records, app groups, focus sessions, task projects and links, note links, task parent links, task templates, task dependencies, task manual-order fields, payees, the week-start preference, weekday-aware periodic money rules, and the latest money CSV import receipt. Encrypted backup file opening rejects files over 96 MiB before reading them and removes any oversized cache copy. The latest-only build uses app schema 33 and repository schema 3; old app, SQLite, backup, and CSV versions are rejected because there are no external users to upgrade. Plain JSON exports still carry attachment metadata only. Android opens supported private attachment files through a read-only FileProvider URI and the system chooser. Account recovery, device enrollment, sync, and iOS attachment preview remain planned.

The current note-link pass supersedes that earlier schema sentence: the unreleased build uses app schema 33 and repository schema 3. Money entries can reference local payees by stable ID, and all week-based views use the saved Sunday/Monday setting. Periodic money rules also preserve selected weekdays. Notes can link to tasks, projects, money entries, and focus sessions; links persist through current JSON, encrypted backup, and SQLite. JSON, encrypted backups, and SQLite also preserve the latest import receipt. Older versions remain rejected because there are no external users to upgrade.

The current Money report pass adds local Day/Week/Month, type, category, and account filters. The report states its exact range, active filters, and exclusions; split lines match category filters, transfers stay excluded, and currencies remain separate. This is derived screen state with no schema, migration, network request, or background process.

- React Native `0.86.0` (current implementation baseline, verified July 2026)
- React `19.2.8`
- TypeScript with strict checking
- Metro and the React Native CLI
- `@op-engineering/op-sqlite` `17.1.2` for the transactional local product repository

Use locked dependency versions in implementation branches. The current baseline is the newer React Native 0.86 line requested for this project.

## Latest Android release

The latest Android release is `v0.1.3`. It provides the periodic money weekday controls, alongside the dashboard, manual money entries, daily app-time summaries, searchable notes, and task lists. It works without an account or network after the initial app install. [Download the signed APK from GitHub Releases](https://github.com/Tsukugi/Yuzuha/releases/tag/v0.1.3). Cloud sync is out of scope for this release.

See [docs/README.md](docs/README.md) for the complete documentation set and reading order.

The documentation covers both the local-first MVP and the later full product. The implementation plan is phased so the first release stays small without losing the long-term design.

## Android release signing

Release builds require a private signing key. Put the non-secret file path and signing values in the ignored `android/keystore.properties`, or provide the `YUZUHA_RELEASE_STORE_FILE`, `YUZUHA_RELEASE_STORE_PASSWORD`, `YUZUHA_RELEASE_KEY_ALIAS`, and `YUZUHA_RELEASE_KEY_PASSWORD` environment variables. The release build fails when signing is not configured; it never falls back to the debug key. Keystores and signing properties are never committed.

## Local setup

The package scripts cover the current app and quality gates:

```bash
npm install
npm run start
npm run android
npm run lint
npm run typecheck
npm run test
npm run check-bundle
npm run ota-check -- dist/ota/<version>/bundle.json
```

Build an OTA bundle with `npm run ota-release -- --version <version>` after
providing the ignored `YUZUHA_OTA_PRIVATE_KEY_BASE64` secret. See
[the OTA specification](docs/ota-update-spec.md) and
[the installer contract](docs/installer.md) for the signing and rollback rules.

The Android build needs Android Studio, an Android SDK, Java 17, and a configured emulator or device. iOS development needs Xcode on macOS.

## Installer rule

Every startup follows the installer contract in [docs/installer.md](docs/installer.md): check signed metadata, download and verify a newer bundle if available, store it as pending, and only select it before rendering after the native launch gate completes. The root health signal promotes pending code to current; if the network is unavailable, use the newest compatible verified local bundle or the embedded baseline. Never activate an unverified or partially downloaded bundle.
