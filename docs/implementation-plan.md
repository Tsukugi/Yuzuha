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

## Implementation review: money transfer pass

Status: Completed on 2026-07-26.

Delivered:

- schema version 4 with a deterministic schema 3 to schema 4 migration;
- `MoneyTransfer` source records stored through the transactional SQLite repository;
- validation for positive amounts, distinct active accounts, and matching currencies;
- account-balance projection from opening balances, entries, and transfer inflows/outflows;
- Money transfer screen with account selection, history, delete action, and an honest one-account empty state;
- unit coverage for validation, balances, persistence, and migration behavior.

Review evidence:

```text
npm run lint         PASS
npm run typecheck    PASS
npm test             PASS - 10 suites, 28 tests
npm run check-bundle PASS
Android debug APK   PASS - app:assembleDebug with Java 17
Emulator transfer   PASS - EUR 2.50 moved Everyday to Savings; balances changed and reports stayed EUR 9.12
Emulator restart    PASS - transfer row and projected balances survived force-stop/relaunch
Phone               PASS - install, launch, and resumed activity with no cleared-logcat app errors
```

Known limits:

- Money records still use typed JSON rows as the repository migration boundary; normalized money tables remain planned.
- Split transactions, budgets, recurring rules, exports, sync, and remote bundle activation remain incomplete.
- The phone `42adce68` blocks automated touch input, so interactive transfer evidence is emulator-based.

Next pass: split-entry validation and a budget projection, with normalized money tables introduced only when their migration contract is tested.

## Implementation review: split-entry pass

Status: Completed on 2026-07-26.

Delivered:

- schema version 5 with a deterministic schema 4 to schema 5 migration;
- `MoneySplit` source records linked to one parent money entry;
- exact integer minor-unit validation for at least two positive lines;
- active, kind-matching category validation for every line;
- report expansion that preserves the parent total and shows line categories;
- split screen with line editing, add/remove line controls, history, and deletion;
- unit coverage for validation, creation, report projection, migration, and SQLite round-trip behavior.

Review evidence:

```text
npm run lint         PASS
npm run typecheck    PASS
npm test             PASS - 11 suites, 33 tests
npm run check-bundle PASS
Android debug APK   PASS - app:assembleDebug with Java 17
Emulator split      PASS - EUR 10.00 parent saved as EUR 7.00 Health + EUR 3.00 Housing
Emulator report     PASS - EUR 19.12 total with split categories after save and restart
Phone               PASS - install, launch, and resumed activity with no cleared-logcat app errors
```

Known limits:

- Money records still use typed JSON rows as the repository migration boundary; normalized financial tables remain planned.
- Budgets, recurring rules, exports, sync, and remote bundle activation remain incomplete.
- The phone `42adce68` blocks automated touch input, so interactive split evidence is emulator-based.

Next pass: budget projection and budget-period validation, followed by normalized money tables when their migration contract is ready.

## Implementation review: budget pass

Status: Completed on 2026-07-26.

Delivered:

- schema version 6 with a deterministic schema 5 to schema 6 migration;
- `MoneyBudget` source records with category, currency, positive limit, and day/week/month period;
- validation for active expense categories, uppercase currency codes, valid periods, and positive minor units;
- source-backed projection that counts matching regular expenses and split lines only;
- deterministic used, remaining, percentage, and empty/on-track/near-limit/over statuses;
- Budgets screen with creation, current projection, and deletion;
- unit coverage for validation, period boundaries, split-line projection, thresholds, migration, and SQLite round-trip behavior.

Review evidence:

```text
npm run lint         PASS
npm run typecheck    PASS
npm test             PASS - 12 suites, 37 tests
npm run check-bundle PASS
Android debug APK   PASS - app:assembleDebug with Java 17
Emulator budget     PASS - monthly EUR 10.00 Health budget showed EUR 7.00 used / EUR 3.00 remaining / 70%
Emulator restart    PASS - budget projection survived force-stop/relaunch
Phone               PASS - install, launch, and resumed activity with no cleared-logcat app errors
```

Known limits:

- Money records still use typed JSON rows as the repository migration boundary; normalized financial tables remain planned.
- Budget rollover, recurring rules, alerts, exports, sync, and remote bundle activation remain incomplete.
- The phone `42adce68` blocks automated touch input, so interactive budget evidence is emulator-based.

Next pass: normalized money tables and budget rollover rules, with import/export contracts kept separate from the local projection.

## Implementation review: normalized storage and rollover pass

Status: Completed on 2026-07-26.

Delivered:

- app data schema 7 with a deterministic schema 6 to schema 7 migration that defaults old budgets to `none`;
- repository schema 2 with normalized `money_entries`, `money_transfers`, `money_splits`, `money_split_lines`, and `money_budgets` tables;
- one-transaction migration from repository schema 1 typed financial rows into the normalized tables;
- typed-column read validation for normalized financial rows and explicit rejection of orphan split lines;
- `none` and one-period `carry-forward` budget rules, with the carried amount capped at one base budget limit;
- budget UI controls and display for the selected rollover rule and carried amount.

Review evidence so far:

```text
npm run lint         PASS
npm run typecheck    PASS
npm test             PASS - 12 suites, 40 tests
```

Review evidence:

```text
npm run check-bundle PASS
Android debug APK   PASS - app:assembleDebug with Java 17
Emulator migration  PASS - EUR 19.12, 31 min, note, accounts, transfer, split, and old budget remained available
Emulator rollover   PASS - EUR 10.00 carried + EUR 7.00 used = EUR 13.00 remaining / 35%
Emulator restart    PASS - both none and carry-forward budget projections remained after force-stop/relaunch
Phone               PASS - install, launch, and resumed MainActivity with no cleared-logcat app errors
```

Known limits:

- Multi-period rollover, recurring budgets, alerts, exports, sync, and remote bundle activation remain planned.
- The phone `42adce68` blocks automated touch input, so interactive rollover evidence is emulator-based.

Next pass: recurring money rules and export contracts, with sync kept behind the local-first boundary.

## Implementation review: export and deletion pass

Status: Completed on 2026-07-26.

Delivered:

- export schema version 1 for JSON and money CSV;
- complete JSON export envelope with export time, app schema version, and all supported local collections;
- money CSV with schema versions, minor-unit amounts, currencies, IDs, categories, notes, timestamps, and split IDs;
- Data tools screen with Android Share integration for both formats;
- confirmed local deletion that writes `emptyAppData()` through the SQLite repository and preserves only seeded workspace defaults;
- unit coverage for JSON contents, CSV fields, CSV escaping, and empty exports.

Review evidence:

```text
npm run lint         PASS
npm run typecheck    PASS
npm test             PASS - 13 suites, 43 tests
npm run check-bundle PASS
Android debug APK   PASS - app:assembleDebug with Java 17
Emulator export     PASS - Android share sheet opened with Quick Share, Drive, and Bluetooth targets
Emulator deletion   PASS - confirmation required; Home showed EUR 0.00, 0 notes, and 0 open tasks afterward
Phone               PASS - install, launch, and resumed MainActivity with no cleared-logcat app errors
```

Known limits:

- The current export sends text through the Android share sheet; file-picker import and sync remain planned. JSON restore validation and password-encrypted backup are implemented in later passes.
- Multi-period rollover, recurring money rules, and alerts remain planned.
- The phone `42adce68` blocks automated touch input, so interactive export/delete evidence is emulator-based.

Next pass: recurring money rules, then import/restore validation after export is stable.

## Implementation review: recurring money pass

Status: Completed on 2026-07-26.

Delivered:

- app data schema 8 with a deterministic schema 7 to schema 8 migration;
- persisted `MoneyRecurrenceRule` source records in the typed `app_records` table;
- day, week, and month cadence validation with intervals from 1 to 365;
- local calendar expansion with monthly short-month clamping;
- deterministic rule/date generated entry IDs and next-date advancement;
- automatic due-entry expansion on rule creation and workspace load;
- recurring-money creation and rule deletion UI;
- unit coverage for validation, calendar boundaries, due generation, duplicate prevention, migration, and SQLite round-trip behavior.

Review evidence:

```text
npm run lint         PASS
npm run typecheck    PASS
npm test             PASS - 14 suites, 47 tests
npm run check-bundle PASS
Android debug APK   PASS - app:assembleDebug with Java 17
Emulator recurrence PASS - monthly EUR 2.50 rule generated one entry; next date was 2026-08-26
Emulator restart    PASS - Home remained EUR 2.50 after force-stop/relaunch; no duplicate was generated
Phone               PASS - final APK installed and MainActivity resumed with no cleared-logcat app errors
```

Known limits:

- Missed-occurrence choices, end-of-month anchor preferences, recurring task rules, alerts, import/restore, and sync remain planned.
- The phone `42adce68` blocks automated touch input, so interactive recurrence evidence is emulator-based.

Next pass: import and restore validation for the versioned JSON export.

## Implementation review: JSON import and restore pass

Status: Completed on 2026-07-26.

Delivered:

- strict parser for export schema 1 with app-schema migration support;
- validation for collection shape, duplicate IDs, record references, timestamps, currencies, money values, recurrence dates, and split totals;
- Data tools restore text area with preview counts and destructive confirmation;
- full workspace replacement through the existing SQLite save boundary;
- unit coverage for current exports, schema 7 migration, malformed JSON, duplicate IDs, and broken split totals.

Known limits:

- Restore is paste-based JSON replacement. CSV import, file-picker restore, merge, sync restore, and recovery keys remain planned; the local password-encrypted backup flow is implemented in a later pass.

Review evidence:

```text
npm run lint         PASS
npm run typecheck    PASS
npm test             PASS - 15 suites, 51 tests
npm run check-bundle PASS
Android debug APK   PASS - app:assembleDebug with Java 17
Emulator restore    PASS - invalid JSON preview was rejected without a write
Phone               PASS - final APK installed and MainActivity resumed without filtered app errors
```

Next pass: recurring missed-occurrence policy and backup/import expansion, with sync kept behind the local-first boundary.

## Implementation review: recurring missed-occurrence policy pass

Status: Completed on 2026-07-26.

Delivered:

- app data schema 9 with schema 8 to schema 9 migration;
- persisted `all`, `one`, or `skip` policy on every recurring money rule;
- deterministic catch-up behavior: all creates every due date, one creates the first due date, and skip creates none;
- all policies advance the rule beyond the full missed range in the same save;
- old SQLite recurrence payloads without a policy are upgraded at the read boundary to `all`;
- recurrence form and rule list show the selected policy;
- unit coverage for all, one, skip, validation, migration, and existing duplicate prevention.

Known limits:

- End-of-month anchor preferences, recurring task rules, notifications, sync, and recovery keys remain planned.

Review evidence:

```text
npm run lint         PASS
npm run typecheck    PASS
npm test             PASS - 15 suites, 55 tests
npm run check-bundle PASS
Android debug APK   PASS - app:assembleDebug with Java 17
Emulator policy     PASS - All, One, and Skip controls rendered and selected; restart preserved EUR 2.50 without an error
Phone               PASS - final APK installed and MainActivity resumed without filtered app errors
```

Next pass: local encrypted backup or the next highest-priority continuity contract, with sync kept behind the local-first boundary.

## Implementation review: encrypted local backup pass

Status: Completed on 2026-07-26.

Delivered:

- audited Noble XChaCha20-Poly1305 and scrypt dependencies plus the React Native secure-random polyfill;
- versioned encrypted backup envelope with authenticated header, random 16-byte salt, random 24-byte nonce, and 32-byte derived key;
- password validation requiring at least 12 characters and no local password storage;
- Data tools encrypted backup sharing and decrypt/preview/confirm restore flow;
- unit coverage for round-trip content, plaintext absence, wrong password, tampering, weak password, and unsupported envelope parameters;
- Jest transform coverage for the ESM crypto packages.

Known limits:

- Backup files are JSON documents without recovery keys or attachments. Platform backup policy, password recovery, and remote sync remain planned.

Review evidence:

```text
npm run lint         PASS
npm run typecheck    PASS
npm test             PASS - 16 suites, 58 tests
npm run check-bundle PASS
Android debug APK   PASS - app:assembleDebug with Java 17; installed on emulator and phone
Emulator backup     PASS - encrypted Data tools UI rendered; weak password was rejected; valid password opened the Android text chooser
Phone               PASS - final APK installed and MainActivity resumed without filtered app errors
```

Next pass: recovery-key design or attachment portability, with remote sync kept behind the local-first boundary.

## Implementation review: encrypted backup file-portability pass

Status: Completed on 2026-07-27.

Delivered:

- maintained system document picker and native filesystem dependencies for current React Native new architecture;
- encrypted backup file save through a temporary app-cache file and system Save as flow;
- encrypted backup file open through the system picker and the existing authenticated decrypt/validation/preview boundary;
- deterministic picker cancellation behavior and cache cleanup ownership;
- unit coverage for save/open calls, encrypted content, selected-file preview, cancellation, and cleanup after password validation failure.

Known limits:

- File backups remain JSON envelopes. Account recovery, device enrollment, native secure key storage, attachments, platform backup policy, password recovery, and remote sync remain planned.

Review evidence:

```text
npm run lint         PASS
npm run typecheck    PASS
npm test             PASS - 17 suites, 63 tests
npm run check-bundle PASS - Android bundle metadata valid
npm run bundle:android PASS - embedded release bundle generated
Android debug build  PASS - app:assembleDebug with Java 17
Android release build PASS - app:assembleRelease with Java 17
Emulator smoke       PASS - release APK saved, reopened, decrypted, and previewed an encrypted file with 8 records
Phone smoke          PASS - release APK installed and MainActivity resumed on 42adce68; touch input remains policy-blocked
```

Next pass: attachment portability or account/device recovery design, with remote sync kept behind the local-first boundary.

## Implementation review: local recovery-key backup pass

Status: Completed on 2026-07-27.

Delivered:

- secure 32-byte recovery-key generation with canonical grouped-hex formatting and input normalization;
- separate `recovery-key` credential marker in the authenticated backup header while preserving old password envelopes;
- recovery-key backup save through the system document picker with a distinct file name;
- in-session key re-entry confirmation and no local recovery-key storage;
- restore compatibility for grouped, ungrouped, and lowercase recovery-key input;
- regression coverage for malformed keys, credential markers, normalized restore input, and file naming.

Known limits:

- This pass covers local backup portability only. Account recovery, device enrollment, native secure key storage, encrypted attachment bytes, platform backup policy, password recovery, and remote sync remain planned.

Review evidence:

```text
Focused Jest       PASS - 11 recovery/encrypted-file tests
npm test            PASS - 17 suites, 66 tests
npm run lint        PASS
npm run typecheck   PASS
Bundle check        PASS - Android metadata valid
Android bundle     PASS - embedded release bundle generated
Android builds     PASS - debug and release APKs with Java 17
Emulator smoke     PASS - recovery-key file saved, reopened, decrypted, and previewed as recovery key with 8 records
Phone smoke        PASS - release APK installed and MainActivity resumed on 42adce68; touch input remains policy-blocked
```

Next pass: attachment portability or account/device recovery design, with remote sync kept behind the local-first boundary.

## Implementation review: local note attachment storage pass

Status: Completed on 2026-07-27.

Delivered:

- app data schema 10 with schema 9 migration and attachment metadata in JSON/SQLite records;
- system picker import for images, PDFs, and plain-text files;
- app-private file storage with name/type/size checks and SHA-256 checksum metadata;
- Notes UI to add and remove attachments, with a 10 MiB per-file limit and 10 attachments per note;
- focused unit coverage for migration, restore validation, encrypted metadata round-trip, SQLite round-trip, picker cancellation, size rejection, checksum metadata, attachment-count limits, workspace cleanup, and private-file deletion.

Known limits:

- encrypted backups carry attachment metadata but not attachment bytes;
- attachment previews, portable encrypted attachment bundles, sync, and attachment search remain planned.

Review evidence:

```text
Focused Jest       PASS - 4 attachment/schema suites, 27 tests
npm test           PASS - 18 suites, 76 tests
npm run lint       PASS
npm run typecheck  PASS
Bundle check       PASS - Android metadata valid
Android bundle     PASS - embedded release bundle generated
Android builds     PASS - debug and release APKs with Java 17
Emulator smoke     PASS - note attachment imported from DocumentsUI, displayed, and removed
Phone smoke        PASS - release APK installed and MainActivity resumed on 42adce68; touch input remains policy-blocked
```

Next pass: portable encrypted attachment bytes or account/device recovery design, with remote sync kept behind the local-first boundary.

## Implementation review: portable encrypted attachment backup pass

Status: Completed on 2026-07-27.

Delivered:

- encrypted backup schema 2 payload with authenticated attachment ID, size, SHA-256, and base64 file bytes;
- 32 MiB total attachment limit and validation of the complete attachment set;
- private-file read verification before backup creation and staged private-file writes before encrypted restore replacement;
- schema 1 password/recovery backup compatibility and explicit rejection of metadata-only JSON attachment restore;
- focused regression coverage for payload validation, checksum failures, file staging, and old encrypted backup reading.

Known limits:

- encrypted backup attachment bytes are bounded to 32 MiB per backup;
- previews, synced attachments, platform backup policy, and remote sync remain planned.

Review evidence:

```text
Focused Jest       PASS - 4 suites, 23 tests
Full Jest          PASS - 19 suites, 82 tests
npm run lint       PASS
npm run typecheck  PASS
Bundle check       PASS - Android metadata valid
Android bundle     PASS - embedded release bundle generated
Android builds     PASS - debug and release APKs with Java 17
Emulator smoke     PASS - encrypted file saved, reopened, previewed with 1 attachment, restored, and attachment returned at 3.2 KB
Phone smoke        PASS - release APK installed and MainActivity resumed on 42adce68; touch input remains policy-blocked
```

Next pass: account/device recovery design or attachment preview, with remote sync kept behind the local-first boundary.
