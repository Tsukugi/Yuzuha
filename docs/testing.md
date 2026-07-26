# Testing strategy

Status: Current test strategy through the encrypted-backup pass. Unit tests and Android smoke checks exist for the current implementation; the later full-product matrix remains planned.

## Test pyramid

### Unit tests

Use Jest for pure logic:

- money validation, minor-unit conversion, and totals;
- date and timezone grouping;
- task state transitions and overdue rules;
- note search normalization;
- app-time aggregation and exclusions;
- installer schema validation, semver comparison, compatibility, and reason codes;
- export serialization and redaction.

### Integration tests

Use an in-memory or temporary database adapter to test:

- repositories and migrations;
- save/edit/delete flows;
- dashboard queries;
- export followed by delete;
- installer activation and last-known-good behavior with mocked file and network adapters.

### Android device tests

Run on an emulator and at least one physical device before beta:

- clean install with network;
- clean install without network;
- upgrade from an older native build;
- upgrade from an older JS bundle;
- invalid metadata, invalid signature, wrong hash, truncated file, and timeout;
- Usage Access granted, denied, revoked, and unavailable;
- keyboard, font scaling, screen reader, and rotation/configuration changes;
- process death during a database write and during bundle activation.

### End-to-end tests

Automate the shortest important journeys:

1. Start from a clean install and reach Home.
2. Add and edit a money entry; verify the total.
3. Add and complete a task; verify it leaves the open list.
4. Add and search a note.
5. Grant Usage Access and verify a known fixture or mocked adapter result.
6. Export data and delete it; verify empty state.

## Installer test matrix

| Case | Expected result |
| --- | --- |
| Remote version is older | Keep local bundle. |
| Remote version is equal | Keep local bundle. |
| Remote version is newer and valid | Verify and activate remote bundle. |
| Wrong app, platform, or runtime | Reject metadata. |
| Native version too old | Reject metadata. |
| Signature or hash mismatch | Delete temp file and keep last-known-good. |
| Download exceeds size limit | Stop, delete temp file, keep local. |
| Network timeout with local bundle | Start local bundle with `offline-local`. |
| No verified bundle on first install | Block `MainApp` and show update error. |
| Crash during activation | On next start, use the previous atomic pointer. |

## Quality gates

Every change should pass:

```bash
npm run lint
npm run test -- --runInBand
npm run check-bundle
```

The native CI job must also run a debug Android build, a release build, and the device smoke suite. A release may not proceed with failing installer or migration tests.

## Developer note: reproduce first

For a bug, first add a failing test that reproduces the current behavior. Then make the smallest fix that satisfies the test. For an improvement, inspect the current implementation and add tests for the new contract before changing behavior.

## Full-product test areas

### Sync and recovery

- two-device convergence for each entity type;
- duplicate change replay and cursor resume;
- offline create/edit/delete and process death;
- tombstone retention and late updates;
- notes/tasks independent-field merge;
- money conflict preservation and resolution;
- device revoke, sync pause, account deletion, and recovery;
- encrypted fixture cannot be read by a service test without the key.

### Money planning

- transfers excluded from income/spending;
- split totals equal the parent;
- multi-currency reports never add incompatible units;
- multi-period budget rollover, refunds, recurring rules, timezone changes, and leap days;
- import preview, duplicate detection, commit, rollback, malformed rows, and large files.

### Notes and tasks

- rich text plain-text fallback and export;
- attachment checksum, unsupported type, size limit, delete, and restore;
- links survive title edits and show deleted targets;
- recurrence policies, dependency cycles, templates, project archive, and calendar view;
- search index rebuild and deletion cleanup.

### Notifications and integrations

- quiet hours, category settings, timezone/DST, reboot, process death, and duplicate schedules;
- notification action races and stale records;
- share capture preview, widget privacy, deep-link validation, calendar revoke, and file-picker errors;
- capability states for Android and iOS.

### Accessibility and localization

- TalkBack and VoiceOver main flows;
- large text, dark theme, high contrast, reduced motion, RTL, pseudo-localization;
- plural forms, non-default currencies, week starts, locale date formats, and daylight-saving boundaries.

## Performance and scale tests

Measure cold start, warm start, dashboard query, search, import, export, migration, sync, and attachment operations with realistic data sets. Define target thresholds before the full-product phase begins. Test low-memory devices, slow storage, no network, metered network, battery saver, and long-running local histories.

## Security tests

Run dependency audit, static analysis, secret scanning, malformed-input tests, SQL injection tests, deep-link tests, storage permission tests, key lifecycle tests, log-redaction tests, update tamper tests, and a focused penetration review before synced mode or provider integrations launch.

## Full-product release matrix

Each phase must test fresh install, upgrade from the previous phase, offline use, data export, deletion, permissions, and rollback. A feature is not complete because its screen works; its migration, sync/export representation, telemetry redaction, accessibility, and failure state must also pass.

## Money transfer evidence

- Jest: 10 suites, 28 tests passing, including same-currency validation, account-balance projection, schema 3 to schema 4 migration, and transfer round-trip coverage.
- Android build: `app:assembleDebug` passes with Java 17 and React Native 0.86.
- Emulator transfer flow: added a second EUR account, saved a EUR 2.50 Everyday-to-Savings transfer, and saw balances change from EUR -9.12 / EUR 0.00 to EUR -11.62 / EUR 2.50.
- Emulator report invariant: Home spending stayed EUR 9.12 after the transfer.
- Emulator restart: the transfer row and both projected balances were present after force-stop and relaunch.
- Phone `42adce68`: updated APK installed and `MainActivity` resumed; cleared-logcat launch produced no filtered app errors. Touch automation remains blocked by device policy.

## Split entry evidence

- Jest: 11 suites, 33 tests passing, including exact-sum validation, split report expansion, schema 4 to schema 5 migration, and SQLite round-trip coverage.
- Android build: `app:assembleDebug` passes with Java 17 and React Native 0.86.
- Emulator split flow: saved a EUR 10.00 parent with EUR 7.00 Health and EUR 3.00 Housing lines.
- Emulator report: Month view showed EUR 19.12 total, with Health EUR 7.00 and Housing EUR 3.00 categories; the existing EUR 9.12 Food total remained intact.
- Emulator restart: Home retained EUR 19.12 and the report retained the split categories after force-stop and relaunch.
- Phone `42adce68`: updated APK installed, `MainActivity` resumed, and current cleared-logcat launch produced no filtered app errors. Touch automation remains blocked by device policy.

## Budget evidence

- Jest: 12 suites, 37 tests passing, including budget validation, period projection, split-line counting, status thresholds, schema 5 to schema 6 migration, and SQLite round-trip coverage.
- Android build: `app:assembleDebug` passes with Java 17 and React Native 0.86.
- Emulator budget flow: saved a monthly EUR 10.00 Health budget against EUR 7.00 of matching split-line spending.
- Emulator projection: the screen showed EUR 7.00 used, EUR 3.00 remaining, and 70% used.
- Emulator restart: the budget and the same projection remained after force-stop and relaunch.
- Phone `42adce68`: updated APK installed and `MainActivity` resumed with no filtered current app errors. Touch automation remains blocked by device policy.

## Normalized storage and rollover evidence

- Jest: 12 suites, 40 tests passing, including schema 6 to schema 7 migration, repository schema 1 to schema 2 rewrite, normalized financial round-trip, malformed-row rejection, and carry-forward projection.
- Lint and strict TypeScript: passing.
- Bundle check and Android debug build: passing with Java 17.
- Emulator migration: existing EUR 19.12 money, 31 minutes of app time, one note, accounts, transfer, split, and old budget remained available after repository schema 1 to 2 rewrite.
- Emulator rollover: a monthly EUR 10.00 Health carry-forward budget showed EUR 10.00 carried, EUR 7.00 used, EUR 13.00 remaining, and 35% used; the prior `none` budget remained at EUR 3.00 remaining and 70% used.
- Emulator restart: both budget projections remained after force-stop and relaunch.
- Phone `42adce68`: APK installed, `MainActivity` resumed, and the cleared logcat had no filtered app errors. Touch automation remains blocked by device policy.

## Export and deletion evidence

- Jest: 13 suites, 43 tests passing, including JSON envelope contents, CSV schema/currency fields, CSV escaping, and empty-export behavior.
- Lint, strict TypeScript, bundle check, and Android debug build: passing.
- Emulator export: Data tools opened the Android share sheet with Quick Share, Drive, and Bluetooth targets.
- Emulator deletion: the confirmation dialog appeared; after confirmation, Home showed EUR 0.00, 0 saved notes, and 0 open tasks.
- Phone `42adce68`: final APK installed and `MainActivity` resumed with no filtered app errors. Touch automation remains blocked by device policy.

## Import and restore evidence

- Jest: 15 suites, 55 tests passing, including JSON restore parsing, schema 7 migration, schema 8 to schema 9 recurrence migration, old SQLite recurrence-row compatibility, malformed JSON rejection, duplicate-ID rejection, split-total validation, and all/one/skip recurrence behavior.
- Lint and strict TypeScript: passing.
- Android bundle and debug APK: passing with Java 17.
- Emulator restore smoke: Data tools opened, `not-json` was rejected with “The restore text is not valid JSON.”, and no restore was committed.
- Phone `42adce68`: final APK installed and `MainActivity` resumed with no filtered app errors. The phone still blocks automated touch input, so valid restore confirmation was tested through parser/unit coverage rather than phone interaction.
- The restore path has a pure validation step and a separate confirmed replacement step; invalid input never reaches `WorkspaceStore.save`.

## Recurring policy evidence

- Unit tests cover all missed occurrences, one first missed occurrence, skip-all missed occurrences, policy validation, schema migration, and next-date advancement.
- SQLite regression coverage proves an old recurrence payload without a policy reads as `all` instead of crashing or silently changing its schedule.
- The recurrence UI includes All, One, and Skip choices and displays the stored policy for each rule.
- Android APK and device smoke: schema 9 APK built and installed on both devices; emulator rendered and selected All, One, and Skip, then restarted with the existing EUR 2.50 total unchanged and no filtered app errors. The phone `42adce68` remains install/start-only because touch injection is blocked.

## Encrypted backup evidence

- Unit tests cover encrypted round-trip, absence of plaintext, wrong password, authenticated tampering, weak passwords, and unsupported envelope parameters.
- The crypto dependency ESM packages are included in the Jest transform allow-list and pass strict TypeScript and lint checks.
- The final debug APK was installed on the emulator and phone. The emulator rendered the encrypted Data tools fields, rejected a weak password, and opened the Android text chooser for a valid encrypted backup; the phone remains install/start-only because touch injection is blocked by device policy.

## Recurring money evidence

- Jest: 14 suites, 47 tests passing, including schema 7 to schema 8 migration, recurrence validation, calendar boundary handling, due generation, duplicate prevention, and SQLite round-trip coverage.
- Lint, strict TypeScript, bundle check, and Android debug build: passing.
- Emulator recurrence: created a monthly EUR 2.50 Health rule starting today; Home showed EUR 2.50 and the rule showed next occurrence 2026-08-26.
- Emulator restart: Home remained EUR 2.50 after force-stop/relaunch, proving the same due occurrence was not generated twice.
- Phone `42adce68`: final APK installed and `MainActivity` resumed with no filtered app errors. Touch automation remains blocked by device policy.

## Phase 4 evidence

- Jest: 9 suites, 24 tests passing, including SQLite import/round-trip/corruption/version tests and currency-safe money reports.
- Android build: `app:assembleDebug` passes with `@op-engineering/op-sqlite` native C++ code and RN 0.86.
- Emulator migration: existing AsyncStorage data reopened through SQLite with EUR 0.00 money, 31 minutes included app time, and one saved note.
- Emulator persistence: two EUR 4.56 entries produced EUR 9.12, which remained after force-stop and relaunch.
- Emulator report: Money report Month view showed EUR 9.12 spent and Food as the category.
- Phone `42adce68`: updated APK installed, native SQLite library loaded, and `MainActivity` resumed. Automated touch input remains blocked by device policy.

## Phase 3 evidence

- Jest: 7 suites, 18 tests passing, including schema 2 to schema 3 migration, period keys, usage grouping, and excluded-total behavior.
- Emulator money flow: existing entry edited from EUR 12.50 to EUR 13.50, deleted, and a category archived from the active list.
- Emulator app-time flow: `com.rapunzel` excluded; Today changed from 12 h 30 min to 31 min and the row changed to `Include`.
- Emulator goal flow: the default weekly 300 minute goal saved and rendered `56 min of 5 h`.
- Phone `42adce68`: install, launch, and resumed-activity checks remain clean; touch automation is blocked by the device policy.

## Phase 2 evidence

- Jest: 6 suites, 16 tests passing, including schema migration, period boundaries, usage grouping, and the single-day query regression.
- Android build: `app:assembleDebug` passes with the native Usage Access package.
- Emulator: permission settings opened, Usage Access granted, usage read completed, top-app rows rendered, and Home card updated.
- Phone `42adce68`: updated APK installed and `MainActivity` resumed without app errors. Interactive input remains blocked by the device’s `INJECT_EVENTS` policy.
