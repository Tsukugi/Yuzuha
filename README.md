# Yuzuha

Yuzuha is a private, local-first personal tracker for Android. It brings four kinds of information into one calm place:

- money and spending
- time spent in other apps
- notes
- tasks

The app has an Android-first product plan and a native shell that can also support iOS. The shell checks for a newer JavaScript bundle before it presents `MainApp`.

## Repository status

Task lists now support local create, rename, archive/restore, and delete controls. Recurring task rules can create date-based tasks on startup, with explicit All, One, or Skip handling for missed dates. Tasks can also have one optional Android local reminder. Inbox is protected, and a list with tasks or recurring rules must be emptied before deletion.

The current core includes the TypeScript app shell, a transactional SQLite repository, an embedded-bundle launch gate, Android/iOS native projects, Home/Money/Notes/Tasks flows, Android app-time reads, package exclusions, time goals, money editing/deletion, archive controls, currency-separated reports, same-currency account transfers, exact-sum split entries, source-backed budgets, normalized financial tables, one-period budget carry-forward, versioned JSON/CSV exports, password-encrypted XChaCha20-Poly1305 backups with previewed restore, validated JSON restore with preview and confirmation, confirmed local deletion, recurring money rules with deterministic missed-occurrence policies, local note attachments for images, PDFs, and plain text, normalized note tags, case-insensitive search over note text, tags, and attachment names, note edit/pin/archive/restore/delete controls, local saved searches, local global search across supported workspace records, note-to-task conversion with stable source links, task create/edit/delete controls, task priorities, task lists, due-date filters, recurring task rules, one optional Android task reminder per task, notification permission handling, boot rescheduling, local daily quiet-hours settings, deterministic quiet-hours alarm projection, a local task-reminder category switch that clears native alarms without deleting logical reminder times, notification taps that open the matching task, and idempotent Android `Complete` and configurable `Snooze` actions. Sync and broader full-product notification phases remain planned.

The current Android reminder notification also supports a `Snooze` action using the local 15/30/60/120-minute setting, with 60 minutes as the default. The local Task reminders setting can pause the category: native alarms are removed, logical reminder times remain saved, and stale snooze actions do nothing while paused. It replaces the logical reminder and reschedules through local quiet hours when enabled; recurring notifications and sync remain planned.

## Technology baseline

The current encrypted backup flow can also save and open the authenticated JSON envelope through the system document picker. New encrypted backups include verified note attachment bytes and local saved-search records; old schema-1 backups remain readable. Plain JSON exports still carry attachment metadata only. Android opens supported private attachment files through a read-only FileProvider URI and the system chooser. Account recovery, device enrollment, sync, and iOS attachment preview remain planned.

- React Native `0.86.0` (current implementation baseline, verified July 2026)
- React `19.2.8`
- TypeScript with strict checking
- Metro and the React Native CLI
- AsyncStorage `3.1.x` for small installer metadata and preferences only
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
