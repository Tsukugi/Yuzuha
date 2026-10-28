# Yuzuha

Yuzuha is a private, local-first personal tracker for Android. It brings four kinds of information into one calm place:

- money and spending
- time spent in other apps
- notes
- tasks

The app has an Android-first product plan and a native shell that can also support iOS. The shell checks for a newer JavaScript bundle before it presents `MainApp`.

## Repository status

Release [0.3.0](docs/releases/v0.3.0.md) is being prepared as a native baseline:
the APK supplies icon fonts; subsequent compatible 0.3.x releases can use OTA.
Older 0.2.x uses the signed APK updater. Earlier compatibility feeds are preserved.

The [progressive-disclosure pass](docs/progressive-disclosure-2026-10-28.md)
(YZ-025) keeps current values and primary actions visible while opening choices,
secondary forms and focus history on demand. Validation: 64 suites / 324 tests,
typecheck, lint, Android build and targeted API 35 smoke at 320×640 dp. Unpublished.

The [28.10.2026 usability fixes](docs/usability-fixes-2026-10-28.md) address
YZ-018–YZ-024 from the initial smoke: visible period choices, Android Back
navigation and draft confirmation, visible restore feedback, periodic capture,
permission refresh on resume, action icons and selected marks, and money actions
that stay above the keyboard. Validation covers 64 Jest suites / 320 tests and
an API 35 emulator at 320×640 dp. These local changes are not published.

Task lists now support local create, rename, archive/restore, and delete controls. Recurring task rules can create date-based tasks on startup, with explicit All, One, or Skip handling for missed dates. Tasks can also have one optional Android local reminder. Inbox is protected, and a list with tasks or recurring rules must be emptied before deletion.

The current core includes the TypeScript app shell, a transactional SQLite repository, an embedded-bundle launch gate, Android/iOS native projects, Home/Money/Notes/Tasks flows, Android app-time reads, package exclusions, time goals, local app groups, manual focus sessions with optional task/project/note/app-group links, note links to tasks/projects/money/focus sessions, bounded note formatting with plain-text fallback, money editing/deletion, archive controls, currency-separated reports, same-currency account transfers, exact-sum split entries, source-backed budgets, normalized financial tables, one-period budget carry-forward, versioned JSON/CSV exports, password-encrypted XChaCha20-Poly1305 backups with previewed restore, validated JSON restore with preview and confirmation, confirmed local deletion, recurring money rules with deterministic missed-occurrence policies, local note attachments for images, PDFs, and plain text, normalized note tags, case-insensitive search over note text, tags, attachment names, and current linked targets, note edit/pin/archive/restore/delete controls, local saved searches, local global search across supported workspace records with readable linked-note matches and tappable owning-tab routing plus exact money, note, task, project, task-template, task-list, app-group, and budget focus, app-group and budget editing, note-to-task conversion with stable source links, task create/edit/delete controls, task priorities, task lists, local task projects with active/completed/archive controls, optional task-to-project links, one optional same-list task parent with cycle rejection and child promotion on parent deletion, local task templates with active/archive controls and direct task creation, task dependencies with cycle rejection and completed-prerequisite blocking, persisted manual task order with Up/Down controls, manual/due-date/priority list sorting, a device-local 14-day task agenda, due-date filters, recurring task rules with optional local reminder times, one optional Android task reminder per task, notification permission handling, boot rescheduling, local daily quiet-hours settings, deterministic quiet-hours alarm projection, separate global and recurring-task reminder switches that clear native alarms without deleting logical reminder times, notification taps that open the matching task, and idempotent Android `Complete` and configurable `Snooze` actions. Sync and broader full-product notification phases remain planned.

The current Android reminder notification also supports a `Snooze` action using the local 15/30/60/120-minute setting, with 60 minutes as the default. The local Task reminders setting can pause the category: native alarms are removed, logical reminder times remain saved, and stale snooze actions do nothing while paused. It replaces the logical reminder and reschedules through local quiet hours when enabled; recurring notifications and sync remain planned.

Home now shows one compact Money widget with the current main-currency balance and selected-period activity. Tapping it opens the Money list. Home, Money, Notes, and Tasks each have a floating add action. Home expands it into Add money, Add note, and Add task; the other screens open their existing add form directly.

Overview, Money, Notes, Tasks, and App Time share a contextual header with live scope/count data and a vertical three-dot menu. The menu exposes a cog-labeled Settings action. Settings owns persisted week-start and reminder preferences plus Money supporting records, task organization, App Time inclusion, time goals, and app groups. Temporary view filters and creation forms stay with their source screens.

The Android Money/Home UI pass removes the app title/description block from the shell, keeps the primary action visible, and puts optional controls behind labeled sections. Money shows a reference-style balance/activity card, current entries, Add money entry, split-aware spending bars, and a daily income/spending chart. Home keeps only the compact Money widget. The shared UI scale uses tighter headings, cards, lists, forms, shadows, and FAB spacing across the primary screens to keep the layout quiet. Secondary tools now use smaller nested disclosures for backup choices, focus links, task management, task overview, and budget creation; note-card commands use a vertical overflow menu. This is derived view state and styling only and adds no schema, network request, worker, or background process.

The React UI uses React Native Paper 5.15.3 with Material Design Icons 13.1.3. Settings has seven compact categories: Appearance, General, Money, Task organization, App time, Task reminders, and Code updates. Each opens as a separate mobile detail screen instead of expanding below the category list. Paper receives Yuzuha's current light/dark palette tokens.

Visible dates use `DD.MM` in the current year and add `.YYYY` only for another year. Stored ISO timestamps and local `YYYY-MM-DD` values are unchanged.

The UI standardization pass applies typed shared spacing, radius, and touch-target tokens across the app-level `App.tsx` and `MainApp.tsx` styles. Padding, margins, and gaps no longer use raw numbers; standard targets are 44 dp for interactive controls, 48 dp for primary form actions, 56 dp for the FAB, and 48 dp for bottom tabs. See [the UI standard](docs/ui-standardization.md) and the current emulator evidence in [testing](docs/testing.md).

Primary Money, Notes, and Tasks add forms now have the same explicit Cancel action. Save buttons show a saving state and ignore repeat taps while the local write is in progress. The AppStore also serializes local commits so overlapping writes keep both changes instead of allowing a later save to replace an earlier one.

The app supports System, Light, and Dark contrast modes plus five temporary color palettes: Moss, Ocean, Sunset, Plum, and Citrus. System follows the Android setting; contrast and palette choices reset on relaunch and do not change local data. Theme colors are applied to the startup screen, shell, Money charts, forms, lists, and secondary screens.

Five preview-only theme idea cards are kept in [`docs/theme-ideas/`](docs/theme-ideas/). They document the palette directions used by the current Settings selectors.

Notes now opens with an always-visible search field, All/Pinned/Archived filters, pinned and recent sections, compact tappable note cards, a vertical overflow menu for each card, and one floating Add note action. Links and attachments open only from the matching menu command. The note form still appears only after Add note, edit focus, or a launcher action. This is local view state and styling only; note data, attachments, links, and saved searches keep their current behavior.

Tasks now opens with All/Today/Upcoming/Completed tabs, Today and Upcoming sections, a collapsed task overview, compact task rows, and one floating Add task action. Task tools and deeper filters stay below the main dashboard, with each management group collapsed until needed. The task form still appears only after Add task, edit focus, or a launcher action; reminders, projects, dependencies, recurrence, agenda, and lists keep their current behavior.

Android also accepts `text/plain` share intents and supported file shares for images, PDFs, and plain text. Text shows a review before saving as a note or an Inbox task. A file shows its name/type/size and can be saved as a note attachment after review. Text is limited to 20,000 characters; files are limited to 10 MiB and checked by checksum. Captures are ephemeral until confirmed and do not fetch links or start background work.

Android launcher shortcuts now open Add money, Add note, Add task, or App time. The first three open the matching add form; App time opens its screen. They create no record, store no shortcut state, and start no background work.

The Android summary widget shows only the number of open tasks and active notes. It updates after committed workspace changes, uses no periodic worker, stores no record text, and opens Yuzuha when tapped. Dynamic shortcuts and iOS share/widget handling remain planned.

Android also accepts four strict local deep links: `yuzuha://open/money`, `yuzuha://open/notes`, `yuzuha://open/tasks`, and `yuzuha://open/app-time`. They open existing tabs only. IDs, query data, remote URLs, and network fetching are rejected.

App Time offers Today, This week, and This month reports. Refresh reads each local day once, shows the exact local date range and last-read time, and saves the complete selected-period result together. Its Analysis section derives daily average, active-app count, top-app share, busiest day, and previous-period change from included local usage. It adds no background polling.

Home uses the same local Day/Week/Month selector. Money totals use only the main currency in that range; app time, due-task counts, and recent note updates state the selected range. Search, Review, and Data tools are direct actions rather than content that expands below Home. The selector is view state only and adds no schema or background work.

Money entry history now has local All/Day/Week/Month/Year/Custom, Type, and Category filters. Custom intervals include the selected start date and exclude the selected end date. The Account filter appears only when there are multiple active accounts; with one active account the all-accounts scope is automatic. The visible list shows the newest occurrence first, and currency-separated filtered totals use the same current records and filter, preserve the split-entry list rules, and add no schema, migration, or background work.
The separate Money report uses one full-width period menu for Day/Week/Month/Year/Custom so no option wraps onto an orphaned second row. Its secondary route hides the primary bottom navigation.
Money forms use Android's OS date and time dialogs for local occurrence values; task due/reminder fields and other local date/time fields use the same bridge. Cancel leaves the previous value unchanged. Money occurrences and task reminders are stored as UTC ISO timestamps after validation; date-only due/recurrence values and quiet-hour times remain local strings. iOS picker parity remains planned.

Periodic money operations start from the normal Add money entry form. Turning on Repeat reveals the cadence and interval; repeating every day also shows compact Mon/Tue/Wed/Thu/Fri/Sat/Sun toggles. New operations start today, and only selected weekdays are applied. The separate Periodic money view is list-first and supports pause, resume, and confirmed delete; existing generated entries stay in history.

Home can open a read-only period Review. It combines main-currency money, included app time, due and overdue tasks, completed tasks, and active notes updated in the selected local range. Review changes no records and does not refresh Android usage.

Android startup checks signed bundle metadata before creating the React host. A newer compatible bundle is downloaded only after metadata, Ed25519 signature, size, and SHA-256 checks pass; otherwise the newest verified private bundle or embedded baseline starts. Native `0.2.0` and later also check a separate signed APK manifest after launch health is reported. Same-line releases prefer OTA. Cross-line releases download and verify the latest patch APK directly, then use bounded root installation or Android's standard installer. The checks have bounded requests and no polling worker.

Home opens a dedicated `Settings` view. On Android, its `Code updates` detail
can check for and prepare a newer signed JavaScript bundle
while the current app keeps running; the prepared code applies after the next
launch and rolls back if it does not report a healthy root. Native app changes
still require a new APK. Settings is the only UI owner of this control; Data
tools contains data operations only.
The OTA trust anchor is a new project Ed25519 key; its private key stays
outside the repository, and changing the pin requires a new APK plus
republished signed metadata. See the release procedure for the public-key
fingerprint and local secret-loading command.
Published `v0.1.10` remains the current public OTA and requires native `0.1.9`.
Recovery `0.1.11` and native `0.2.0` are published. API 35 emulator tests
cover signed-package replacement with workspace preservation, Android's
installer UI, and controlled root install; physical Pixel validation remains
open. See [Android update channels](docs/android-updates.md).

A dated task can open the Android system calendar editor with its title, details, and all-day local due date. Yuzuha does not request calendar permissions, read calendar data, store an event ID, or run a worker. The user confirms the draft in the system editor.

Data tools can import a current Yuzuha money CSV through the system document picker. The file is previewed first; duplicate IDs, broken references, split-linked rows, invalid values, and oversized files block the import. Confirmation appends the entries in one local save. JSON or encrypted backup is required for complete workspace portability.

Data tools can also choose a current Yuzuha JSON export file through the system document picker. The file is copied to cache, bounded, validated, previewed, and restored only after destructive confirmation. Old or incomplete schemas leave the current workspace unchanged.

## Technology baseline

The current encrypted backup flow can also save and open the current authenticated JSON envelope through the system document picker. New encrypted backups include verified note attachment bytes, local saved-search records, app groups, focus sessions, task projects and links, note links, task parent links, task templates, task dependencies, task manual-order fields, payees, the week-start preference, weekday-aware periodic money rules, and the latest money CSV import receipt. Encrypted backup file opening rejects files over 96 MiB before reading them and removes any oversized cache copy. The latest-only build uses app schema 33 and repository schema 3; old app, SQLite, backup, and CSV versions are rejected because there are no external users to upgrade. Plain JSON exports still carry attachment metadata only. Android opens supported private attachment files through a read-only FileProvider URI and the system chooser. Account recovery, device enrollment, sync, and iOS attachment preview remain planned.

The current note-link pass supersedes that earlier schema sentence: the unreleased build uses app schema 33 and repository schema 3. Money entries can reference local payees by stable ID, and all week-based views use the saved Sunday/Monday setting. Periodic money rules also preserve selected weekdays. Notes can link to tasks, projects, money entries, and focus sessions; links persist through current JSON, encrypted backup, and SQLite. JSON, encrypted backups, and SQLite also preserve the latest import receipt. Older versions remain rejected because there are no external users to upgrade.

The current Money report pass adds local Day/Week/Month/Year/Custom, type, and category filters, plus an Account filter when there are multiple active accounts. With one active account, the report uses the all-accounts scope automatically. The report states its exact range, active filters, and exclusions; split lines match category filters, transfers stay excluded, and currencies remain separate. This is derived screen state with no schema, migration, network request, or background process.

- React Native `0.86.0` (current implementation baseline, verified July 2026)
- React `19.2.8`
- TypeScript with strict checking
- Metro and the React Native CLI
- `@op-engineering/op-sqlite` `17.1.2` for the transactional local product repository

Use locked dependency versions in implementation branches. The current baseline is the newer React Native 0.86 line requested for this project.

## Android release status

The published recovery release is [`v0.1.11`](https://github.com/Tsukugi/Yuzuha/releases/tag/v0.1.11), and the published native updater baseline is [`v0.2.0`](https://github.com/Tsukugi/Yuzuha/releases/tag/v0.2.0). The latest `bundle.json` remains compatible with native `0.1.3`, while the latest `android-update.json` points to APK `0.2.0`. Every new version must publish both a complete signed APK and its same-line bundle. Cloud sync remains out of scope.

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
npm run ota-check -- dist/ota/<version>/bundle-<major>.<minor>.json
npm run native-check -- dist/native/<version>/android-update.json
```

Build both release forms with `npm run native-release -- --version <version> --release-kind <native-baseline|compatible-patch> ...`
and `npm run ota-release -- --version <version> ...` after providing the ignored
`YUZUHA_OTA_PRIVATE_KEY_BASE64` secret. Upload is intentionally combined so a
release cannot omit its same-version APK. See
[the OTA specification](docs/ota-update-spec.md) and
[the installer contract](docs/installer.md) for the signing and rollback rules.

The Android build needs Android Studio, an Android SDK, Java 17, and a configured emulator or device. iOS development needs Xcode on macOS.

## Installer rule

Every startup follows [the installer contract](docs/installer.md) and [the Android channel policy](docs/android-updates.md). Same-line code uses a verified pending OTA with rollback. A newer native line uses the latest release's verified APK directly, not patch zero plus intermediate OTAs. Rooted devices use a fixed bounded `pm install -r` path; other devices enter Android's package installer. Never activate or install unverified or partial bytes.
