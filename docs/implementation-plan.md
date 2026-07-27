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

## Implementation review: Android attachment preview pass

Status: Completed on 2026-07-27.

Delivered:

- a typed React Native adapter that reports unsupported platforms and native open failures as explicit errors;
- an Android `YuzuhaAttachmentPreview` module that accepts only a canonical file directly under app-private `filesDir/attachments`;
- a `FileProvider` path rule that grants a single read-only URI to the Android system chooser;
- supported preview MIME types for JPEG, PNG, GIF, WebP, PDF, and plain text;
- an `Open attachment` action in Notes with busy and error states;
- focused regression coverage for the adapter, native bridge boundary, and file-path/MIME handoff.

Known limits:

- this is an Android-only local viewer handoff;
- Yuzuha does not provide an in-app renderer, upload, attachment search, synced attachments, platform backup policy, or iOS preview yet.

Review evidence:

```text
Focused Jest       PASS - 2 suites, 11 tests
Full Jest          PASS - 20 suites, 85 tests
npm run lint       PASS
npm run typecheck  PASS
Bundle check       PASS - Android metadata valid
Android bundle     PASS - embedded release bundle generated
Android builds     PASS - debug and release APKs with Java 17
Emulator smoke     PASS - imported a PNG from DocumentsUI, opened the Android Photos viewer, and returned to Yuzuha
Phone smoke        PASS - release APK installed and MainActivity resumed on 42adce68; touch input remains policy-blocked
```

Next pass: account/device recovery design or attachment search/sync, with remote sync kept behind the local-first boundary.

## Implementation review: note tags and local search pass

Status: Completed on 2026-07-27.

Delivered:

- app data schema 11 with deterministic schema 10 to schema 11 note-tag migration;
- AsyncStorage key migration from `@yuzuha/app-data/v10` to `@yuzuha/app-data/v11` while retaining older keys as read-only migration sources;
- old SQLite note-row migration that adds an empty tag collection and rejects malformed tag arrays;
- normalized comma-separated tags with a 20-tag limit and 40-character per-tag limit;
- case-insensitive local search over note title, body, and tags;
- Notes UI tag input, tag display, search field, and explicit no-match state;
- JSON and encrypted-backup app-schema bounds updated to accept schema 11;
- focused regression coverage for normalization, invalid tags, search matching, AsyncStorage migration, SQLite migration, and restore compatibility.

Known limits:

- note edit, archive, pin, and delete actions are not implemented yet;
- attachment filename search, saved searches, global search, synced notes, and remote sync remain planned.

Review evidence:

```text
Focused Jest       PASS - 3 suites, 19 tests
Full Jest          PASS - 21 suites, 90 tests
npm run lint       PASS
npm run typecheck  PASS
Bundle check       PASS - Android metadata valid
Android bundle     PASS - embedded release bundle generated
Android builds     PASS - debug and release APKs with Java 17
Emulator smoke     PASS - tagged note created, persisted after restart, title/body/tag searches matched, and no-match state shown
Phone smoke        PASS - release APK installed and MainActivity resumed on 42adce68; touch input remains policy-blocked
```

Next pass: account/device recovery design or attachment filename search, with remote sync kept behind the local-first boundary.

## Implementation review: note lifecycle pass

Status: Completed on 2026-07-27.

Delivered:

- app data schema 12 with deterministic schema 11 to schema 12 archive-state migration;
- AsyncStorage and SQLite note reads that default missing archive state to `false`;
- note edit validation and updates for title, body, and normalized tags;
- pin/unpin, archive/restore, and confirmed delete actions in the Notes screen;
- archived notes hidden by default, with an explicit Show archived notes control and pinned-first ordering;
- confirmed note deletion removes attachment metadata and private attachment files;
- JSON and encrypted-backup app-schema bounds updated to accept schema 12;
- focused and full regression coverage for lifecycle rules and migrations.

Known limits:

- attachment filename search, saved searches, global search, synced notes, and remote sync remain planned.

Review evidence is recorded after the final test, build, and device-smoke pass below.

Review evidence:

```text
Focused Jest       PASS - 4 suites, 27 tests
Full Jest          PASS - 22 suites, 94 tests
npm run lint       PASS
npm run typecheck  PASS
Bundle check       PASS - Android metadata valid
Android bundle     PASS - embedded release bundle generated
Android builds     PASS - debug and release APKs with Java 17
Emulator smoke     PASS - note created, edited, pinned, archived, shown/restored, confirmed-deleted, and no launch errors
Phone smoke        PASS - release APK installed and MainActivity resumed on 42adce68; touch input remains policy-blocked
```

Next pass: account/device recovery design or saved searches, with remote sync kept behind the local-first boundary.

## Implementation review: attachment filename search pass

Status: Completed on 2026-07-27.

Delivered:

- local note search now matches validated attachment file names case-insensitively;
- search still uses metadata only and never reads attachment bytes;
- archived-note filtering and pinned-first ordering remain unchanged;
- Notes search copy now names attachment file names as a searchable field;
- focused regression coverage proves filename matching and archive/pin behavior;
- documentation and the release note record the new local search boundary.

Known limits:

- saved searches, global search, synced notes, account recovery, and remote sync remain planned.

Review evidence:

```text
Focused Jest       PASS - 2 suites, 7 tests
Full Jest          PASS - 22 suites, 96 tests
npm run lint       PASS
npm run typecheck  PASS
Bundle check       PASS - Android metadata valid
Android bundle     PASS - embedded release bundle generated
Android builds     PASS - debug and release APKs with Java 17
Emulator smoke     PASS - `BackupSmoke` found by `yuzuha-attachment.txt`
Phone smoke        PASS - release APK installed and MainActivity resumed on 42adce68; touch input remains policy-blocked
```

## Implementation review: saved-search pass

Status: Completed on 2026-07-27.

Delivered:

- app data schema 13 with deterministic schema 12 to schema 13 migration;
- typed local saved-search records with trimmed names, trimmed note queries, archived-note visibility, and 80/200 character limits;
- SQLite and legacy AsyncStorage persistence, JSON export/restore validation, and password/recovery encrypted-backup round trips;
- Notes controls to save the current non-empty query, Apply it, and Delete it after confirmation;
- documentation and release notes for the local-only search boundary.

Known limits:

- global search, synced notes, account recovery, and remote sync remain planned.

Review evidence:

```text
Focused Jest       PASS - 7 suites, 42 tests
Full Jest          PASS - 23 suites, 100 tests
npm run lint       PASS
npm run typecheck  PASS
Bundle check       PASS - Android metadata valid
Android bundle     PASS - embedded release bundle generated
Android builds     PASS - debug and release APKs with Java 17
Emulator smoke     PASS - `Work` saved for `work`, persisted after restart, applied, and deleted after confirmation
Phone smoke        PASS - release APK installed and MainActivity resumed on 42adce68; touch input remains policy-blocked
```

Next pass: global search design or account/device recovery, with remote sync kept behind the local-first boundary.

## Implementation review: global-search pass

Status: Completed on 2026-07-27.

Delivered:

- a local derived search model over supported money, notes, tasks, saved searches, accounts/categories, transfers/splits/budgets, recurring rules, time goals, and app-time metadata;
- deterministic case-insensitive matching and result ordering;
- explicit archived-result filtering for archived notes, accounts, categories, budgets, and time goals;
- the existing Usage Access and `included` rules applied to app-time results;
- a Search screen opened from Home with empty, no-match, archived-results, and local-only states;
- unit tests and device smoke evidence for the new search behavior.

Known limits:

- no persistent full-text index, date filters, command actions, synced search, synced notes, account recovery, or remote sync yet.

Review evidence:

```text
Focused Jest       PASS - 1 suite, 2 tests
Full Jest          PASS - 24 suites, 102 tests
npm run lint       PASS
npm run typecheck  PASS
Bundle check       PASS - Android metadata valid
Android bundle     PASS - embedded release bundle generated
Android builds     PASS - debug and release APKs with Java 17
Emulator smoke     PASS - Search opened from Home, `work` returned two note results, and archived visibility toggled
Phone smoke        PASS - release APK installed and MainActivity resumed on 42adce68; touch input remains policy-blocked
```

Next pass: account/device recovery design or the next Phase 3 capture contract, with remote sync kept behind the local-first boundary.

## Implementation review: note-to-task pass

Status: Completed on 2026-07-27.

Delivered:

- app data schema 14 with deterministic schema 13 to schema 14 task-link migration;
- nullable `sourceNoteId` on tasks, with old tasks receiving `null`;
- Notes `Make task` action that copies the note title/body into a new open task and leaves the note unchanged;
- Tasks source-note display with an explicit `Deleted note` state after source deletion;
- JSON restore, encrypted backup, SQLite round-trip, and local-store coverage for the link field;
- documentation and release notes for the local cross-feature boundary.

Known limits:

- task editing, projects, recurring task rules, reminders, synced links, account recovery, and remote sync remain planned.

Review evidence:

```text
Focused Jest       PASS - 7 suites, 44 tests
Full Jest          PASS - 25 suites, 106 tests
npm run lint       PASS
npm run typecheck  PASS
Bundle check       PASS - Android metadata valid
Android bundle     PASS - embedded release bundle generated
Android builds     PASS - debug and release APKs with Java 17
Emulator smoke     PASS - note `Phase Tags` converted to a task and Tasks showed `From note: Phase Tags`
Phone smoke        PASS - release APK installed and MainActivity resumed on 42adce68; touch input remains policy-blocked
```

Next pass: account/device recovery design or the next Phase 3 task contract, with remote sync kept behind the local-first boundary.

## Implementation review: task-lifecycle pass

Status: Completed on 2026-07-27.

Delivered:

- app data schema 15 with a seeded `Inbox` task list and deterministic migration from schema 14;
- typed task draft validation for trimmed titles, optional local due dates, priorities, and list links;
- task create, edit, complete/reopen, and confirmed delete actions in the local store;
- Tasks views for All, Overdue, Today, Upcoming, and Completed using one local-date rule;
- task fields included in SQLite rows, JSON exports and restore validation, encrypted backups, and old SQLite/task migrations;
- unit coverage for validation, identity-preserving edits, deletion rules, filters, and schema migration.

Review evidence:

```text
Focused task tests       PASS - task lifecycle, note-task, migration, JSON, backup, and SQLite coverage
Full Jest                PASS - 26 suites, 110 tests
npm run lint             PASS
npm run typecheck        PASS
Bundle check             PASS - Android metadata valid
Android builds           PASS - debug and release APKs with Java 17
Emulator UI smoke        PASS - Tasks showed the new form, Inbox, priority controls, due-date field, and date filters
Phone smoke              PASS - release APK installed and MainActivity resumed on 42adce68; touch input remains policy-blocked
```

Known limits:

- custom task-list management, recurring task rules, reminders, synced links, account recovery, and remote sync remain planned.

Next pass: custom task-list management or account/device recovery design, with remote sync kept behind the local-first boundary.

## Implementation review: task-list management pass

Status: Completed on 2026-07-27.

Delivered:

- local task-list create, rename, archive/restore, and delete actions;
- trimmed, case-insensitive unique names with a 60-character limit;
- protected Inbox list and reference-safe deletion for custom lists;
- Tasks UI controls for list management and active-list selection;
- JSON restore validation and SQLite round-trip coverage for custom task lists;
- no schema, permission, or minimum-OS change.

Review evidence:

```text
Focused list tests       PASS - 2 suites, 13 tests
Full Jest                PASS - 27 suites, 114 tests
npm run lint             PASS
npm run typecheck        PASS
Bundle check             PASS - Android metadata valid
Android builds           PASS - debug and release APKs with Java 17
Emulator list smoke      PASS - ADB created `Work`, then archive state showed `Archived` and `Restore`
Phone smoke              PASS - release APK installed and MainActivity resumed on 42adce68; touch input remains policy-blocked
```

Known limits:

- moving tasks in bulk, recurring task rules, reminders, account recovery, and remote sync remain planned.

Next pass: account/device recovery design behind the local-first boundary.

## Implementation review: recurring-task pass

Status: Completed on 2026-07-27.

Delivered:

- app data schema 16 with typed task recurrence rules and nullable task `recurrenceRuleId` links;
- date-only day/week/month rules with intervals from 1 to 365 and explicit All, One, or Skip handling for missed dates;
- deterministic startup and rule-creation expansion that creates open tasks once and advances each rule beyond the full due range;
- Tasks UI controls to add, pause/resume, and delete rules;
- deletion keeps existing generated tasks and clears their rule links;
- task-list deletion rejects lists referenced by a recurring rule;
- SQLite, legacy AsyncStorage, JSON export/restore, and encrypted-backup validation for schema 16;
- migration and round-trip tests for schema 15 to 16, recurrence expansion, list references, and SQLite persistence.

Known limits:

- no notifications, background scheduling, series editing, templates, task occurrence history, account recovery, or sync;
- phone `42adce68` remains launch-only because device policy blocks touch automation.

Review evidence:

```text
Focused recurrence tests  PASS - recurrence, migration, list, import, backup, and SQLite coverage
Full Jest                PASS - 28 suites, 118 tests
npm run lint             PASS
npm run typecheck        PASS
Bundle check             PASS - Android metadata valid
Android builds           PASS - debug and release APKs with Java 17
Emulator UI smoke        PASS - recurring rule created immediately with a generated task, persisted after restart, and showed next date 2026-08-03
Phone smoke              PASS - release APK installed and MainActivity resumed on 42adce68; touch input remains policy-blocked
```

Next pass: account/device recovery design, with notifications and remote sync kept behind separate contracts.

## Implementation review: task-reminder pass

Status: Completed on 2026-07-27.

Delivered:

- app data schema 17 with nullable `reminderAtMillis` and schema 16 to 17 migration;
- strict local `YYYY-MM-DDTHH:mm` parsing, impossible-date/DST-gap rejection, and future-time validation;
- one optional reminder field in the Tasks form, with permission denial shown as an explicit error;
- typed Android bridge for notification permission, schedule, cancel, and full reminder synchronization;
- stable task-ID AlarmManager schedules, notification-channel creation, privacy-safe notification text, and boot rescheduling;
- AppStore rules that cancel on complete/delete/clear, replace schedules deterministically, and synchronize startup/restore sets;
- JSON, encrypted-backup, SQLite, and legacy AsyncStorage persistence and validation for schema 17;
- focused tests for reminder validation, bridge behavior, schema migration, invalid import data, and SQLite round trips.

Review evidence so far:

```text
Focused reminder tests  PASS - 5 suites, 38 tests
Full Jest                PASS - 31 suites, 126 tests
npm run lint             PASS
npm run typecheck        PASS
npm run check-bundle     PASS - Android metadata valid
Android builds           PASS - debug and release APKs with Java 17
Emulator UI smoke        PASS - task row showed Reminder 2026-07-28T09:30 and the stable alarm survived force-stop/relaunch
Emulator delivery        PASS - near-term reminder appeared on channel task_reminders after Android's delivery window
Phone smoke              PASS - release APK installed and MainActivity resumed on 42adce68; touch input remains policy-blocked
```

Known limits:

- no quiet hours, snooze, notification actions, recurring-rule notifications, iOS reminders, account recovery, or sync.

Next pass: reminder deep-link handling, with broader notification automation and account/device recovery kept behind separate contracts.

## Implementation review: task-reminder deep-link pass

Status: Completed on 2026-07-27.

Delivered:

- typed JavaScript bridge methods for the initial task ID and warm-app task-open events;
- Android native notification intents carrying the stable task ID;
- one-time cold-start intent consumption and warm `MainActivity.onNewIntent` event delivery;
- MainApp routing to Tasks and task-form loading for the matching task;
- missing task IDs ignored without changing workspace data;
- no schema, permission, or minimum-OS change.

Review evidence:

```text
Focused bridge tests     PASS - cold-start getter and warm-app subscription coverage
Full Jest                PASS - 31 suites, 127 tests
npm run lint             PASS
npm run typecheck        PASS
npm run check-bundle     PASS - Android metadata valid
Android builds           PASS - debug and release APKs with Java 17
Emulator tap smoke       PASS - delivered notification reopened DeepLinkSmoke in edit mode with its reminder
Emulator cold start      PASS - explicit task intent routed to Tasks without app errors
Phone smoke              PASS - release APK installed and MainActivity resumed on 42adce68; touch input remains policy-blocked
```

Known limits:

- iOS notification intents, quiet hours, snooze, notification actions, recurring-rule notifications, account recovery, and sync remain planned.

Next pass: account/device recovery design or the next local notification contract, with remote sync kept behind its service boundary.

## Implementation review: local quiet-hours pass

Status: Completed on 2026-07-27.

Delivered:

- app data schema 18 with nullable daily local `quietHoursStartLocalTime` and `quietHoursEndLocalTime`;
- strict `HH:mm` validation with disabled, same-day, and overnight window rules;
- Tasks UI to save or disable quiet hours with explicit success and validation messages;
- deterministic schedule projection that keeps the logical task reminder time unchanged and moves in-window Android alarms to the local quiet-hours end;
- AppStore resynchronization on settings changes, startup, restore, reminder edits, completion, deletion, and rollback paths;
- SQLite repository metadata, JSON import/export, encrypted backup, and legacy schema 17 migration support;
- unit and persistence tests for validation, projection, schema migration, SQLite round trips, and failed-save rollback behavior.

Review evidence:

```text
Full Jest                PASS - 32 suites, 134 tests
npm run lint             PASS
npm run typecheck        PASS
npm run check-bundle     PASS - Android metadata valid
Android builds           PASS - debug and release APKs with Java 17
Emulator UI smoke        PASS - saved 22:00-07:00 and showed Quiet hours saved.
Emulator alarm smoke     PASS - 06:15 in-window 06:30 reminder was scheduled at 07:00
Phone smoke              PASS - release APK installed and MainActivity resumed on 42adce68; touch input remains policy-blocked
```

Known limits:

- no snooze, notification actions, recurring-rule notifications, iOS reminders, account recovery, or sync.

Next pass: notification actions or account/device recovery design, with remote sync kept behind its service boundary.

## Implementation review: Android notification Complete-action pass

Status: Completed on 2026-07-27.

Delivered:

- typed `Open` and `Complete` task-reminder targets across the Android bridge and MainApp;
- Android reminder content tap remains `Open`, and the notification now has a `Complete` action;
- `Complete` uses the stable task ID and local AppStore state, completes only an existing open task, preserves the logical reminder timestamp, and is idempotent;
- stale or repeated actions are ignored, and the handled notification is explicitly dismissed;
- no schema, permission, or minimum-OS change.

Review evidence:

```text
Focused Jest                PASS - bridge target and AppStore idempotence coverage
Full Jest                   PASS - 32 suites, 136 tests
npm run lint                PASS
npm run typecheck           PASS
npm run check-bundle        PASS - Android metadata valid
Android builds              PASS - debug and release APKs with Java 17
Emulator action smoke       PASS - Complete action completed the task and opened MainActivity
Emulator dismissal smoke    PASS - handled notification record was removed
Phone smoke                 PASS - release APK installed and MainActivity resumed on 42adce68; touch input remains policy-blocked
```

Known limits:

- no snooze, recurring-rule notifications, iOS reminders, account recovery, or sync.

Next pass: notification snooze or account/device recovery design, with remote sync kept behind its service boundary.

## Implementation review: Android notification Snooze 1h pass

Status: Completed on 2026-07-27.

Delivered:

- typed `Open`, `Complete`, and `Snooze` task-reminder targets across the Android bridge and MainApp;
- Android reminder notifications now show `Snooze 1h`, `Complete`, and the existing content-tap `Open` behavior;
- `Snooze 1h` replaces the logical reminder with exactly one hour after the action time and schedules its quiet-hours projection;
- missing and completed targets are ignored, the old native schedule is replaced before the new timestamp is committed, and the handled notification is dismissed;
- no schema, permission, or minimum-OS change.

Review evidence:

```text
Focused Jest                PASS - snooze projection and stale-target coverage
Full Jest                   PASS - 32 suites, 138 tests
npm run lint                PASS
npm run typecheck           PASS
npm run check-bundle        PASS - Android metadata valid
Android builds              PASS - debug and release APKs with Java 17
Emulator action smoke       PASS - Snooze 1h showed beside Complete and opened MainActivity
Emulator alarm smoke        PASS - new dev.yuzuha.TASK_REMINDER was scheduled at action time + 1 hour
Emulator dismissal smoke    PASS - handled notification record was removed
Phone smoke                 PASS - release APK installed and MainActivity resumed on 42adce68; touch input remains policy-blocked
```

Known limits:

- no user-selected snooze durations, recurring-rule notifications, iOS reminders, account recovery, or sync.

Next pass: user-selected snooze policy or account/device recovery design, with remote sync kept behind its service boundary.

## Implementation review: Android snooze-duration policy pass

Status: Completed on 2026-07-27.

Delivered:

- app data schema 19 with required local `snoozeDurationMinutes` values of 15, 30, 60, or 120;
- schema 18, legacy SQLite, JSON, encrypted backup, and AsyncStorage paths default and migrate the setting to 60 minutes;
- Tasks notification settings UI to choose and save the local duration;
- Android notification action label changed to generic `Snooze`; the AppStore applies the selected duration and existing quiet-hours projection;
- no new permission or minimum-OS change.

Review evidence:

```text
Focused Jest                PASS - 7 suites, 53 tests for settings, migration, SQLite, import/export, and snooze behavior
Full Jest                   PASS - 32 suites, 141 tests
npm run lint                PASS
npm run typecheck           PASS
npm run check-bundle        PASS - Android metadata valid
Android builds              PASS - debug and release APKs with Java 17, max 2 workers and no daemon
Emulator settings smoke     PASS - saved 30m and showed the selected option
Emulator action smoke       PASS - notification showed generic Snooze and Complete actions
Emulator alarm smoke        PASS - Snooze scheduled a new alarm about 30 minutes after the action
Phone smoke                 PASS - release APK installed and MainActivity resumed on 42adce68; touch input remains policy-blocked
```

Known limits:

- no per-notification custom duration, recurring-rule notifications, iOS reminders, account recovery, or sync.

Next pass: account/device recovery design or recurring notification policy, with remote sync kept behind its service boundary.
