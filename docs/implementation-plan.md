# Implementation plan

Status: Planned work order for the first working Android release.

## Milestone 0: confirm the product contract

Deliver:

- answers to the review questions in `product-plan.md`;
- final minimum Android API and supported device range;
- selected navigation, SQLite, encryption, and test packages;
- decision log entries for each choice.

Exit when the team can describe the MVP without unresolved behavior that changes the data model.

## Milestone 1: make the shell safe

Deliver:

- native Android shell and embedded bundle;
- installer launch gate and typed status;
- metadata fixture, signature/hash verification, atomic cache, and last-known-good behavior;
- `MainApp` startup state and error screen;
- CI for lint, unit tests, bundle check, and Android build.

Exit when clean online, clean offline, upgrade, bad bundle, and first-install failure cases are tested.

## Milestone 2: build the local foundation

Deliver:

- SQLite adapter and migration runner;
- repositories and transaction boundaries;
- UTC/local-date helpers;
- app theme, navigation, form primitives, error handling, and test fixtures;
- export/delete skeleton.

Exit when a test record survives restart and a migration fixture passes.

## Milestone 3: ship personal records

Implement in this order:

1. tasks: create, complete, filters, and overdue logic;
2. notes: edit, archive, pin, tags, and search;
3. money: validation, minor units, totals, filters, and export;
4. Home cards backed by real repository queries.

Exit when the requirements in `requirements.md` are covered by unit and integration tests.

## Milestone 4: add app-time insight

Deliver:

- Android Usage Access explanation and settings link;
- typed native adapter;
- daily aggregation, app exclusion, last-read time, and unavailable states;
- privacy review and device tests for permission changes.

Exit when permission denied is a complete, useful flow and no raw usage data leaves the device.

## Milestone 5: harden for beta

Deliver:

- accessibility pass;
- crash and startup diagnostics with redaction;
- export/delete verification;
- database backup/restore decision;
- performance checks for large note/task/money sets;
- release candidate and rollback rehearsal.

Exit when all release gates in `release.md` pass and there are no open P0/P1 defects.

## Milestone 6: iOS shell and parity

Add the iOS native shell and installer behavior after Android MVP stability. Do not assume Android app-time APIs have an iOS equivalent. Define the iOS data source and user-facing limits before promising parity.

## Work slicing rules

Each issue should fit one reviewable slice:

- one user-visible behavior;
- one data or platform boundary;
- tests for the contract;
- documentation update when behavior or release flow changes.

Do not combine schema changes, installer changes, and large UI rewrites in one slice unless the startup contract requires it.

## Full-product phases

### Phase 2: planning and insight

Deliver accounts/categories, transfers, split transactions, budgets, goals, reports, app groups, time goals, focus sessions, projects, dependencies, and the first recurrence engine.

Exit when money reports reconcile against fixture transactions, time goals show freshness, dependency cycles are rejected, and recurrence rules survive timezone changes.

### Phase 3: capture and automation

Deliver rich notes, attachments, links, templates, saved searches, global search, daily/weekly/monthly reviews, reminders, quiet hours, notification actions, widgets, share capture, shortcuts, deep links, and optional calendar actions.

Exit when every scheduled job is idempotent, every integration has permission/revoke states, search deletion is tested, and accessibility flows cover the new entry points.

### Phase 4: continuity and portability

Deliver account enrollment, encrypted local keys, device enrollment/revocation, encrypted sync, cursors, outbox, tombstones, conflict resolution, encrypted backup, restore, and import tools.

Exit when two devices converge, conflicts are visible, recovery is tested, the service has no plaintext fixture access, and local-only mode remains complete.

### Phase 5: platform and product maturity

Deliver iOS shell and capability matrix, localization, high-confidence accessibility, performance budgets, support packages, diagnostics, incident runbooks, public release process, and store compliance.

Exit when Android and iOS differences are documented in the UI, language/RTL tests pass, support can diagnose failures without content, and staged rollback is rehearsed.

### Phase 6: optional integrations

Evaluate provider connections, OCR, advanced automation, and additional OS integrations one at a time. Each candidate needs a product case, privacy review, legal/region review, support owner, data migration plan, and rollback plan.

Exit only when the candidate has a stable contract and does not weaken local-only behavior.

## Phase gates

Every phase ends with four gates:

1. Product gate: requirements, UX states, limits, and open decisions are resolved.
2. Data gate: schema, migrations, exports, sync encoding, and deletion are updated.
3. Trust gate: permissions, privacy, security, accessibility, and telemetry are reviewed.
4. Operations gate: tests, monitoring, support text, release notes, and rollback are ready.

## Full-product delivery order

Build source-of-truth records before projections, projections before reports, local behavior before sync, and platform adapters before platform-specific UI. Do not build a remote provider before import/export and deletion behavior are stable.

## Implementation review: Phase 0/1 pass

Status: Completed on 2026-07-26.

Delivered:

- React Native 0.86.0 native Android/iOS shell with Java 17 Android build support;
- typed embedded-bundle launch gate before `MainApp`;
- AsyncStorage-backed local schema version 1 store with corruption rejection;
- Home, Money, Notes, and Tasks screens;
- manual money entry, note creation, task creation/completion, and local persistence;
- metadata validation CLI through `npm run check-bundle`;
- Jest unit coverage for storage, money helpers, installer gate, and metadata validation.

Review evidence:

```text
npm run lint         PASS
npm run typecheck    PASS
npm test             PASS - 4 suites, 8 tests
npm run check-bundle PASS
Android debug APK   PASS - app:assembleDebug
ADB emulator        PASS - Home launch, money/note/task actions, force-stop persistence
ADB phone           PASS - install and launch on device 42adce68
```

Known limits:

- Remote JavaScript bundle download and native activation are not implemented yet; the current gate safely selects the embedded bundle only.
- Android Usage Access is represented by an honest unavailable Home card; the native adapter is the next phase.
- The phone blocks `adb shell input` with `INJECT_EVENTS`, so interactive smoke actions were run on the emulator instead.

Next pass: Phase 2 planning and insight, beginning with Android Usage Access, date/period queries, app-time aggregation, and money categories/accounts.

## Implementation review: Phase 2 pass

Status: Core Phase 2 pass completed on 2026-07-26.

Delivered:

- schema version 2 with version 1 migration and legacy-key preservation;
- money accounts, seeded categories, user-created accounts, and user-created categories;
- current-month money totals and local period helpers;
- Android `PACKAGE_USAGE_STATS` declaration and typed `YuzuhaUsageAccess` native module;
- permission settings flow, daily UsageStatsManager query, local snapshots, top-app rows, and Home refresh;
- regression test for Android single-day bucket normalization.

Review evidence:

```text
npm run lint         PASS
npm run typecheck    PASS
npm test             PASS - 6 suites, 16 tests
Android debug APK   PASS - native Usage Access module compiles
ADB emulator        PASS - permission settings, grant, read, top-app rows, Home update
ADB phone           PASS - install and launch on device 42adce68
```

Known limits:

- Usage labels currently fall back to package names when Android cannot resolve an application label.
- The local JSON store remains a temporary Phase 2 boundary; full-product SQLite work is still planned.

Next pass: reports, split transactions, richer time goals, and the SQLite repository boundary.

## Implementation review: Phase 3 pass

Status: Core Phase 3 pass completed on 2026-07-26.

Delivered:

- schema version 3 with migration from versions 1 and 2;
- money entry edit and permanent delete actions;
- account and category archive actions, with the last active account protected;
- app-time package exclusions that immediately change totals;
- daily and weekly time goals with local progress;
- period-key coverage and excluded-snapshot unit assertions.

Review evidence:

```text
npm run lint         PASS
npm run typecheck    PASS
npm test             PASS - 7 suites, 18 tests
Emulator money      PASS - edit 12.50 to 13.50, delete, archive category
Emulator app time   PASS - exclude package, total changed 12 h 30 min to 31 min
Emulator goal       PASS - weekly 300 minute goal saved and showed 56 min of 5 h
```

Known limits:

- The local JSON store is still temporary; SQLite remains planned.
- Reports, transfers, split transactions, and multi-currency reconciliation are not complete.
- The phone `42adce68` still blocks automated touch input, so interactive evidence remains emulator-based.

Next pass: SQLite repository work, money reports, transfers, split entries, and fuller account/category management.

## Implementation review: Phase 4 repository/report pass

Status: Core Phase 4 pass completed on 2026-07-26.

Delivered:

- `@op-engineering/op-sqlite` 17.1.2 wired through `SqliteWorkspaceStore`;
- transactional repository schema with typed records, metadata, update index, and explicit version rejection;
- one-time import of AsyncStorage schema versions 1, 2, and 3 into SQLite;
- corruption and round-trip tests for all Phase 3 collections;
- source-backed money reports for day, week, and month periods;
- currency-separated income, spending, net, and category projections.

Review evidence:

```text
npm run lint         PASS
npm run typecheck    PASS
npm test             PASS - 9 suites, 24 tests
Android debug APK   PASS - op-sqlite native bridge and C++ build
Emulator migration  PASS - legacy workspace reopened with 31 min app time and 1 saved note
Emulator persistence PASS - EUR 9.12 remained after force-stop and relaunch
Emulator report     PASS - month report showed EUR 9.12 spent under Food
Phone               PASS - install, launch, SQLite native load, and activity resume
```

Known limits:

- The SQLite repository uses typed JSON payload rows as the first migration boundary; normalized feature tables are still planned.
- Budgets, transfers, split transactions, exports, sync, and remote bundle activation remain incomplete.
- The phone `42adce68` still blocks automated touch input, so interactive report evidence is emulator-based.

Next pass: normalized money tables, transfers, split-entry validation, and a budget projection.
