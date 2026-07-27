# Yuzuha

Yuzuha is a private, local-first personal tracker for Android. It brings four kinds of information into one calm place:

- money and spending
- time spent in other apps
- notes
- tasks

The app has an Android-first product plan and a native shell that can also support iOS. The shell checks for a newer JavaScript bundle before it presents `MainApp`.

## Repository status

Task lists now support local create, rename, archive/restore, and delete controls. Recurring task rules can create date-based tasks on startup, with explicit All, One, or Skip handling for missed dates. Tasks can also have one optional Android local reminder. Inbox is protected, and a list with tasks or recurring rules must be emptied before deletion.

The current core includes the TypeScript app shell, a transactional SQLite repository, an embedded-bundle launch gate, Android/iOS native projects, Home/Money/Notes/Tasks flows, Android app-time reads, package exclusions, time goals, local app groups, manual focus sessions with optional task/project/note/app-group links, money editing/deletion, archive controls, currency-separated reports, same-currency account transfers, exact-sum split entries, source-backed budgets, normalized financial tables, one-period budget carry-forward, versioned JSON/CSV exports, password-encrypted XChaCha20-Poly1305 backups with previewed restore, validated JSON restore with preview and confirmation, confirmed local deletion, recurring money rules with deterministic missed-occurrence policies, local note attachments for images, PDFs, and plain text, normalized note tags, case-insensitive search over note text, tags, and attachment names, note edit/pin/archive/restore/delete controls, local saved searches, local global search across supported workspace records, note-to-task conversion with stable source links, task create/edit/delete controls, task priorities, task lists, local task projects with active/completed/archive controls, optional task-to-project links, one optional same-list task parent with cycle rejection and child promotion on parent deletion, local task templates with active/archive controls and direct task creation, task dependencies with cycle rejection and completed-prerequisite blocking, persisted manual task order with Up/Down controls, manual/due-date/priority list sorting, a device-local 14-day task agenda, due-date filters, recurring task rules with optional local reminder times, one optional Android task reminder per task, notification permission handling, boot rescheduling, local daily quiet-hours settings, deterministic quiet-hours alarm projection, separate global and recurring-task reminder switches that clear native alarms without deleting logical reminder times, notification taps that open the matching task, and idempotent Android `Complete` and configurable `Snooze` actions. Sync and broader full-product notification phases remain planned.

The current Android reminder notification also supports a `Snooze` action using the local 15/30/60/120-minute setting, with 60 minutes as the default. The local Task reminders setting can pause the category: native alarms are removed, logical reminder times remain saved, and stale snooze actions do nothing while paused. It replaces the logical reminder and reschedules through local quiet hours when enabled; recurring notifications and sync remain planned.

Home also has a local Quick capture menu. It routes to the existing Money, Notes, and Tasks forms and does not create a separate record type or background process.

Android also accepts `text/plain` share intents and supported file shares for images, PDFs, and plain text. Text shows a review before saving as a note or an Inbox task. A file shows its name/type/size and can be saved as a note attachment after review. Text is limited to 20,000 characters; files are limited to 10 MiB and checked by checksum. Captures are ephemeral until confirmed and do not fetch links or start background work.

Android launcher shortcuts now open the existing Money, Notes, Tasks, and App Time screens. They are static navigation entries only: they create no record, store no shortcut state, and start no background work.

The Android summary widget shows only the number of open tasks and active notes. It updates after committed workspace changes, uses no periodic worker, stores no record text, and opens Yuzuha when tapped. Dynamic shortcuts and iOS share/widget handling remain planned.

Android also accepts four strict local deep links: `yuzuha://open/money`, `yuzuha://open/notes`, `yuzuha://open/tasks`, and `yuzuha://open/app-time`. They open existing tabs only. IDs, query data, remote URLs, and network fetching are rejected.

App Time offers Today, This week, and This month reports. Refresh reads each local day once, shows the exact local date range and last-read time, and saves the complete selected-period result together. It adds no background polling.

Home now uses the same local Day/Week/Month selector. Money totals use only the main currency in that range; app time, due-task counts, and recent note updates state the selected range. The selector is view state only and adds no schema or background work.

Money entry history now has local Period, Type, Category, and Account filters. The visible list and currency-separated filtered totals use the same current records and filter, preserve the split-entry list rules, and add no schema, migration, or background work.

Home can open a read-only period Review. It combines main-currency money, included app time, due and overdue tasks, completed tasks, and active notes updated in the selected local range. Review changes no records and does not refresh Android usage.

Android startup checks one signed update manifest before creating the React host. A newer compatible bundle is downloaded only after metadata, Ed25519 signature, size, and SHA-256 checks pass; otherwise the newest verified private bundle or embedded baseline starts. The check has one bounded request and no polling worker.

A dated task can open the Android system calendar editor with its title, details, and all-day local due date. Yuzuha does not request calendar permissions, read calendar data, store an event ID, or run a worker. The user confirms the draft in the system editor.

Data tools can import a current Yuzuha money CSV through the system document picker. The file is previewed first; duplicate IDs, broken references, split-linked rows, invalid values, and oversized files block the import. Confirmation appends the entries in one local save. JSON or encrypted backup is required for complete workspace portability.

Data tools can also choose a current Yuzuha JSON export file through the system document picker. The file is copied to cache, bounded, validated, previewed, and restored only after destructive confirmation. Old or incomplete schemas leave the current workspace unchanged.

## Technology baseline

The current encrypted backup flow can also save and open the current authenticated JSON envelope through the system document picker. New encrypted backups include verified note attachment bytes, local saved-search records, app groups, focus sessions, task projects and links, task parent links, task templates, task dependencies, task manual-order fields, and payees. Encrypted backup file opening rejects files over 96 MiB before reading them and removes any oversized cache copy. The latest-only build uses app schema 29 and repository schema 3; old app, SQLite, backup, and CSV versions are rejected because there are no external users to upgrade. Plain JSON exports still carry attachment metadata only. Android opens supported private attachment files through a read-only FileProvider URI and the system chooser. Account recovery, device enrollment, sync, and iOS attachment preview remain planned.

The current payee pass supersedes that earlier schema sentence: the unreleased build uses app schema 29 and repository schema 3. Money entries can reference local payees by stable ID; JSON, encrypted backups, SQLite, CSV, and global search preserve that reference. Older versions remain rejected because there are no external users to upgrade.

The current Money report pass adds local Day/Week/Month, type, category, and account filters. The report states its exact range, active filters, and exclusions; split lines match category filters, transfers stay excluded, and currencies remain separate. This is derived screen state with no schema, migration, network request, or background process.

- React Native `0.86.0` (current implementation baseline, verified July 2026)
- React `19.2.8`
- TypeScript with strict checking
- Metro and the React Native CLI
- `@op-engineering/op-sqlite` `17.1.2` for the transactional local product repository

Use locked dependency versions in implementation branches. The current baseline is the newer React Native 0.86 line requested for this project.

## Planned first release

The Android MVP will provide a dashboard, manual money entries, daily app-time summaries, searchable notes, and task lists. It will work without an account or network after the initial app install. Cloud sync is out of scope for the MVP.

See [docs/README.md](docs/README.md) for the complete documentation set and reading order.

The documentation covers both the local-first MVP and the later full product. The implementation plan is phased so the first release stays small without losing the long-term design.

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
```

The Android build needs Android Studio, an Android SDK, Java 17, and a configured emulator or device. iOS development needs Xcode on macOS.

## Installer rule

Every startup follows the installer contract in [docs/installer.md](docs/installer.md): check signed metadata, download a newer bundle if available, verify it, activate it atomically, and only then render the main app. If the network is unavailable, use the newest verified local bundle. Never activate an unverified or partially downloaded bundle.
