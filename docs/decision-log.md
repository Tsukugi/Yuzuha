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
