# Testing strategy

Status: Current test strategy through the Android task-search-focus pass. Unit tests and Android smoke checks exist for the current implementation; the later full-product matrix remains planned. Older phase evidence below is historical and does not describe current compatibility behavior.

## Test pyramid

## Latest-only schema boundary

- Focused Jest rejects old app JSON schema, old encrypted backup schema, old SQLite repository schema, incomplete current SQLite settings, and missing current record fields instead of applying defaults.
- The current suite is 51 Jest suites and 227 tests. Note-link validation, linked-target search/navigation/task-focus rules, rich-note parsing/editing, AppStore lifecycle, SQLite persistence, JSON/backup validation, latest-import undo, and current money CSV behavior have focused tests; legacy migration and AsyncStorage import suites were removed with the code they covered.
- Fresh SQLite startup seeds current app schema 32 data directly; old local database files and missing current metadata, including the latest-import receipt and note links, are rejected by repository validation.

## Money filter evidence

- Focused Money-filter tests cover combined local period, type, category, and account matching, the unfiltered result, and currency-separated filtered totals.
- Emulator `emulator-5554`: release Money showed the Entry filters and Filtered totals sections; Month selection changed the selector state and the fresh workspace showed the explicit no-totals state without filtered fatal or ReactNativeJS errors.
- Phone `42adce68`: release startup completed with the native offline-local decision and no filtered app errors. Both devices were force-stopped afterward.

## Money payee evidence

- Focused payee tests cover trimmed records, blank names, case-insensitive duplicate rejection, and same-record validation.
- SQLite round-trip coverage stores a payee record, a money-entry `payeeId`, `weekStartsOn`, the latest money CSV import receipt, and a note link; JSON and CSV tests use current schema 32 data and current payee columns.
- Global-search coverage finds a money entry by its payee name and includes that name in the result title.

## Note-link evidence

- Focused note-link tests cover all four target types, missing targets, duplicate links, and stable link keys.
- AppStore tests cover add/remove behavior and keep a link readable after its target task is deleted.
- SQLite round-trip, malformed-record rejection, JSON restore, and encrypted-backup tests cover the current `noteLinks` collection.
- Emulator smoke verifies the Notes link editor, target search, saved linked-record label, and deleted-target label. Phone smoke verifies clean startup with no filtered app errors.
- Global-search tests verify active linked-target matching, readable note-result labels, archived-project gating, and exclusion of deleted target content from search.
- Rich-note tests verify supported inline/line markers, plain-text fallback, selection-based formatting, multi-line bullets, and heading toggling. Emulator smoke verifies the toolbar created `# Smoke` and the saved card displayed `Smoke` rather than raw markers.
- Search-navigation tests cover every supported result kind. Emulator smoke verifies `Open Note LinkNote` and `Open Task LinkTask` actions, then taps the note result and reaches Notes.
- Task-focus tests verify only task results carry a stable focus ID. Emulator smoke taps `Open Task LinkTask`, reaches Tasks, and shows `Edit task` with the `LinkTask` title.

## Week-start preference evidence

- Focused period and budget tests cover Sunday and Monday week boundaries; Money filter tests confirm the same setting changes weekly entry scope.
- JSON restore rejects a missing current week-start field, SQLite round-trip preserves it, and AppStore tests verify the Sunday setting is saved.
- The release emulator smoke checks the Home week-start controls and updated weekly range; phone startup completes with no filtered app errors.

## Money report evidence

- Focused report tests cover local range, kind, category, and account filtering, including split-line category matching without duplicating a split parent.
- The release emulator smoke checks the report scope card, range, type/category/account controls, and the explicit empty-scope state. Phone startup completes with no filtered app errors.

## Native installer evidence

- Focused Jest covers the typed JavaScript bridge, embedded fallback, native verified result, invalid native result blocking, current metadata shape, and stable signed-payload construction.
- `:app:compileDebugKotlin` passes for the native installer and `:app:assembleRelease` passes with Java 17 and two workers. The release APK installs on emulator `emulator-5554` and phone `42adce68`.
- Emulator startup after install rendered `Bundle 0.1.0` and the Home screen. Phone startup completed without filtered fatal or ReactNativeJS errors; its UI automation bridge remains unavailable by device policy.
- The default update endpoint was unavailable during smoke, so the deterministic `offline-local`/embedded path was exercised. A live signed remote activation requires the release endpoint and is not claimed by this device smoke.
- Both devices were force-stopped after the check, and no Gradle, Kotlin compiler, or app worker process remained.

## Home period evidence

- Focused period tests cover the shared Today/This week/This month labels and exact Monday-to-Sunday range formatting.
- Emulator `emulator-5554`: release Home showed the selected local range; Day, Week, and Month changed the page title and money/app-time card labels to the matching period. No filtered fatal or ReactNativeJS errors appeared.
- The Home money calculation excludes entries outside the selected range and entries in other currencies; no AppData write or native refresh occurs when changing the selector.
- Phone `42adce68`: release startup logged the native offline-local bundle decision with no filtered app errors. Both devices were force-stopped afterward.

## Period Review evidence

- Focused review tests cover main-currency and selected-range money, included app time, due/open tasks, completed tasks, overdue tasks, active-note updates, Usage Access state, and local-date overdue handling in Europe/Berlin and UTC.
- Emulator `emulator-5554`: Home opened Review; Today, This week, and This month changed the review title and exact local range. No filtered fatal or ReactNativeJS errors appeared.
- Phone `42adce68`: release startup completed with the native offline-local decision and no filtered app errors. Both devices were force-stopped afterward.

## App Time period evidence

- Focused usage tests cover local Day/Week/Month range splitting and aggregation from separate local-day query results.
- Emulator `emulator-5554`: Usage Access was granted; Day, Week, and Month selectors showed the correct local range, and a Week refresh completed with `0 app records read for this week.` and a saved last-read time.
- The refresh path made bounded sequential day queries and called the AppStore replacement once after all queries completed. The emulator log had no filtered fatal or ReactNativeJS errors.
- Phone `42adce68`: release App Time cold launch showed the honest Usage Access unavailable state with no filtered app errors. UI automation is blocked by the device policy.

## Task reminder evidence

- Focused Jest covers task dependency graph validation, cycle rejection, completed-prerequisite blocking, strict local date-time parsing, impossible dates and DST gaps, future-time validation, quiet-hours same-day and overnight projection, quiet-hours validation, recurring-rule `HH:mm` validation and generated timestamps, Android permission handling, schedule/cancel/sync forwarding, cold-start task targets, warm-app task-open and action subscriptions, current-schema validation, invalid import rejection, SQLite round trips, and the create-then-remind, recurring-generated-reminder, quiet-hours rollback, idempotent Complete-action, snooze projection, stale-target, global category-pause, recurring-category filtering, and paused-snooze AppStore regressions.
- Historical recurring-reminder evidence: Full Jest ran 32 suites and 148 tests before the latest-only cleanup. Current full-suite evidence is recorded above.
- Emulator `emulator-5554`: a fresh release install created `SmokeReminder`; the task row showed `Reminder 2026-07-28T09:30`, and `dumpsys alarm` showed the stable `dev.yuzuha.TASK_REMINDER` alarm after force-stop/relaunch.
- Emulator delivery: a near-term reminder delivered after Android's alarm window on channel `task_reminders`; `dumpsys notification` showed `Yuzuha task reminder`, and the alarm was removed after delivery.
- Emulator deep link: tapping the delivered notification reopened Tasks with `DeepLinkSmoke` and its saved reminder in edit mode; cold-start and warm-app intent paths produced no filtered app errors.
- Emulator quiet-hours smoke: the Tasks form saved `22:00`–`07:00` and showed `Quiet hours saved.`; at 06:15 local time, `QuietSmoke` kept its logical `Reminder 2026-07-27T06:30` while `dumpsys alarm` showed the native alarm projected to `07:00`.
- Emulator notification-action smoke: a delivered reminder showed the `Complete` action; tapping it completed `ActionDismiss`, opened `MainActivity`, and removed the handled notification record while the logical reminder remained unchanged.
- Emulator snooze smoke: a delivered reminder showed `Snooze 1h` beside `Complete`; tapping it opened `MainActivity`, removed the delivered notification, and scheduled a new native alarm at action time plus one hour.
- Emulator snooze-duration smoke: Tasks saved `30m`; the delivered notification showed generic `Snooze`, and tapping it removed the notification and scheduled a new alarm about 30 minutes later.
- Emulator category-pause smoke: Tasks saved Task reminders `Off`; the logical reminder time stayed on the task, `sync([])` removed native schedules, and a stale snooze action did not create a new alarm.
- Emulator recurring-reminder smoke: the recurring-task form showed an optional `HH:mm` reminder field; a rule-created future task retained its generated reminder and the native alarm projection was visible after save/relaunch.
- Emulator recurring-category smoke: a clean release install showed separate global and recurring-task reminder switches; turning recurring reminders off persisted the Off state through save and relaunch.
- Emulator dependency smoke: a clean release install created prerequisite and dependent tasks, saved the dependency, and showed `Blocked by PrereqSmoke` while the dependent remained open.
- Emulator agenda smoke: a clean release install opened Tasks, switched to Agenda, and showed the device-local dated-task agenda.
- Task-order unit coverage: manual, due-date, and priority sorting preserve deterministic tie order; Up/Down swaps persisted per-list sort order without mutating the source array.
- Task-order store coverage: new tasks receive the next per-list order and moving a task persists the swapped order through AppStore.
- Project coverage: project names and status validate strictly; project links persist through AppStore, SQLite, JSON import, encrypted backup, and global search; projects with linked tasks cannot be deleted.
- Focus coverage: app-group package validation, one-active-session enforcement, link validation, completion/manual-stop states, elapsed duration, AppStore lifecycle, SQLite/JSON/encrypted-backup persistence, and global search.
- Emulator focus smoke: clean release opened App Time, showed the focus link selectors and app-group controls, started a session without crashing, completed it, and showed the completed session after force-stop/relaunch.
- Subtask coverage: same-list parent validation, missing-parent and self-link rejection, cycle rejection, AppStore persistence, JSON/SQLite field validation, and direct-child promotion after parent deletion.
- Template coverage: strict template lifecycle validation, unique names, archive/delete behavior, active-template task creation, project reference protection, JSON import, encrypted-backup round trip, SQLite persistence, and archived/global-search filtering.
- Quick-capture coverage: deterministic Money, Notes, and Tasks targets and labels; the menu has no persistence contract.
- Share-capture coverage: normalization, subject-only fallback, first-line title derivation, empty/oversized rejection, Android native bridge compilation, cold-start and warm-app preview, note/task confirmation routing, relaunch persistence, and no filtered fatal or ReactNativeJS errors.
- Emulator `emulator-5554`: release `ACTION_SEND` smoke showed `Shared capture` with the shared subject/body, saved a note, then accepted a warm share and saved a task; the task was visible after relaunch.
- Phone `42adce68`: release `ACTION_SEND` smoke showed `Shared capture` with the shared subject/body and no filtered app errors. Touch automation remains blocked by device policy.
- Launcher-action coverage: supported Money, Notes, Tasks, and App Time actions map only to existing tabs; unknown actions are rejected.
- Emulator `emulator-5554`: release cold and warm launcher-action intents opened Money, Notes, Tasks, and App Time with no filtered fatal or ReactNativeJS errors; the release manifest/resource inspection found all four static shortcut IDs and action filters.
- Phone `42adce68`: release cold and warm launcher-action intents were accepted and delivered to `MainActivity` with no filtered app errors. MIUI returned no UI automation root, so target-screen text was verified on the emulator; touch automation remains blocked by device policy.
- File-share coverage: shared attachment normalization, supported MIME/name/size rejection, direct-source private copy, checksum metadata, one-commit AppStore note/attachment save, text-share regression, and source-extra clearing.
- Emulator `emulator-5554`: release `content://` file share showed `shared.txt`, `text/plain`, and `6 bytes`; Save as note created the attachment, and the note/attachment remained after force-stop/relaunch with no filtered fatal or ReactNativeJS errors.
- Phone `42adce68`: release text share still launched `MainActivity` with no filtered app errors; file UI interaction remains emulator-based because the phone returns no UI automation root.
- Widget coverage: pure summary projection tests count only open tasks and non-archived notes, with deterministic singular/plural labels; the native provider uses `updatePeriodMillis=0` and a tap `PendingIntent`.
- Emulator `emulator-5554`: the release launcher placed the 3x2 Yuzuha widget, it showed `0 open tasks · 0 active notes`, tapping it opened Yuzuha, and saving a shared Inbox task updated the widget to `1 open task · 0 active notes`.
- Phone `42adce68`: release provider registration was present, `MainActivity` launched cleanly, and no filtered fatal or ReactNativeJS errors appeared; phone widget placement remains unautomated because the device returns no UI automation root.
- Deep-link coverage: pure routing tests cover all four supported routes and reject query data, remote hosts, extra paths, whitespace, and non-string values.
- Emulator `emulator-5554`: release cold `yuzuha://open/tasks` opened Tasks, warm `yuzuha://open/notes` opened Notes, and a query-bearing task link was ignored without changing the Notes tab; no filtered fatal or ReactNativeJS errors appeared.
- Phone `42adce68`: release cold and warm deep links delivered to `MainActivity`, the `yuzuha` manifest filter was registered, and no filtered fatal or ReactNativeJS errors appeared. UI text remains emulator-verified because phone automation has no root.
- Calendar-draft coverage: strict title/details/date validation rejects blank titles, missing dates, and impossible local dates; valid dated tasks produce the exact Android draft boundary without a schema or permission contract.
- Emulator `emulator-5554`: a dated `CalendarSmoke` task was filtered to Upcoming, its visible `Calendar` action opened `com.google.android.calendar` through the system editor path, and no filtered fatal or ReactNativeJS errors appeared. The device showed Google Calendar's first-run screen, so Yuzuha did not claim that the external event was saved.
- Phone `42adce68`: the latest release installed and cold-launched `MainActivity` with no filtered fatal or ReactNativeJS errors; UI automation still returned no root.
- Cold-intent regression: before the native fix, an unknown `ACTION_VIEW` was cleared by the launcher-action module and a cold `yuzuha://open/tasks` smoke stayed on Home. After the fix, the same release smoke opened Tasks; the launcher bridge now clears only recognized launcher actions.
- Money CSV import coverage: current header/schema validation, quoted commas/newlines, currency totals, duplicate IDs, missing account/category references, split-linked rejection, malformed rows, bounded picker files, cache cleanup, picker cancellation, transactional store append, and duplicate-batch rejection.
- Emulator `emulator-5554`: release Data tools chose `money-import-smoke.csv`, showed one row and EUR 4.25 expense in preview, confirmed the append, and showed the imported `-EUR 4.25` entry after force-stop/relaunch; no filtered fatal or ReactNativeJS errors appeared.
- Phone `42adce68`: latest release installed and cold-launched `MainActivity` with no filtered fatal or ReactNativeJS errors; touch automation remains unavailable by device policy.
- Encrypted backup file coverage: picker-reported size rejection, cached-file `stat` rejection before read, cleanup after rejection, valid cache read, and cancellation.
- Emulator `emulator-5554`: release Data tools opened a valid encrypted backup from the system picker, checked the file before reading, completed scrypt/decryption, and showed the validated encrypted preview without a filtered fatal or ReactNativeJS error.
- Phone `42adce68`: latest release installed and cold-launched `MainActivity` with no filtered fatal or ReactNativeJS errors; touch automation remains unavailable by device policy.
- JSON file restore coverage: current JSON export validation, bounded picker files, cache cleanup, picker cancellation, and reuse of the existing record-count preview and destructive restore path.
- Emulator `emulator-5554`: release Data tools chose `json-restore-smoke.json`, showed the current record-count preview, confirmed replacement, and showed the restored note after force-stop/relaunch with no filtered fatal or ReactNativeJS errors.
- Phone `42adce68`: latest release installed and cold-launched `MainActivity` with no filtered fatal or ReactNativeJS errors; touch automation remains unavailable by device policy.

### Unit tests

Use Jest for pure logic:

- money validation, minor-unit conversion, and totals;
- date and timezone grouping;
- task state transitions and overdue rules;
- note search normalization and attachment filename matching;
- saved-search validation, current-schema persistence, export/restore, backup round trips, and lifecycle actions;
- global-search matching, stable result ordering, archived-record filtering, and Usage Access visibility rules;
- note-to-task creation, source preservation, JSON/backup validation, and SQLite round trips;
- task draft validation, task identity-preserving edits, task deletion rules, date filters, JSON/backup validation, and SQLite round trips;
- task-list name validation, identity-preserving rename, archive protection, reference-safe deletion for tasks and recurring rules, and import validation;
- recurring task draft validation, deterministic all/one/skip expansion, pause/delete behavior, JSON validation, and SQLite round trips;
- task reminder local date-time validation, future timestamp rules, quiet-hours validation and projection, recurring-rule reminder validation and expansion, current-schema JSON validation, SQLite round trips, Android permission handling, native schedule/cancel forwarding, cold-start target and warm-app action routing, idempotent Complete handling, selected snooze projection, stale-target no-ops, category pause persistence, paused snooze no-ops, and restore synchronization;
- note lifecycle filtering, validation, editing, pinning, archive state, and deletion ownership;
- app-time aggregation and exclusions;
- installer schema validation, semver comparison, compatibility, and reason codes;
- export serialization and redaction.

### Integration tests

Use an in-memory or temporary database adapter to test:

- repositories and current-schema rejection;
- save/edit/delete flows;
- dashboard queries;
- export followed by delete;
- installer activation and last-known-good behavior with mocked file and network adapters.

### Android device tests

Current evidence for the Android snooze-duration policy pass:

- Android release APK installed on emulator `emulator-5554` and phone `42adce68`;
- emulator smoke created a task from a note, showed the source note in Tasks, and confirmed the source note remained unchanged;
- emulator UI dump showed the schema 28 task form, Inbox list, priority controls, due-date and reminder fields, project selection, optional parent-task selection, task-template controls, Task reminders On/Off, Recurring task reminders On/Off, dependency controls, recurring-rule `HH:mm` reminder time, quiet-hours settings, recurring-task controls, and All/Overdue/Today/Upcoming/Completed filters;
- emulator UI dump showed Home Quick capture, Add money, Add note, and Add task targets; selecting a target is covered by the existing feature-form smoke path;
- emulator ADB smoke created a `Work` list, then showed its active controls and its `Archived`/`Restore` state;
- both devices resumed `dev.yuzuha/.MainActivity` after a process restart;
- no fatal Android or React Native error appeared during the final launch checks;
- phone touch input remains blocked by the device policy, so phone validation is launch-only.

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

The native CI job must also run a debug Android build, a release build, and the device smoke suite. A release may not proceed with failing installer or current-schema validation tests.

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

## Encrypted backup file evidence

- Unit tests cover encrypted file save, encrypted file open and preview, system-picker cancellation, encrypted content passed to the save boundary, and cleanup ownership when password validation fails before file creation.
- Android and iOS document-picker calls are isolated in `encryptedBackupFile.ts`; the encrypted file adapter never writes plaintext workspace JSON.
- Full verification: Jest 17 suites and 63 tests, lint, strict TypeScript, bundle metadata check, Android bundle generation, debug APK build, and release APK build all pass.
- Release emulator `emulator-5554`: saved `yuzuha-encrypted-backup-2026-07-26.json` through DocumentsUI, selected it again, decrypted it on-device, and showed the validated preview with 8 records. This also covers the strict UTF-8 decoder used when Android does not provide `TextDecoder`.
- Phone `42adce68`: release APK installed and `MainActivity` resumed with no filtered Yuzuha app errors. Touch automation remains blocked by device policy, so file-picker interaction was run on the emulator.

## Local recovery-key backup evidence

- Focused Jest coverage includes key format and entropy-shape validation, grouped/ungrouped/lowercase normalization, credential markers, wrong-key rejection, recovery file naming, and system-picker save behavior.
- Full Jest verification: 17 suites and 66 tests pass, with lint, strict TypeScript, bundle metadata, Android bundle generation, and debug/release APK builds passing.
- The emulator release APK generated a recovery key, accepted a 64-character key through Android key events, saved `yuzuha-recovery-backup-2026-07-27.json`, reopened it, and showed `Credential: recovery key` with the validated 8-record preview.
- The same emulator run reproduced the pre-fix failure for unnormalized recovery input; the regression test failed before the normalization fix and passed after it.
- Phone `42adce68`: the current release APK installed and `MainActivity` resumed with no filtered Yuzuha app errors. Touch automation remains blocked by device policy.

## Local note attachment evidence

- Focused Jest: 4 suites and 27 tests pass for schema 9 to 10 migration, attachment JSON validation/counting, attachment-count limits, SQLite record round-trip, file import, unsupported types, picker cancellation, size limits, checksum metadata, private-file deletion, workspace file cleanup, and unsafe IDs.
- The implementation uses the system document picker, app-private document storage, a 10 MiB per-file limit, a 10-attachment per-note limit, and SHA-256 metadata.
- Full Jest: 18 suites and 76 tests pass. Lint, strict TypeScript, bundle metadata, Android bundle generation, debug APK build, and release APK build also pass.
- Emulator `emulator-5554`: release APK created a note, opened DocumentsUI, imported `yuzuha-attachment.txt`, showed the stored name and `3.2 KB` size, then removed the attachment and returned to the note without an attachment row.
- Encrypted JSON backups include attachment metadata but not attachment bytes. Phone `42adce68`: release APK installed and `MainActivity` resumed without filtered app errors; touch automation remains blocked by device policy.

## Portable encrypted attachment evidence

- Focused Jest: 4 suites and 23 tests pass for encrypted backup, attachment payload, file adapter, and backup-file behavior, including schema 1 compatibility, schema 2 attachment bytes, checksum validation, the 32 MiB limit, staged private-file writes, and cleanup behavior.
- Full Jest: 19 suites and 82 tests pass. Lint, strict TypeScript, bundle metadata, Android bundle generation, debug APK build, and release APK build also pass.
- New encrypted backups read private attachment files before encryption. Restore validates the authenticated bytes before staging them; plain JSON restore with attachments is rejected.
- Emulator `emulator-5554`: release APK saved an encrypted backup through DocumentsUI, reopened it with the password, showed an 11-record preview with 1 attachment, restored it after confirmation, and showed `yuzuha-attachment.txt` at `3.2 KB` in Notes.
- Phone `42adce68`: release APK installed and `MainActivity` resumed without filtered app errors; touch automation remains blocked by device policy.

## Android attachment preview evidence

- Focused Jest: 2 suites and 11 tests pass for the typed preview adapter, native-module handoff, attachment path, MIME type, and native error conversion.
- The Android bridge accepts only a canonical file directly under app-private `filesDir/attachments`, supports JPEG, PNG, GIF, WebP, PDF, and plain text, and grants a read-only `FileProvider` URI to the system chooser.
- Full Jest: 20 suites and 85 tests pass. Lint, strict TypeScript, bundle metadata, Android bundle generation, and debug/release APK builds also pass.
- Emulator `emulator-5554`: imported the controlled PNG fixture through DocumentsUI, opened the Android Photos viewer from Notes, and returned to Yuzuha with the Back action.
- Phone `42adce68`: the release APK installed and `MainActivity` resumed without filtered app errors; touch automation remains blocked by device policy.

## Note tags and search evidence

- Focused Jest covers tag normalization, invalid stored-tag rejection, title/body/tag matching, schema 10 to 11 migration, old SQLite note-row migration, and current JSON/export/encrypted-backup validation.
- The note search helper is case-insensitive, matches only local title/body/tag fields, and returns all notes for an empty query.
- Full Jest: 21 suites and 90 tests pass. Lint, strict TypeScript, bundle metadata, Android bundle generation, and debug/release APK builds also pass.
- Emulator `emulator-5554`: created a note with `smoketag` and `work`, confirmed the tags were displayed after force-stop/relaunch, matched the note with uppercase tag and body searches, and showed `No notes match this search.` for an unknown query.
- Phone `42adce68`: the release APK installed and `MainActivity` resumed without filtered Yuzuha errors. Touch input remains policy-blocked, so interactive checks ran on the emulator.

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
