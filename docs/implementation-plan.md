# Implementation plan

Status: Planned work order for the first working Android release. The current Money graphs and theme pass is implemented and recorded below; older phase notes remain historical.

## Current implementation review: Money graphs and theme

The 2026-07-28 pass applies the supplied card/filter visual language to Money while keeping Home small. Home, Money, Notes, Tasks, Search, App Time, Data tools, Review, and Money report keep the product-plan rule that current records come before creation forms and secondary tools stay bounded.

Delivered:

- a title-free React shell with no visible app description or bundle label;
- one derived Home Money widget with main-currency balance and selected-period spending/income;
- a Money balance/activity card followed by the current entry list and separate Add money entry action;
- split-aware category spending bars and a local daily income/spending chart using pure derived data;
- System, Light, and Dark theme tokens applied to startup, shell, Money, and secondary screens;
- list-first Money, Notes, and Tasks entry with separate Add actions;
- minimal add forms with Money type/amount/category/account, Notes title/body, and Tasks title/save visible first;
- collapsed optional actions and settings for filters, reports, management, formatting, saved searches, task tools, focus sessions, time goals, and data operations;
- deterministic opening of the section needed by exact search focus for task, project, template, list, app-group, and budget editors;
- no schema, migration, import/export format, network request, worker, or background process.

Exit evidence: signed Java 17 release build, Xiaomi install/startup, Money list/form/graph UI hierarchy smoke in system light and dark modes, 52 Jest suites/231 tests, typecheck, lint, and diff checks.

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

## Implementation review: Android task-reminder category-pause pass

Status: Completed on 2026-07-27.

Delivered:

- app data schema 20 with required local `notificationSettings.taskRemindersEnabled`;
- schema 19, legacy SQLite, JSON, encrypted backup, and AsyncStorage paths default existing workspaces to reminders enabled;
- Tasks notification settings UI to switch the local Task reminders category On or Off;
- disabling the category clears native task-reminder alarms while retaining logical task reminder timestamps, and re-enabling rebuilds future alarms through quiet-hours projection;
- reminder creation while paused stores the logical timestamp without native permission/scheduling, and stale `Snooze` actions while paused are no-ops.

Review evidence:

```text
Focused Jest                PASS - 7 suites, 55 tests for settings, migration, SQLite, import/export, and pause behavior
Full Jest                   PASS - 32 suites, 143 tests
npm run lint                PASS
npm run typecheck           PASS
npm run check-bundle        PASS - Android metadata valid
Android builds              PASS - debug and release APKs with Java 17, max 2 workers and no daemon
Emulator category smoke     PASS - category pause retained logical reminder data and cleared native schedules
Phone smoke                 PASS - release APK installed and MainActivity resumed on 42adce68; touch input remains policy-blocked
```

Known limits:

- no per-category automation, recurring-rule notifications, iOS reminders, account recovery, or sync.

Next pass: account/device recovery design or recurring notification policy, with remote sync kept behind its service boundary.

## Implementation review: recurring task-reminder pass

Status: Completed on 2026-07-27.

Delivered:

- app data schema 21 adds nullable `taskRecurrenceRule.reminderLocalTime` with strict `HH:mm` validation;
- schema 20 rules migrate to `reminderLocalTime: null`, while existing generated tasks keep their current reminder values;
- each generated occurrence copies the rule time into its local task reminder timestamp;
- future generated reminders synchronize immediately after rule creation and during startup/boot through the existing category and quiet-hours projection;
- past generated timestamps are retained as logical values but are not scheduled; rule-level notification summaries, sync, and iOS behavior remain planned.

Review evidence:

```text
Failing tests first         PASS - schema 20 migration, rule creation, invalid HH:mm, and generated timestamp failures reproduced
Focused Jest                PASS - 5 suites, 52 tests for recurrence, migration, SQLite, import/export, and AppStore behavior
Full Jest                   PASS - 32 suites, 148 tests
npm run lint                PASS
npm run typecheck           PASS
npm run check-bundle        PASS - Android metadata valid
Android builds              PASS - debug and release APKs with Java 17, max 2 workers and no daemon
Emulator form smoke        PASS - recurring form showed optional HH:mm, saved RecurringSmoke3, and showed generated task reminder 23:59
Emulator alarm smoke       PASS - native TASK_REMINDER alarm remained at 2026-07-27 23:59 after relaunch
Phone smoke                 PASS - release APK installed and MainActivity resumed on 42adce68; touch input remains policy-blocked
```

Known limits:

- no rule-level notification summaries, recurring notification automation, iOS reminders, account recovery, or sync.

Next pass: account/device recovery design or recurring notification policy, with remote sync kept behind its service boundary.

## Implementation review: latest-only data-boundary pass

Status: Completed on 2026-07-27.

Delivered:

- current app schema 21, JSON export schema 1 with app schema 21 data, encrypted backup schema 2, and SQLite repository schema 2 are the only accepted data versions;
- old JSON app schemas, old encrypted backup envelopes, and SQLite repository schema 1 are rejected with explicit errors;
- fresh SQLite startup seeds `emptyAppData()` directly, without a legacy AsyncStorage product-data import;
- SQLite decode paths no longer fill missing current fields with defaults for notification settings, recurrence policies, note fields, task recurrence reminder times, or task lifecycle fields;
- the unused AsyncStorage product-data package and migration test/code paths were removed;
- current-schema rejection tests, full unit tests, lint, typecheck, bundle checks, Android builds, and device smoke were run for this pass.

Known limits:

- no public upgrade path exists yet; the first public release must choose a migration or reset policy before external users receive the app;
- account recovery, device enrollment, sync, and broader notification automation remain planned.

Review evidence:

```text
Focused latest-only Jest  PASS - current JSON, encrypted-backup, and SQLite rejection coverage
Full Jest                PASS - 30 suites, 128 tests
npm run lint             PASS
npm run typecheck        PASS
npm run check-bundle     PASS
Android builds           PASS - debug and release APKs with Java 17
Emulator smoke           PASS - clean install opened MainActivity and current-schema data persisted after relaunch
Phone smoke              PASS - release APK installed and MainActivity resumed on 42adce68; touch input remains policy-blocked
```

Next pass: define the first public-release upgrade policy or continue with a bounded local product contract, with remote sync kept behind its service boundary.

## Implementation review: recurring-task reminder policy pass

Status: Completed on 2026-07-27.

Delivered:

- app schema 22 adds required `notificationSettings.recurringTaskRemindersEnabled`, defaulting fresh workspaces to `true`;
- Tasks exposes separate global and recurring-task reminder switches;
- one deterministic AppStore predicate controls startup, restore, recurrence expansion, reminder creation, snooze, task reopen, and rollback scheduling;
- turning recurring-task reminders off keeps logical reminder timestamps, clears only linked recurring-task native alarms, and leaves one-off task alarms active;
- current JSON, encrypted backup, and SQLite boundaries require schema 22 and the new setting; no schema 21 upgrade path was added;
- implementation, focused policy tests, full tests, lint, typecheck, bundle checks, Android builds, and device smoke were completed.

Known limits:

- no public upgrade path exists yet; the first public release must choose a migration or reset policy before external users receive the app;
- recurring notification summaries, iOS reminders, account recovery, device enrollment, sync, and broader automation remain planned.

Review evidence is recorded below after the final verification run.

Review evidence:

```text
Focused policy Jest      PASS - 6 suites, 49 tests
Full Jest                PASS - 30 suites, 131 tests
npm run lint             PASS
npm run typecheck        PASS
npm run check-bundle     PASS
Android builds           PASS - debug and release APKs with Java 17
Emulator smoke           PASS - clean release install launched MainActivity; Tasks showed the separate recurring-task switch and it remained Off after save/relaunch
Phone smoke              PASS - clean release install launched MainActivity on 42adce68; touch input remains policy-blocked
Resource cleanup         PASS - no Gradle/Java build processes or Yuzuha app processes remained after checks
```

## Implementation review: task-dependency pass

Status: Completed on 2026-07-27.

Scope:

- app schema 23 adds `taskDependencies` with a prerequisite task, dependent task, and `completed` condition;
- the Tasks screen can add and remove dependency links;
- self-links, duplicate links, missing task references, and cycles fail before save or restore;
- an incomplete prerequisite blocks completion while keeping the dependent task open;
- deleting a task removes its dependency edges in the same local save;
- JSON, encrypted backup, SQLite, full tests, Android smoke, and release notes were updated in this pass.

Review evidence:

```text
Failing tests first      PASS - missing dependency module and AppStore action reproduced before implementation
Focused dependency Jest  PASS - dependency, AppStore, SQLite, import/export, and backup coverage
Full Jest                PASS - 31 suites, 136 tests
npm run lint             PASS
npm run typecheck        PASS
npm run check-bundle     PASS
Android builds           PASS - debug and release APKs with Java 17, max 2 workers and no daemon
Emulator dependency     PASS - clean release install created tasks, saved a prerequisite link, and showed the dependent task as blocked
Phone smoke              PASS - clean release install and MainActivity resumed on 42adce68; touch input remains policy-blocked
Resource cleanup         PASS - no Gradle/Java build processes or Yuzuha app processes remained after checks
```

Known limits:

- only the `completed` dependency condition is supported; projects, richer dependency types, sync, and calendar behavior remain planned;
- no public upgrade path exists; schema 22 data is rejected until a release policy exists.

## Implementation review: device-local task-agenda pass

Status: Completed on 2026-07-27.

Delivered:

- added a derived Agenda mode to Tasks;
- grouped open and completed tasks with due dates for the next 14 device-local calendar days;
- kept undated tasks in List mode and preserved source task order within each date;
- added bounded local-window unit tests without changing app schema 23;
- updated the task UX, data model, architecture, requirements, decision log, release notes, and testing evidence.

Review evidence:

```text
Failing tests first      PASS - missing agenda module reproduced before implementation
Full Jest                PASS - 32 suites, 138 tests
npm run lint             PASS
npm run typecheck        PASS
npm run check-bundle     PASS
Android builds           PASS - debug and release APKs with Java 17, max 2 workers and no daemon
Emulator agenda smoke    PASS - clean release install opened Tasks, Agenda mode, and the local agenda UI
Phone smoke              PASS - clean release install and MainActivity resumed on 42adce68; touch input remains policy-blocked
Resource cleanup         PASS - no Gradle/Java build processes or Yuzuha app processes remained after checks
```

Known limits:

- no timezone or week-start preference, month navigation, calendar integration, or sync is included in this bounded pass.

## Implementation review: latest-only dead-code cleanup pass

Status: Completed on 2026-07-27.

Delivered:

- removed the commented-out legacy task screen from `MainApp`;
- confirmed that the active runtime already has no legacy product-data import or old-schema upgrade path;
- corrected stale current schema wording in the release notes and recorded the cleanup decision;
- made no app schema, repository schema, persistence, or user-visible behavior change.

Review evidence:

```text
Implementation review  PASS - only the current Tasks implementation remains in source
Full Jest              PASS - 32 suites, 138 tests
npm run lint           PASS
npm run typecheck      PASS
npm run check-bundle   PASS - Android metadata valid
Android builds         PASS - debug and release APKs with Java 17, max 2 workers and no daemon
Emulator smoke         PASS - rebuilt release APK opened MainActivity, Tasks, List, Agenda, and dated AgendaSmoke task
Phone smoke            PASS - rebuilt release APK opened MainActivity on 42adce68
Resource cleanup       PASS - no Gradle/Java build processes or Yuzuha app processes remained
```

Known limits:

- historical migration notes remain in the documentation for audit context; they are not supported runtime paths;
- a public upgrade policy remains intentionally deferred until an external release creates real user data.

## Implementation review: task-order pass

Status: Completed on 2026-07-27.

Delivered:

- app schema 24 adds required non-negative per-list `Task.sortOrder`; no schema 23 upgrade path was added;
- new, note-linked, moved-list, and recurring tasks receive deterministic per-list order values;
- List mode exposes Manual, Due date, and Priority sorting; the All view exposes Up and Down controls when Manual sorting is selected, swapping adjacent manual order values;
- Due date places undated tasks last, Priority uses High/Normal/Low, and all ties fall back to manual order without mutating source arrays;
- JSON restore, encrypted backup, SQLite persistence, current-record validation, UX, architecture, requirements, decision, release, and testing docs were updated.

Review evidence:

```text
Failing test first       PASS - missing sort functions and sortOrder were reproduced in taskLifecycle coverage
Focused Jest             PASS - 5 suites, 50 tests for lifecycle, store, JSON, backup, and SQLite order behavior
Full Jest                PASS - 32 suites, 141 tests
npm run lint              PASS
npm run typecheck         PASS
npm run check-bundle      PASS - Android metadata valid
Android builds           PASS - debug and release APKs with Java 17, max 2 workers and no daemon
Emulator smoke           PASS - clean release opened MainActivity, Tasks, Manual/Due date/Priority controls, and selected Priority
Phone smoke              PASS - clean release opened MainActivity on 42adce68
Resource cleanup          PASS - no Gradle/Java build processes or Yuzuha app processes remained
```

Known limits:

- Agenda keeps source order within a date and is not a calendar with timezone or week-start preferences;
- bulk reorder, cross-device order reconciliation, and sync remain planned.

## Implementation review: local task-project pass

Status: Completed on 2026-07-27.

Delivered:

- app schema 25 adds `projects` and the optional `Task.projectId`; no schema 24 upgrade path was added;
- project names are trimmed, limited to 80 characters, and unique case-insensitively; status and archive state use strict typed values;
- Tasks can create, rename, complete/reopen, archive/restore, and delete projects; deletion is rejected while any task references the project;
- the task form offers active projects for new links, existing archived links remain readable, and task rows show the project label or a deterministic deleted-project label;
- JSON import, encrypted backup, SQLite persistence, current-record validation, global search, UX, architecture, requirements, decision, release, and testing docs include the current project contract.

Review evidence:

```text
Failing test first       PASS - project lifecycle import was reproduced as a missing module before implementation
Focused Jest             PASS - 5 suites, 44 tests for project lifecycle, store, JSON, backup, SQLite, and search behavior
Full Jest                PASS - 33 suites, 145 tests
npm run lint             PASS
npm run typecheck        PASS
npm run check-bundle     PASS - Android metadata valid
Android builds          PASS - debug and release APKs with Java 17, max 2 workers and no daemon
Emulator smoke           PASS - clean release opened MainActivity, Tasks, project selector, and Projects card
Phone smoke              PASS - clean release opened MainActivity on 42adce68
Resource cleanup         PASS - no Yuzuha app, Java, or Gradle processes remained
```

Known limits:

- projects are local task grouping only; notes, money, app-time, focus, subtasks, templates, cross-device projects, and sync remain separate future contracts;
- project deletion is reference-safe and therefore requires linked tasks to be moved or deleted first.

## Implementation review: focus-session pass

Status: Completed on 2026-07-27.

Delivered:

- app schema 26 adds `appGroups` and `focusSessions`; no schema 25 upgrade path was added;
- app groups validate a trimmed unique package list and archive state;
- focus sessions validate optional task/project/note/app-group links, enforce one active session, derive elapsed seconds from timestamps, and record completed/manual/interrupted outcomes;
- App Time has a local manual timer with Complete/Stop controls, recent-session history, app-group controls, and an explicit no-app-blocking boundary;
- JSON import, encrypted backup, SQLite persistence, global search, UX, architecture, requirements, decision, release, and testing docs include the current focus contract.

Review evidence:

```text
Failing test first       PASS - missing app-group/focus lifecycle modules were reproduced before implementation
Focused Jest             PASS - boundary/store suites passed; final regression coverage includes 18 focus/store tests
Full Jest                PASS - 34 suites, 151 tests
npm run lint             PASS
npm run typecheck        PASS
npm run check-bundle     PASS - Android metadata valid
Android builds          PASS - debug and release APKs with Java 17, max 2 workers and no daemon
Emulator smoke           PASS - clean release opened App Time, started and completed a focus session, and stayed in MainActivity
Emulator relaunch        PASS - completed focus session remained visible after force-stop/relaunch
Phone smoke              PASS - clean release opened MainActivity on 42adce68
Resource cleanup         PASS - no Yuzuha app, Java, or Gradle processes remained
```

Known limits:

- focus timing is manual and local; there is no background timer, notification automation, app blocking, installed-app catalog, or sync;
- app-group links are package labels only and do not grant access to app content.

## Implementation review: local task-subtask pass

Status: Completed on 2026-07-27.

Delivered:

- app schema 27 adds one optional `Task.parentTaskId`; no schema 26 upgrade path was added;
- parent links require an existing task in the same list and reject missing parents, self-links, and cycles;
- the Tasks form offers same-list parent selection and task rows show parent and child-count labels;
- deleting a parent promotes direct children to top-level tasks in the same transaction; deeper descendants keep their existing links;
- JSON import, encrypted backup, SQLite persistence, current-record validation, global search, UX, architecture, requirements, decision, release, and testing docs include the current subtask contract.

Review evidence:

```text
Failing test first       PASS - subtask lifecycle import was reproduced as a missing module before implementation
Focused Jest             PASS - subtask, lifecycle, store, JSON, backup, and SQLite suites passed
Full Jest                PASS - 35 suites, 154 tests
npm run lint             PASS
npm run typecheck        PASS
npm run check-bundle     PASS - Android metadata valid
Android builds           PASS - debug and release APKs with Java 17, max 2 workers and no daemon
Emulator smoke           PASS - clean release opened MainActivity and the schema 27 Tasks form showed Parent task (optional)
Phone smoke              PASS - release APK opened MainActivity on 42adce68 with no fatal or ReactNativeJS error
Resource cleanup         PASS - both devices were force-stopped; no Gradle or Java process remained
```

Known limits:

- subtasks are local same-list links only; cross-list hierarchy, templates, recurring subtask trees, cross-device merges, and sync remain planned;
- there is no dedicated hierarchy view yet; the current Tasks list shows the parent label and direct-child count.

## Implementation review: local task-template pass

Status: Completed on 2026-07-27.

Delivered:

- app schema 28 adds `TaskTemplate`; no schema 27 upgrade path was added;
- templates store a unique name, task title/details, priority, list, optional project, archive state, and timestamps;
- Tasks can add, edit, archive/restore, delete, and use active templates;
- using a template creates an independent open task with no due date, parent, recurrence, reminder, or source-note link;
- project and task-list deletion checks template references;
- JSON import, encrypted backup, SQLite persistence, global search, UX, architecture, requirements, decision, release, and testing docs include the current template contract.

Review evidence:

```text
Failing test first       PASS - task-template lifecycle import was reproduced as a missing module before implementation
Focused Jest             PASS - 6 suites, 58 tests for template lifecycle, store, JSON, backup, SQLite, and search behavior
Full Jest                PASS - 36 suites, 159 tests
npm run lint             PASS
npm run typecheck        PASS
npm run check-bundle     PASS - Android metadata valid
Android builds           PASS - debug and release APKs with Java 17, max 2 workers and no daemon
Emulator smoke           PASS - clean release showed Task templates, Template name, Add template, Parent task (optional), and No parent
Phone smoke              PASS - clean release opened MainActivity with no fatal or ReactNativeJS error
Resource cleanup         PASS - both devices were force-stopped; no Gradle or Java process remained
```

Known limits:

- templates are local task-shaped inputs only; dynamic variables, due-date/reminder copying, recurrence ownership, cross-feature templates, version history, and sync remain planned;
- using a template creates the task immediately; there is no preview or undo action yet.

## Implementation review: Home quick-capture pass

Status: Completed on 2026-07-27.

Delivered:

- Home now has a local Quick capture action with Add money, Add note, and Add task targets;
- each target routes to the existing feature form and uses its existing validation and persistence path;
- no app schema, repository record, native adapter, or background process was added;
- UX, product plan, architecture, requirements, decision, release, and testing docs include the current quick-capture contract.

Review evidence:

```text
Failing test first       PASS - quick-capture target import was reproduced as a missing module before implementation
Focused Jest             PASS - quick-capture target and label coverage
Full Jest                PASS - 37 suites, 160 tests
npm run lint             PASS
npm run typecheck        PASS
npm run check-bundle     PASS - Android metadata valid
Android builds           PASS - debug and release APKs with Java 17, max 2 workers and no daemon
Emulator smoke           PASS - clean release showed Quick capture, Add money, Add note, and Add task
Phone smoke              PASS - clean release opened MainActivity with no fatal or ReactNativeJS error
Resource cleanup         PASS - both devices were force-stopped; no Gradle or Java process remained
```

Known limits:

- Quick capture is an in-app routing menu only; widgets, lock-screen capture, and global drafts remain planned. Android text share intents are covered by the later share-capture pass;
- the menu does not preserve a partially entered draft when the user changes targets.

## Implementation review: Android share-capture pass

Status: Completed on 2026-07-27.

Delivered:

- Android `ACTION_SEND` `text/plain` handling through the existing `singleTask` MainActivity;
- typed `YuzuhaShareCapture` native module with cold-start getter and warm-app event;
- native and shared 20,000-character limits, empty-payload rejection, consumed-extra clearing, and duplicate cold/warm suppression;
- an ephemeral `Shared capture` review screen with Save as note, Save as task, and Dismiss actions;
- note saves use the existing note lifecycle; task saves create an independent normal-priority Inbox task through the existing AppStore;
- no app schema, repository record, background worker, network fetch, or legacy compatibility path was added;
- integrations, requirements, architecture, UX, security, data model, full specification, release, testing, and decision docs record the current boundary.

Review evidence:

```text
Focused Jest             PASS - share normalization, subject-only fallback, title derivation, and empty/oversized rejection
Full Jest                PASS - 38 suites, 164 tests
npm run lint             PASS
npm run typecheck        PASS
npm run check-bundle     PASS - Android metadata valid
Android debug build     PASS - app:assembleDebug with Java 17, max 2 workers and no daemon
Android release build   PASS - app:assembleRelease with Java 17, max 2 workers and no daemon
Emulator smoke           PASS - cold share preview, note save, warm share preview, task save, and task relaunch persistence
Phone smoke              PASS - share preview and clean MainActivity launch on 42adce68; touch input remains policy-blocked
Resource cleanup         PASS - both devices were force-stopped; no Gradle or Java process remained
```

Known limits:

- only text shares are current; file/URI shares, widgets, dynamic shortcuts, iOS share handling, remote URL preview, persisted drafts, and sync remain planned;
- a share over 20,000 characters is rejected instead of truncated;
- sharing the same payload again is allowed after the current review is dismissed or saved.

## Implementation review: Android launcher-shortcut pass

Status: Completed on 2026-07-27.

Delivered:

- four static Android shortcuts: Add money, Add note, Add task, and App time;
- typed `YuzuhaLaunchActions` native module with a cold-start getter and warm-app event;
- explicit rejection of unknown action strings and direct routing to existing `MainApp` tabs;
- transient share previews close when a launcher action arrives;
- no app schema, repository record, shortcut persistence, permission, network request, or background process was added;
- integrations, requirements, architecture, UX, security, full specification, release, testing, and decision docs record the current boundary.

Review evidence:

```text
Focused Jest             PASS - supported action mapping and unknown-action rejection
Full Jest                PASS - 39 suites, 166 tests
npm run lint             PASS
npm run typecheck        PASS
npm run check-bundle     PASS - Android metadata valid
Android debug build     PASS - app:assembleDebug with Java 17, max 2 workers and no daemon
Android release build   PASS - app:assembleRelease with Java 17, max 2 workers and no daemon
Emulator smoke           PASS - cold and warm Money, Notes, Tasks, and App Time action routing; four static shortcut IDs present
Phone smoke              PASS - cold and warm launcher actions were accepted and delivered to MainActivity with no filtered app errors; UI text was verified on the emulator because phone UI automation returned no root
Resource cleanup         PASS - both devices were force-stopped; no Gradle or Java process remained
```

Known limits:

- shortcuts open existing blank screens; they do not prefill a record or offer a dynamic user-specific action;
- widgets, dynamic shortcuts, iOS shortcuts, and shortcut actions that carry record content remain planned.

## Implementation review: Android file-share pass

Status: Completed on 2026-07-27.

Delivered:

- Android `ACTION_SEND` `EXTRA_STREAM` support for image/jpeg, image/png, image/gif, image/webp, application/pdf, and text/plain;
- native URI metadata validation for display name, MIME type, known size, and the existing 10 MiB attachment limit;
- consumed stream-extra clearing and the existing cold-start/warm-app share bridge;
- shared file metadata in the existing review screen, with Save as note and Dismiss only;
- direct-source attachment copying through `keepLocalCopy`, private storage, final size verification, and SHA-256 verification;
- one AppStore commit for the new note and attachment, with explicit cleanup if the workspace save fails;
- text share behavior retained, including Save as task; no app schema, share-specific record, network fetch, or background worker was added;
- data model, integrations, requirements, architecture, UX, security, full specification, release, testing, and decision docs record the current boundary.

Review evidence:

```text
Focused Jest             PASS - share normalization, file limits, direct-source copy, AppStore note/attachment save, and cleanup boundary
Full Jest                PASS - 39 suites, 170 tests
npm run lint             PASS
npm run typecheck        PASS
npm run check-bundle     PASS - Android metadata valid
Android debug build     PASS - app:assembleDebug with Java 17, max 2 workers and no daemon
Android release build   PASS - app:assembleRelease with Java 17, max 2 workers and no daemon
Emulator smoke           PASS - content URI preview, metadata, note save, attachment persistence after relaunch, and text-share regression
Phone smoke              PASS - release text share launched MainActivity with no filtered app errors; phone UI automation returned no root
Resource cleanup         PASS - both devices were force-stopped; no Gradle or Java process remained
```

Known limits:

- file-only shares save as notes; tasks do not yet have attachment links;
- only the six existing attachment MIME types are accepted, and a provider must grant URI read access;
- unsupported files, remote URL previews, widgets, dynamic shortcuts, iOS share handling, and sync remain planned.

## Implementation review: Android summary-widget pass

Status: Completed on 2026-07-27.

Delivered:

- typed `WidgetSummary` projection for open tasks and non-archived notes;
- Android `AppWidgetProvider` with a fixed 3x2 layout, pluralized count text, and a tap action to `MainActivity`;
- native bridge that stores only two counts in app-private preferences and refreshes placed widgets;
- `updatePeriodMillis=0`, no worker, no schema change, and no raw record content in widget resources or metadata;
- AppStore update after initial workspace load and every committed workspace change;
- architecture, data-model, integrations, requirements, UX, security, full specification, release, testing, and decision docs record the current boundary.

Review evidence:

```text
Focused Jest             PASS - widget projection and singular/plural summary contract
Full Jest                PASS - 40 suites, 172 tests
npm run lint             PASS
npm run typecheck        PASS
npm run check-bundle     PASS - Android metadata valid
Android debug build     PASS - app:assembleDebug with Java 17, max 2 workers and no daemon
Android release build   PASS - app:assembleRelease with Java 17, max 2 workers and no daemon
Emulator smoke           PASS - widget placement, empty summary, tap navigation, and live update after task save
Phone smoke              PASS - widget provider registration, clean MainActivity launch, and no filtered app errors; UI placement unavailable by device policy
Resource cleanup         PASS - both devices were force-stopped; no Gradle or Java process remained
```

Known limits:

- the first widget is a fixed count summary; user-selected cards, quick actions, dynamic widgets, lock-screen policy controls, iOS widgets, and sync remain planned;
- the widget projection is optional and non-authoritative; SQLite remains the only product-data source;
- the widget does not show note bodies, task text, money values, or app-time rows.

## Implementation review: Android deep-link pass

Status: Completed on 2026-07-27.

Delivered:

- strict shared deep-link mapping for `yuzuha://open/money`, `/notes`, `/tasks`, and `/app-time`;
- native `DeepLinkModule` with a cold-start getter, warm-app event, exact URI validation, and consumed-intent clearing;
- Android `ACTION_VIEW`/`BROWSABLE` manifest filter for the `yuzuha://open` authority;
- `MainApp` routing from validated deep-link targets to the existing Money, Notes, Tasks, and App Time tabs;
- rejection of query strings, fragments, IDs, extra paths, unknown routes, remote URLs, and non-string values;
- no app schema, repository record, permission, network request, or background process;
- architecture, integrations, requirements, UX, security, data-model, full specification, release, testing, and decision docs record the current boundary.

Review evidence:

```text
Focused Jest             PASS - all four routes and malformed/query/remote/extra-path rejection
Full Jest                PASS - 41 suites, 174 tests
npm run lint             PASS
npm run typecheck        PASS
npm run check-bundle     PASS - Android metadata valid
Android debug build     PASS - app:assembleDebug with Java 17, max 2 workers and no daemon
Android release build   PASS - app:assembleRelease with Java 17, max 2 workers and no daemon
Emulator smoke           PASS - cold Tasks, warm Notes, invalid query ignored, and no filtered app errors
Phone smoke              PASS - cold/warm delivery, manifest registration, and no filtered app errors; UI text unavailable by device policy
Resource cleanup         PASS - both devices were force-stopped; no Yuzuha Node, Gradle, or Java process remained
```

Known limits:

- routes open existing tabs only; record-specific IDs and actions are intentionally not accepted;
- custom-scheme links are local to this Android slice; verified remote App Links and iOS deep links remain planned;
- malformed links are ignored with no visible record or network side effect.

## Implementation review: Android task-calendar draft pass

Status: Completed on 2026-07-27.

Delivered:

- strict shared validation for task title, details, and local `YYYY-MM-DD` due date;
- typed JavaScript platform adapter and Android `CalendarDraftModule` using the system `ACTION_INSERT` calendar editor;
- all-day local date projection with no `READ_CALENDAR` or `WRITE_CALENDAR` permission, calendar read, event ID, schema field, or worker;
- a `Calendar` action on task rows with an honest error for undated or invalid tasks;
- a cold-start routing fix so `LaunchActionsModule` clears only recognized launcher actions and leaves unknown intents for the deep-link adapter;
- current architecture, integrations, requirements, UX, security, data-model, full specification, release, testing, traceability, and decision docs updated.

Review evidence:

```text
Focused Jest             PASS - calendar draft validation
Full Jest                PASS - 42 suites, 176 tests
npm run lint             PASS
npm run typecheck        PASS
npm run check-bundle     PASS - Android metadata valid
Android debug build     PASS - app:assembleDebug with Java 17, max 2 workers and no daemon
Android release build   PASS - app:assembleRelease with Java 17, max 2 workers and no daemon
Emulator smoke           PASS - dated task Calendar action opened the system Google Calendar editor path; no filtered app errors
Deep-link regression     PASS - cold yuzuha://open/tasks opened Tasks after the intent-preservation fix
Phone smoke              PASS - release MainActivity cold launch with no filtered app errors; UI root unavailable by device policy
```

Known limits:

- the user must confirm the event in the external calendar editor; Yuzuha does not know whether it was saved;
- only dated tasks can be drafted, and the draft is all-day in the device's current timezone;
- calendar reads, event reconciliation, selected calendar/timezone settings, focus-session export, iOS parity, and sync remain planned.

## Implementation review: Android money CSV import pass

Status: Completed on 2026-07-27.

Delivered:

- strict current Yuzuha money CSV parser with quoted-field support, current export/app schema checks, bounded 5 MB/5,000-row limits, and row-level errors;
- reference validation against the current workspace, account-currency checks, duplicate ID rejection, split-linked row rejection, and currency-separated preview totals;
- Android document-picker adapter that copies the selected file into cache, reads it once, removes the cache copy, and maps cancellation/errors to typed messages;
- Data tools preview and confirmation flow that appends validated entries through one AppStore commit without adding an import record, schema field, network request, or worker;
- updated product, architecture, data, UX, security, integration, requirements, testing, release, traceability, and decision documentation.

Review evidence:

```text
Focused Jest             PASS - parser, picker, AppStore append, duplicate/reference/split/error cases
Full Jest                PASS - 44 suites, 182 tests
npm run lint             PASS
npm run typecheck        PASS
npm run check-bundle     PASS - Android metadata valid
Android debug build     PASS - app:assembleDebug with Java 17, max 2 workers and no daemon
Android release build   PASS - app:assembleRelease with Java 17, max 2 workers and no daemon
Emulator smoke           PASS - picker, preview, confirmed append, money row after relaunch, and no filtered app errors
Phone smoke              PASS - release MainActivity cold launch with no filtered app errors; UI root unavailable by device policy
Resource cleanup         PASS - temporary CSV removed and both devices force-stopped
```

Known limits:

- the input must be a current Yuzuha money CSV; arbitrary bank CSV mapping is not implemented;
- split-linked money rows require JSON export or encrypted backup because CSV has no split-line payload;
- import history, undo, multi-file import, sync restore, and legacy CSV versions remain planned.

## Implementation review: Android JSON file restore pass

Status: Completed on 2026-07-27.

Delivered:

- a strict current JSON export file adapter with a bounded 5 MB file size, current MIME checks, system picker cancellation mapping, cache-copy cleanup, and one read before validation;
- Data tools support for choosing a JSON export file alongside paste, with the existing current-schema parser, record-count preview, and destructive restore confirmation reused without a new data model;
- invalid, old, incomplete, unsupported, or oversized files leave the current workspace unchanged, and no network request, import record, migration, or background work is added;
- updated product, architecture, data, UX, security, integration, requirements, testing, release, traceability, and decision documentation.

Review evidence:

```text
Focused Jest             PASS - JSON file adapter, current JSON validation, picker cancellation, and cache cleanup
Full Jest                PASS - 45 suites, 186 tests
npm run lint             PASS
npm run typecheck        PASS
npm run check-bundle     PASS - Android metadata valid
Android debug build     PASS - app:assembleDebug with Java 17, max 2 workers and no daemon
Android release build   PASS - app:assembleRelease with Java 17, max 2 workers and no daemon
Emulator smoke           PASS - picker, current-schema preview, destructive confirm, restore, and restored note after relaunch
Phone smoke              PASS - release MainActivity cold launch with no filtered app errors; UI root unavailable by device policy
Resource cleanup         PASS - temporary JSON fixture removed and both devices force-stopped
```

Known limits:

- the input must be a current Yuzuha JSON export; encrypted backups use their separate password/recovery-key path;
- plain JSON exports remain metadata-only for attachments, so complete attachment portability still requires an encrypted backup;
- arbitrary JSON mapping, merge restore, sync restore, and legacy JSON versions remain planned.

## Implementation review: Android encrypted backup file bound pass

Status: Completed on 2026-07-27.

Delivered:

- a deterministic 96 MiB bound at the encrypted-backup document-picker boundary, checked from picker metadata before cache copy when available and from cached-file stat before `readFile`;
- cleanup of oversized cached files through the existing `finally` path, with valid file opening unchanged after the bound check;
- focused adapter coverage for valid files, cancellation, picker metadata rejection, cached-file rejection, no-read behavior, and cleanup;
- updated architecture, integrations, security, sync/backup, UX, testing, release, traceability, and decision documentation.

Review evidence:

```text
Focused Jest             PASS - encrypted backup core and file adapter bound/cleanup cases
Full Jest                PASS - 45 suites, 188 tests
npm run lint             PASS
npm run typecheck        PASS
npm run check-bundle     PASS - Android metadata valid
Android debug build     PASS - app:assembleDebug with Java 17, max 2 workers and no daemon
Android release build   PASS - app:assembleRelease with Java 17, max 2 workers and no daemon
Emulator smoke           PASS - valid encrypted backup picker, pre-read stat, scrypt/decryption, and validated preview
Phone smoke              PASS - release MainActivity cold launch with no filtered app errors; UI root unavailable by device policy
Resource cleanup         PASS - temporary encrypted backup fixture removed and both devices force-stopped
```

Known limits:

- the 96 MiB bound protects the file-open boundary; encrypted backup schema 2 and its 64 MiB plaintext limit remain the data contract;
- pasted encrypted text uses the existing decryption path and does not add a second file-picker record;
- account recovery, device enrollment, sync, and legacy encrypted backup schemas remain planned or intentionally rejected.

## Implementation review: Android App-Time-period pass

Status: Completed on 2026-07-27.

Delivered:

- Today, This week, and This month controls with an exact local date-range label;
- one sequential native Usage Access query per local calendar day in the selected range;
- period aggregation that keeps each result on its queried local date;
- one AppStore replacement after all day queries succeed, so a failed refresh does not partially replace the period;
- no schema change, timer, worker, polling loop, or legacy compatibility path.

Review evidence:

```text
Focused Jest             PASS - usage/period tests; 11 focused tests, including the DST local-midnight regression
Full Jest                PASS - 45 suites, 191 tests
npm run lint             PASS
npm run typecheck        PASS
npm run check-bundle     PASS - Android metadata valid
Android debug build     PASS - app:assembleDebug with Java 17, max 2 workers and no daemon
Android release build   PASS - app:assembleRelease with Java 17, max 2 workers and no daemon
Emulator smoke           PASS - Day/Week/Month selection and Week refresh with Usage Access
Phone smoke              PASS - App Time launch shows unavailable permission state with no filtered app errors
Resource cleanup         PASS - both devices force-stopped; no background app worker added
```

Known limits:

- the selected period is not persisted as a UI preference and uses the device local calendar;
- a Month refresh is bounded but may issue up to 31 sequential native day queries;
- selected timezone and week-start preferences, sync, and iOS app-time parity remain planned.

## Implementation review: Android verified-remote-bundle pass

Status: Implemented on 2026-07-27; live remote activation remains endpoint-release verification work.

Delivered:

- native `YuzuhaBundleInstaller` started before React host creation;
- strict current Android/runtime/native-version metadata validation and canonical Ed25519 signature verification;
- one bounded HTTPS metadata request, 64 MiB bundle cap, 5-second download read bound, exact-size check, streaming SHA-256, immutable versioned private bundle files, and atomic activation state;
- `DefaultReactHost(jsBundleFilePath = ...)` selection for verified private bundles, with embedded baseline/offline/invalid-remote paths;
- `YuzuhaInstaller` JavaScript bridge that only reads native status;
- Android minimum API 33 decision and latest-only documentation across installer, architecture, requirements, security, testing, release, traceability, and decision log.

Review evidence:

```text
Focused Jest             PASS - 7 installer/metadata tests
Full Jest                PASS - 45 suites, 194 tests
npm run lint             PASS
npm run typecheck        PASS
npm run check-bundle     PASS - Android metadata valid
Native Kotlin compile   PASS - :app:compileDebugKotlin
Android release build   PASS - :app:assembleRelease with Java 17 and 2 workers
Emulator smoke           PASS - release startup rendered Bundle 0.1.0 and Home; no filtered app errors
Phone smoke              PASS - release startup with no filtered app errors; UI root unavailable by policy
Resource cleanup         PASS - both devices force-stopped; Gradle/Kotlin processes stopped
```

Known limits:

- the live `updates.yuzuha.dev` endpoint has no signed release fixture in this workspace, so device smoke proves the offline embedded path, not remote activation;
- the native implementation intentionally has no retry loop, polling worker, or background update service;
- Android API 32 and older are no longer supported; future public releases need release-pipeline key custody and endpoint integration tests.

## Implementation review: Android Home-period pass

Status: Completed on 2026-07-27.

Delivered:

- one shared local Day/Week/Month selector on Home;
- exact selected-range label above the dashboard cards;
- main-currency and selected-range money totals;
- selected-range included app-time totals, open-task due counts, and recent active-note updates;
- shared period labels/range formatting and a period unit test;
- no AppData schema, preference record, native usage refresh, timer, worker, or legacy path.

Review evidence:

```text
Focused Jest             PASS - period helpers; 7 tests
Full Jest                PASS - 45 suites, 195 tests
npm run lint             PASS
npm run typecheck        PASS
npm run check-bundle     PASS - Android metadata valid
Android release build   PASS - :app:assembleRelease with Java 17 and 2 workers
Emulator smoke           PASS - Home Day/Week/Month selector, range, and card-label changes
Phone smoke              PASS - release startup with no filtered app errors
Resource cleanup         PASS - both devices force-stopped and no Gradle/Kotlin process remained
```

Known limits:

- Home period selection is view state and resets on relaunch;
- money in other currencies remains in Money reports and is intentionally excluded from the main-currency Home total;
- the selected range does not trigger an App Time native refresh; the user refreshes App Time explicitly.

## Implementation review: Android period-review pass

Status: Completed on 2026-07-27.

Delivered:

- Home `Review this period` entry point;
- read-only Today/This week/This month Review screen;
- `buildReviewSummary` with main-currency money, included app time, due/open tasks, completed tasks, overdue tasks, active note updates, and Usage Access freshness;
- source links back to Money, App Time, Tasks, and Notes;
- local-date regression coverage and no review record, reflection field, preference, schema, native refresh, timer, worker, or legacy path.

Review evidence:

```text
Focused Jest             PASS - review/period tests; 9 focused tests
Full Jest                PASS - 46 suites, 197 tests
npm run lint             PASS
npm run typecheck        PASS
npm run check-bundle     PASS - Android metadata valid
Android release build   PASS - :app:assembleRelease with Java 17 and 2 workers
Emulator smoke           PASS - Home Review Today/Week/Month ranges and source cards
Phone smoke              PASS - release startup with no filtered app errors
Resource cleanup         PASS - both devices force-stopped and no Gradle/Kotlin process remained
```

Known limits:

- Review is derived and cannot be reopened as historical state;
- reflection text, saved baselines, comparison trends, and review history are not implemented;
- changing Review periods does not refresh App Time; the source screen owns explicit refresh.

## Implementation review: Android Money-filter pass

Status: Completed on 2026-07-27.

Delivered:

- a typed derived filter for the Money entry list;
- All/Day/Week/Month period choices;
- expense/income, category, and account choices;
- matching-entry count and explicit no-match state;
- archived selected categories or accounts remain selectable;
- no schema, migration, report change, network request, background process, or legacy path.

Review evidence:

```text
Focused Jest             PASS - money-filter tests; 2 focused tests
Full Jest                PASS - 47 suites, 199 tests
npm run lint             PASS
npm run typecheck        PASS
npm run check-bundle     PASS - Android metadata valid
Android release build   PASS - :app:assembleRelease with Java 17 and 2 workers
Emulator smoke           PASS - Money filter controls rendered and selector state changed
Phone smoke              PASS - release startup with no filtered app errors
Resource cleanup         PASS - both devices force-stopped and no Gradle/Kotlin process remained
```

Known limits:

- filter state resets on relaunch;
- filters apply to the Money history list only and do not change reports;
- the list keeps the existing rule that split parents and split lines are not shown as ordinary entries.

## Implementation review: Android Money-filtered-totals pass

Status: Completed on 2026-07-27.

Delivered:

- a shared typed filter result used by the Money history list and filtered totals;
- currency-separated count, spending, income, and net totals using integer minor units;
- explicit empty totals state;
- no schema, migration, separate-report change, network request, background process, or legacy path.

Review evidence:

```text
Focused Jest             PASS - money-filter tests; 3 focused tests
Full Jest                PASS - 47 suites, 200 tests
npm run lint             PASS
npm run typecheck        PASS
npm run check-bundle     PASS - Android metadata valid
Android release build   PASS - :app:assembleRelease with Java 17 and 2 workers
Emulator smoke           PASS - Filtered totals rendered, Month selected, and empty state shown
Phone smoke              PASS - release startup with no filtered app errors
Resource cleanup         PASS - both devices force-stopped and no Gradle/Kotlin process remained
```

Known limits:

- filter state resets on relaunch;
- totals follow the existing non-split history list and do not alter the separate report screen;
- split-line category totals remain available through the existing Money report boundary.

## Implementation review: Android Money-payee pass

Status: Completed on 2026-07-27.

Delivered:

- local payee records with trimmed case-insensitively unique names;
- optional stable `payeeId` references on money entries;
- entry-form selection, payee creation, archive controls, and list/search display;
- current JSON/CSV/encrypted-backup/SQLite persistence with app schema 29 and repository schema 3;
- no compatibility migration, network request, worker, or background process.

Review evidence:

```text
Focused Jest             PASS - payee lifecycle tests; 2 focused tests
Full Jest                PASS - 48 suites, 203 tests
npm run lint             PASS
npm run typecheck        PASS
npm run check-bundle     PASS - Android metadata valid
Android release build   PASS - :app:assembleRelease with Java 17 and 2 workers
Emulator smoke           PASS - Money Payee selector and New payee controls rendered
Phone smoke              PASS - release startup with no filtered app errors
Resource cleanup         PASS - both devices force-stopped and no Gradle/Kotlin process remained
```

Known limits:

- payees are local records and are not synced or linked to provider transactions;
- recurring money rules and split-entry creation currently use no payee and leave generated/parent `payeeId` null;
- payee state is not a separate filter; it is shown in the entry form, history row, and global search.

## Implementation review: Android Money-report-filter pass

Status: Completed on 2026-07-27.

Delivered:

- one typed report filter for local period, income/expense kind, category ID, and account ID;
- split-line category matching without counting the split parent twice;
- explicit report scope text for range, filters, exclusions, and separate currencies;
- no schema, migration, network request, worker, or background process.

Review evidence:

```text
Focused Jest             PASS - report filter and split-line tests; 4 focused tests
Full Jest                PASS - 48 suites, 204 tests
npm run lint             PASS
npm run typecheck        PASS
npm run check-bundle     PASS - Android metadata valid
Android release build   PASS - :app:assembleRelease with Java 17 and 2 workers
Emulator smoke           PASS - report scope, filters, filtered scope, and empty state rendered
Phone smoke              PASS - release startup with no filtered app errors
Resource cleanup         PASS - both devices force-stopped after smoke
```

Known limits:

- report filters are screen state and reset when the report screen is left;
- payee filtering, saved report views, cross-screen filter state, and sync remain future work.

## Implementation review: Android week-start pass

Status: Completed on 2026-07-27.

Delivered:

- persisted Sunday/Monday `AppData.weekStartsOn` setting with current app schema 30;
- shared local-period support across Home, Review, Money filters/reports, App Time, and budget projections;
- current JSON, encrypted-backup, and SQLite persistence with strict missing/invalid setting rejection;
- no legacy migration, network request, worker, or background process.

Review evidence:

```text
Focused Jest             PASS - period, Money-filter, restore, store, and CSV tests
Full Jest                PASS - 48 suites, 208 tests
npm run lint             PASS
npm run typecheck        PASS
npm run check-bundle     PASS - Android metadata valid
Android release build   PASS - :app:assembleRelease with Java 17 and 2 workers
Emulator smoke           PASS - Home Sunday/Monday controls and weekly range rendered
Phone smoke              PASS - release startup with no filtered app errors
Resource cleanup         PASS - both devices force-stopped after smoke
```

Known limits:

- the setting supports Sunday and Monday only;
- the task Agenda remains device-local and a user-selected timezone remains future work.

## Implementation review: Android money CSV latest-import undo pass

Status: Completed on 2026-07-27.

Delivered:

- a typed latest-import receipt with source name, import time, and imported entry IDs/timestamps;
- deterministic undo that removes only the latest unchanged import and blocks when an imported entry is missing or edited;
- receipt persistence through AppStore, current JSON export/restore, encrypted backup, and SQLite metadata;
- Data tools status and destructive confirmation UI;
- app schema 31 with no legacy migration, network request, worker, or background process.

Review evidence:

```text
Focused Jest             PASS - receipt, AppStore, SQLite, import, export, and restore tests
Full Jest                PASS - 49 suites, 214 tests
npm run lint             PASS
npm run typecheck        PASS
npm run check-bundle     PASS - Android metadata valid
Android release build   PASS - :app:assembleRelease with Java 17 and 2 workers
Emulator smoke           PASS - Data tools showed the latest-import undo state
Phone smoke              PASS - release startup with no filtered app errors
Resource cleanup         PASS - both devices force-stopped and no Gradle/Kotlin process remained
```

Known limits:

- only the latest import is undoable; there is no multi-import history;
- undo does not restore an entry that was deleted or edited after import;
- arbitrary bank CSV mapping and split-row import remain future work.

## Implementation review: Android local note-link pass

Status: Completed on 2026-07-27.

Delivered:

- stable local links from notes to tasks, projects, money entries, and focus sessions;
- duplicate-link rejection and current-target validation on creation;
- readable `Deleted ...` labels when a linked target is later removed;
- note-owned link deletion when a note is deleted;
- AppStore, SQLite, JSON restore, and encrypted-backup persistence under app schema 32;
- no import/export UI expansion, network request, worker, or background process.

Review evidence:

```text
Focused Jest             PASS - note-link, AppStore, SQLite, restore, export, and backup tests
Full Jest                PASS - 50 suites, 218 tests
npm run typecheck        PASS
npm run lint             PASS
Bundle validation        PASS - Android metadata valid
Android release build   PASS - :app:assembleRelease with Java 17 and 2 workers
Emulator smoke           PASS - Notes link editor showed Task/Project/Money/Focus targets and saved `Task: LinkTask`
Phone smoke              PASS - release startup with no filtered app errors
Resource cleanup         PASS - both devices force-stopped and no Yuzuha/Gradle/Java process remained
```

Known limits:

- links are local and are not persisted or synced as a separate search index; current linked target fields are included in the local owning-note search projection;
- a deleted target cannot be restored through the link editor;
- link state is stored locally; remote sync and cross-device search remain future work.

## Implementation review: Android linked-target-search pass

Status: Completed on 2026-07-28.

Delivered:

- Global Search matches an active note through searchable fields from its linked task, project, money entry, or focus session;
- note results explain the relationship with readable `Linked ...` labels;
- archived project target fields are excluded unless archived results are enabled;
- missing target content is not searchable, while a deleted-target label remains visible when the note matches another field;
- the projection stays in memory over loaded AppData, with no schema change, persistent index, import/export UI change, network request, worker, or background process.

Review evidence:

```text
Focused Jest             PASS - global-search link, archive, and deleted-target tests
Full Jest                PASS - 50 suites, 220 tests
npm run typecheck        PASS
npm run lint             PASS
Bundle validation        PASS - Android metadata valid
Android release build   PASS - :app:assembleRelease with Java 17 and 2 workers
Emulator smoke           PASS - search for `LinkTask` showed the task and `LinkNote` with `Linked task: LinkTask`
Phone smoke              PASS - cold release startup with no filtered app errors
Resource cleanup         PASS - both devices force-stopped and no Yuzuha/Gradle/Java/Node process remained
```

Known limits:

- search is local to loaded AppData and has no persistent or synced index;
- archived target rules are currently explicit for archived projects; broader cross-device search and sync remain planned;
- arbitrary bank CSV mapping and expanded import/export history remain future work and were not changed in this pass.

Next pass: choose the next bounded local product contract after review; keep attachment search, account/device recovery, and remote sync behind their own decisions.

## Implementation review: Android rich-note pass

Status: Completed on 2026-07-28.

Delivered:

- Notes editor toolbar actions for bold, italic, code, bullets, and headings;
- deterministic selection formatting with heading toggling and multi-line bullet support;
- bounded local rendering for known Markdown-like markers in note cards;
- plain-text fallback for existing, unsupported, or incomplete body text;
- no note schema field, migration, rich-text dependency, import/export UI change, network request, worker, or background process.

Review evidence:

```text
Focused Jest             PASS - five note-markup parser/edit tests
Full Jest                PASS - 51 suites, 225 tests
npm run typecheck        PASS
npm run lint             PASS
Bundle validation        PASS - Android metadata valid
Android release build   PASS - :app:assembleRelease with Java 17 and 2 workers
Emulator smoke           PASS - toolbar created `# Smoke`; saved card displayed `Smoke` without raw markers
Phone smoke              PASS - cold release startup with no filtered app errors
Resource cleanup         PASS - both devices force-stopped and no Yuzuha/Gradle/Java/Node process remained
```

Known limits:

- only the bounded marker subset is rendered; links, tables, images, nested markup, and collaborative revisions remain planned;
- the body remains source text, so there is no persistent rich-text AST or selection state;
- import/export behavior was not expanded in this pass.

Next pass: choose the next bounded local product contract after review; keep attachments, account/device recovery, and remote sync behind their own decisions.

## Implementation review: Android search-navigation pass

Status: Completed on 2026-07-28.

Delivered:

- every supported Global Search result is a tappable local row;
- deterministic result-kind mapping routes to Money, Notes, Tasks, or App Time;
- tapping a result closes Search and changes only the selected tab;
- no exact-record editing promise, data mutation, schema change, import/export UI change, network request, worker, or background process.

Review evidence:

```text
Focused Jest             PASS - all supported result kinds map to an owning tab
Full Jest                PASS - 51 suites, 226 tests
npm run typecheck        PASS
npm run lint             PASS
Bundle validation        PASS - Android metadata valid
Android release build   PASS - :app:assembleRelease with Java 17 and 2 workers
Emulator smoke           PASS - `Open Note LinkNote` and `Open Task LinkTask` appeared; tapping the note opened Notes
Phone smoke              PASS - cold release startup with live MainActivity and no fatal errors
Resource cleanup         PASS - both devices force-stopped and no Yuzuha/Gradle/Java/Node process remained
```

Known limits:

- Search opens a feature tab, not an exact record or an edit form;
- cross-screen filters, ID-bearing deep links, synced navigation, and remote search remain planned;
- import/export behavior was not expanded in this pass.

Next pass: choose the next bounded local product contract after review; keep exact-record navigation, account/device recovery, and remote sync behind their own decisions.

## Implementation review: Android task-search-focus pass

Status: Completed on 2026-07-28.

Delivered:

- task search results carry their stable task ID through `globalSearchNavigation`;
- Search closes and the existing `pendingTaskId` path opens Tasks in edit mode for that task;
- other result kinds keep the prior owning-tab-only behavior;
- no exact focus promise for notes, money, projects, app groups, focus sessions, or time goals;
- no schema, import/export UI, network request, worker, or background process.

Review evidence:

```text
Focused Jest             PASS - task focus ID and tab-only result mapping tests
Full Jest                PASS - 51 suites, 227 tests
npm run typecheck        PASS
npm run lint             PASS
Bundle validation        PASS - Android metadata valid
Android release build   PASS - :app:assembleRelease with Java 17 and 2 workers
Emulator smoke           PASS - tapping `Open Task LinkTask` opened `Edit task` with title `LinkTask`
Phone smoke              PASS - cold release startup with installer and React Native logs, no fatal errors
Resource cleanup         PASS - both devices force-stopped and no Yuzuha/Gradle/Java/Node process remained
```

Known limits:

- exact focus remains to be added separately for notes, money, projects, app groups, focus sessions, and time goals;
- search does not transfer filters or create ID-bearing deep links;
- import/export behavior was not expanded in this pass.

Next pass: choose the next bounded exact-record navigation contract after review; keep account/device recovery and remote sync behind their own decisions.

## Implementation review: Android budget-search-focus pass

Status: Completed on 2026-07-28.

Delivered:

- budget records now have a validated local update action and editor;
- budget search results carry their stable budget ID through `globalSearchNavigation`;
- Search closes and the existing `pendingBudgetId` path opens Money in the budget editor for that budget;
- the update helper preserves the stable budget ID and archive state while replacing only editable fields;
- no schema, import/export UI, network request, worker, or background process.

Review evidence:

```text
Focused Jest             PASS - budget update identity/archive test and budget focus mapping test
Full Jest                PASS - 51 suites, 229 tests
npm run typecheck        PASS
npm run lint             PASS
Bundle validation        PASS - Android metadata valid
Android release build   PASS - :app:assembleRelease with Java 17 and 2 workers
Emulator smoke           PASS - temporary EUR 12.34 Food budget searched and opened with `Edit budget`, `Budget limit` `12.34`, and `Update budget`
Delete cleanup smoke     PASS - temporary budget deleted and `No budgets yet.` returned
Phone smoke              PASS - cold release startup with resumed `dev.yuzuha/.MainActivity`; automated touch input is rejected by device policy
Resource cleanup         PASS - both devices force-stopped and no Yuzuha/Gradle/Java/Node process remained
```

Known limits:

- exact focus remains to be added separately for accounts, categories, transfers, splits, recurring rules, focus sessions, and time goals;
- search does not transfer filters or create ID-bearing deep links;
- import/export behavior was not expanded in this pass.

Next pass: choose the next bounded exact-record navigation contract after review; keep account/device recovery and remote sync behind their own decisions.

## Implementation review: Android template-search-focus pass

Status: Completed on 2026-07-28.

Delivered:

- task-template search results carry their stable template ID through `globalSearchNavigation`;
- Search closes and the existing `pendingTemplateId` path opens Tasks in the template edit form for that template;
- money, note, task, and project results keep exact focus, while other result kinds keep the prior owning-tab-only behavior;
- no schema, import/export UI, network request, worker, or background process.

Review evidence:

```text
Focused Jest             PASS - money, task, note, project, and template focus ID mapping tests
Full Jest                PASS - 51 suites, 227 tests
npm run typecheck        PASS
npm run lint             PASS
Bundle validation        PASS - Android metadata valid
Android release build   PASS - :app:assembleRelease with Java 17 and 2 workers
Emulator smoke           PASS - temporary `SearchTemplate` searched and opened with `Edit task template`, name `SearchTemplate`, title `TemplateTask`, and `Update template`
Phone smoke              PASS - cold release startup with resumed `dev.yuzuha/.MainActivity`; automated touch input is rejected by device policy
Resource cleanup         PASS - temporary template deleted, both devices force-stopped, and no Yuzuha/Gradle/Java/Node process remained
```

Known limits:

- exact focus remains to be added separately for accounts, categories, transfers, splits, budgets, recurring rules, task lists, app groups, focus sessions, and time goals;
- search does not transfer filters or create ID-bearing deep links;
- import/export behavior was not expanded in this pass.

Next pass: choose the next bounded exact-record navigation contract after review; keep account/device recovery and remote sync behind their own decisions.

## Implementation review: Android task-list-search-focus pass

Status: Completed on 2026-07-28.

Delivered:

- task-list search results carry their stable list ID through `globalSearchNavigation`;
- Search closes and the existing `pendingListId` path opens Tasks in the list rename form for that list;
- money, note, task, project, and task-template results keep exact focus, while other result kinds keep the prior owning-tab-only behavior;
- no schema, import/export UI, network request, worker, or background process.

Review evidence:

```text
Focused Jest             PASS - money, task, note, project, template, and list focus ID mapping tests
Full Jest                PASS - 51 suites, 227 tests
npm run typecheck        PASS
npm run lint             PASS
Bundle validation        PASS - Android metadata valid
Android release build   PASS - :app:assembleRelease with Java 17 and 2 workers
Emulator smoke           PASS - temporary `SearchList` searched and opened with `Rename task list`, name `SearchList`, and `Rename list`
Phone smoke              PASS - cold release startup with resumed `dev.yuzuha/.MainActivity`; automated touch input is rejected by device policy
Resource cleanup         PASS - temporary list deleted, both devices force-stopped, and no Yuzuha/Gradle/Java/Node process remained
```

Known limits:

- exact focus remains to be added separately for accounts, categories, transfers, splits, budgets, recurring rules, app groups, focus sessions, and time goals;
- search does not transfer filters or create ID-bearing deep links;
- import/export behavior was not expanded in this pass.

Next pass: choose the next bounded exact-record navigation contract after review; keep account/device recovery and remote sync behind their own decisions.

## Implementation review: Android app-group-search-focus pass

Status: Completed on 2026-07-28.

Delivered:

- app groups now have local edit controls backed by the existing `updateAppGroup` store action;
- app-group search results carry their stable ID through `globalSearchNavigation`;
- Search closes and the existing `pendingAppGroupId` path opens App Time with the group in edit mode;
- deleting the focused group clears the editor and selected group;
- no schema, import/export UI, network request, worker, or background process.

Review evidence:

```text
Focused Jest             PASS - exact focus mapping plus app-group update lifecycle test
Full Jest                PASS - 51 suites, 228 tests
npm run typecheck        PASS
npm run lint             PASS
Bundle validation        PASS - Android metadata valid
Android release build   PASS - :app:assembleRelease with Java 17 and 2 workers
Emulator smoke           PASS - temporary `SearchGroup` searched and opened with `Edit app group`, name `SearchGroup`, package `com.example.searchapp`, and `Update app group`
Delete regression smoke  PASS - deleting the focused group cleared the editor to `App group name` and `Add app group`
Phone smoke              PASS - cold release startup with resumed `dev.yuzuha/.MainActivity`; automated touch input is rejected by device policy
Resource cleanup         PASS - temporary group deleted, both devices force-stopped, and no Yuzuha/Gradle/Java/Node process remained
```

Known limits:

- exact focus remains to be added separately for accounts, categories, transfers, splits, budgets, recurring rules, focus sessions, and time goals;
- search does not transfer filters or create ID-bearing deep links;
- import/export behavior was not expanded in this pass.

Next pass: choose the next bounded exact-record navigation contract after review; keep account/device recovery and remote sync behind their own decisions.

## Implementation review: Android project-search-focus pass

Status: Completed on 2026-07-28.

Delivered:

- project search results carry their stable project ID through `globalSearchNavigation`;
- Search closes and the existing `pendingProjectId` path opens Tasks in the project edit form for that project;
- money, note, and task results keep exact focus, while other result kinds keep the prior owning-tab-only behavior;
- no schema, import/export UI, network request, worker, or background process.

Review evidence:

```text
Focused Jest             PASS - money, task, note, and project focus ID mapping tests
Full Jest                PASS - 51 suites, 227 tests
npm run typecheck        PASS
npm run lint             PASS
Bundle validation        PASS - Android metadata valid
Android release build   PASS - :app:assembleRelease with Java 17 and 2 workers
Emulator smoke           PASS - temporary `SearchProject` searched and opened with `Edit project`, name `SearchProject`, and `Update project`
Phone smoke              PASS - cold release startup with resumed `dev.yuzuha/.MainActivity`; automated touch input is rejected by device policy
Resource cleanup         PASS - temporary project deleted, both devices force-stopped, and no Yuzuha/Gradle/Java/Node process remained
```

Known limits:

- exact focus remains to be added separately for accounts, categories, transfers, splits, budgets, recurring rules, task lists, templates, app groups, focus sessions, and time goals;
- search does not transfer filters or create ID-bearing deep links;
- import/export behavior was not expanded in this pass.

Next pass: choose the next bounded exact-record navigation contract after review; keep account/device recovery and remote sync behind their own decisions.

## Implementation review: Android money-search-focus pass

Status: Completed on 2026-07-28.

Delivered:

- money search results carry their stable money-entry ID through `globalSearchNavigation`;
- Search closes and the existing `pendingMoneyId` path opens Money in edit mode for that entry;
- note and task results keep exact focus, while other result kinds keep the prior owning-tab-only behavior;
- no schema, import/export UI, network request, worker, or background process.

Review evidence:

```text
Focused Jest             PASS - money, task, and note focus ID mapping tests
Full Jest                PASS - 51 suites, 227 tests
npm run typecheck        PASS
npm run lint             PASS
Bundle validation        PASS - Android metadata valid
Android release build   PASS - :app:assembleRelease with Java 17 and 2 workers
Emulator smoke           PASS - temporary EUR 12.34 entry searched and opened with `Editing an entry`, amount `12.34`, and `Update entry`
Phone smoke              PASS - cold release startup with resumed `dev.yuzuha/.MainActivity`; automated touch input is rejected by device policy
Resource cleanup         PASS - temporary entry deleted, both devices force-stopped, and no Yuzuha/Gradle/Java/Node process remained
```

Known limits:

- exact focus remains to be added separately for accounts, categories, transfers, splits, budgets, recurring rules, projects, app groups, focus sessions, and time goals;
- search does not transfer filters or create ID-bearing deep links;
- import/export behavior was not expanded in this pass.

Next pass: choose the next bounded exact-record navigation contract after review; keep account/device recovery and remote sync behind their own decisions.

## Implementation review: Android note-search-focus pass

Status: Completed on 2026-07-28.

Delivered:

- note search results carry their stable note ID through `globalSearchNavigation`;
- Search closes and the existing `pendingNoteId` path opens Notes in edit mode for that note;
- task results keep exact task focus, while other result kinds keep the prior owning-tab-only behavior;
- no schema, import/export UI, network request, worker, or background process.

Review evidence:

```text
Focused Jest             PASS - note focus ID and task/tab-only result mapping tests
Full Jest                PASS - 51 suites, 227 tests
npm run typecheck        PASS
npm run lint             PASS
Bundle validation        PASS - Android metadata valid
Android release build   PASS - :app:assembleRelease with Java 17 and 2 workers
Emulator smoke           PASS - tapping `Open Note LinkNote` opened `Edit note` with title `LinkNote`
Phone smoke              PASS - cold release startup
Resource cleanup         PASS - both devices force-stopped and no Yuzuha/Gradle/Java/Node process remained
```

Known limits:

- exact focus remains to be added separately for money, projects, app groups, focus sessions, and time goals;
- search does not transfer filters or create ID-bearing deep links;
- import/export behavior was not expanded in this pass.

Next pass: choose the next bounded exact-record navigation contract after review; keep account/device recovery and remote sync behind their own decisions.
