# Testing strategy

Status: Planned. The repository currently has no `src/` tests to run.

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
- budget rollover, refunds, recurring rules, timezone changes, and leap days;
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
