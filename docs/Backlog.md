# Backlog

Open bugs, improvements, and TODOs for Yuzuha. Current behavior and shipped
work remain documented in the implementation and release records. Do not treat
an item here as implemented until code, tests, and required documentation prove
it.

## Tracking rules

- Use unique `YZ-###` IDs.
- Add a matching entry before implementation when no tracked item exists.
- A bug needs a deterministic failing test before its fix is accepted.
- An improvement must record the current behavior and a validation target.
- Use `Planned`, `Open decision`, or `In progress` honestly.
- Move completed items to [BacklogResolved.md](BacklogResolved.md) only after
  implementation, tests, and required documentation support the resolved claim.
- Keep intentionally rejected legacy paths and already shipped behavior out of
  this file.

## Open items

| ID | Type | Status | Summary | Details | Fix / validation |
| --- | --- | --- | --- | --- | --- |
| YZ-001 | Release | Open decision | Define the public schema upgrade policy. | The unreleased build accepts only app schema 33 and repository schema 3. Older app data, SQLite, backup, and CSV versions are rejected, and no public upgrade path exists yet. | Choose migration, reset, or another explicit policy before external users receive data. Record the decision in the release and decision docs, then add the matching boundary tests. |
| YZ-002 | Feature | Planned | Add account recovery and device enrollment. | Local password and recovery-key backups exist, but account recovery and device enrollment are not current behavior. They are prerequisites for safe multi-device continuity. | Define key custody, enrollment, revocation, recovery, and locked-device behavior. Validate with recovery, revocation, and data-loss tests before connecting sync. |
| YZ-003 | Feature | Planned | Add optional encrypted sync and conflict resolution. | Yuzuha is local-first today. Account sync, cursors, outbox handling, tombstones, conflict resolution, and sync restore remain planned. | Define the service/API contract and preserve a working no-network mode. Prove two-device offline edits, deletion, retry, conflict, and rollback behavior with deterministic fixtures. |
| YZ-004 | Portability | Planned | Expand import history and bank-file portability. | Current-format money CSV append and latest-import undo are implemented. Arbitrary bank CSV mapping, split-row import, and import history beyond the latest receipt remain future work. | Define mapping, preview, duplicate, error, and undo rules before implementation. Add bounded fixture tests and keep unsupported legacy formats rejected. |
| YZ-005 | Integration | Planned | Add two-way calendar integration and an explicit timezone policy. | Android currently offers a one-way all-day calendar draft for dated tasks. Calendar reads, event reconciliation, selected calendar/timezone preferences, and cross-device timezone behavior remain planned. | Define permission, event identity, edit/delete reconciliation, daylight-saving, and locked-screen behavior. Validate Android and iOS boundaries before adding writes or reads. |
| YZ-006 | Integration | Planned | Add richer capture entry points and widget choices. | Android currently has four static shortcuts and a fixed count widget. Dynamic shortcuts, record-carrying actions, user-selected widget cards, lock-screen controls, and iOS capture entry points remain planned. | Define privacy, refresh, stale-data, and no-background-work rules for each entry point. Add platform smoke coverage before exposing user data outside the app. |
| YZ-007 | Platform | Planned | Define and ship scoped iOS parity. | Android-only behavior still includes reminders, attachment opening, file-share capture, shortcuts, the summary widget, deep links, and calendar drafts. iOS attachment preview, reminders, and broader parity remain planned. | Create a platform feature matrix and separate platform contracts where Android APIs do not transfer. Implement one bounded slice at a time with iOS tests and release evidence. |
| YZ-012 | Bug / Release | In progress | Restore native-compatible OTA updates and add verified Android APK updates. | Published OTA `0.1.10` requires native `0.1.9`, so native `0.1.3` installations on bundle `0.1.8` reject the global latest metadata and show a misleading signature error. Native `0.1.3` has no secure APK-install bridge. | Publish a native-`0.1.3`-compatible `0.1.11`, enforce minor bumps for native incompatibility and same-line OTA delivery, publish a complete APK for every version, then ship native `0.2.0` with signed APK metadata, automatic verified download, bounded root install, and Android's standard installer fallback. An older line must install the latest version's APK directly. Validate the full matrix in `docs/android-updates.md`. |
