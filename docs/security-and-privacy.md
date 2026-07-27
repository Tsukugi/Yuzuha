# Security and privacy

Status: Security baseline through the Android reminder-snooze pass. This document is not a legal privacy policy.

## Data collected

MVP data is user-entered money, notes, and tasks, plus locally read Android app-usage summaries. The app should not collect contacts, location, microphone, camera, message content, keystrokes, or notification content.

## Data location

- Product data stays on the device by default.
- No account is required for the MVP.
- No personal content is sent to the bundle update endpoint.
- If opt-in diagnostics are added, they must exclude content and app-usage records by default.

## Sensitive data controls

- Protect encryption keys with Android Keystore where supported.
- Use encrypted local storage for product records if the selected SQLite binding supports it; otherwise document the residual risk before release.
- Do not log note bodies, transaction notes, amounts, package names, or export contents.
- Note archive and deletion are local metadata operations; confirmed note deletion also removes the note's private attachment files.
- Redact URLs, file paths, and identifiers in crash reports.
- Clear temporary bundle files after failed verification or activation.
- Use HTTPS and certificate validation for update metadata and bundle downloads.
- Local encrypted backups use audited Noble XChaCha20-Poly1305 and scrypt implementations, secure random salt/nonce values, authenticated metadata, and a password that is never stored by Yuzuha.
- Recovery-key backups use 32 secure random bytes, require in-session re-entry confirmation, and never store the recovery key on the device.
- File backup save uses an app-cache temporary file and deletes it after the system picker operation. Opened document content remains encrypted until authenticated decryption and validation succeed; file names and provider metadata are not treated as secret storage.
- Encrypted backup schema 2 keeps attachment IDs, sizes, checksums, and bytes inside authenticated ciphertext. Backup creation verifies private files before encryption, and restore verifies the decoded bytes before staging them. Plain JSON exports do not contain attachment bytes.
- Android attachment preview validates the canonical file path under the app-private `attachments` directory, supports only the declared image/PDF/plain-text MIME set, and shares a single read-only `FileProvider` URI with the selected external viewer. It does not expose the attachment directory or broad storage access.
- Note search runs over local title, body, normalized tag values, and attachment file names only. It never reads attachment bytes for search. Search input and results are not sent to a service or written to telemetry.
- Saved-search names, queries, and archived-note visibility are local workspace data. They are included only when the user creates an export or encrypted backup, and are not sent to telemetry or sync because sync is not implemented.
- Global search runs over loaded local records in memory. It does not read attachment bytes, require a new permission, send query text to a service, or write query text to telemetry. App-time results obey the existing Usage Access and included-snapshot boundary.
- Note-to-task conversion copies note title/body into a local task and stores only the stable local source-note ID. It does not send the note or task to a service.
- Task due dates, priorities, list links, status, and details remain local workspace data. Task delete is confirmed in the UI and removes the local task record only.
- Task reminders use generic locked-screen text. Android content and action intents carry only the opaque local task ID plus a fixed action name; the app resolves the task locally. `Complete` and `Snooze 1h` perform no remote operation and do not include task text in the notification payload.
- Quiet hours store only a daily local start/end time. They change local alarm scheduling and do not add task details, notification text, or network state.
- Task-list names and archive state are local workspace data. Deleting a list is confirmed and is rejected when tasks still reference it.

## Android Usage Access

Usage Access is a special permission. Explain exactly what it provides, why Yuzuha needs it, and that the user can say no. Read only aggregate usage duration and package identity needed for the feature. Do not inspect app content.

## Export and deletion

- Export is user initiated and clearly names the destination format.
- The export file is treated as sensitive. Do not upload it automatically.
- Delete all product records, preferences, cached usage snapshots, and local export references after confirmation.
- Deletion does not delete the installed app or its embedded bundle.

## Threats and controls

| Threat | Control |
| --- | --- |
| Tampered OTA bundle | HTTPS, signature/hash verification, compatibility checks, atomic activation, last-known-good record. |
| Data read from an unlocked device | App lock is a later option; document Android device-security assumptions. Use encrypted storage where supported. |
| Sensitive logs | Redaction helper, log review, and tests for forbidden fields. |
| Malformed input | Typed validation, length limits, SQL parameters, and safe serialization. |
| Dependency compromise | Lock files, dependency audit, minimum-version review, and release SBOM if available. |
| Export leakage | Explicit user action, clear file name, and no automatic sharing. |

## Security release gates

Before a public build, confirm that permissions, data flows, update verification, database access, logs, exports, and deletion have been reviewed. Record unresolved risks in the release notes; do not hide them behind a generic fallback.

## Synced mode privacy

Synced mode is opt-in and must disclose:

- which record types are encrypted and uploaded;
- what routing metadata the service can still see;
- how devices are enrolled and revoked;
- what happens when sync is paused or the account is deleted;
- what recovery material the service cannot replace.

The client encrypts record payloads before upload. The service must not receive plaintext note bodies, task details, transaction details, raw app usage, attachment contents, or recovery keys. Sync logs use opaque IDs and reason codes.

## Key and recovery rules

- Generate keys with platform secure randomness and protect device keys with Android Keystore or the iOS Keychain.
- Do not write recovery keys to logs, clipboard history, analytics, or support packages.
- Show recovery material before the first sync and verify that the user stored it.
- A lost recovery key may make encrypted data unrecoverable; state this plainly.
- Device revocation blocks future sync but does not claim to erase an offline device.
- Key rotation creates a new wrapped workspace key and keeps old ciphertext readable only as long as the documented retention policy permits.

## Import, attachments, and integrations

Treat imported files, pasted JSON, and attachments as untrusted input. Validate type, size, checksum, schema, record references, and parser limits. Do not execute imported content. Provider credentials stay in protected native storage and are deleted on disconnect according to the provider contract. Share sheets and widgets must not leak sensitive content on a locked screen. JSON restore must show a preview and require confirmation before replacing local records.

## Privacy review gates for new features

For every feature, record data collected, source, local storage, server transfer, retention, user control, deletion path, permission, and telemetry fields. A feature cannot enter a release phase if one of those fields is unknown.

## Phase 2 Usage Access implementation

Android Usage Access is now declared and accessed through a native `YuzuhaUsageAccess` module. The module checks the special permission before querying `UsageStatsManager`, opens the system settings screen, and returns aggregate duration/package labels only. The app stores snapshots locally and does not send them to a server. The user can leave the permission off and still use every other feature.

## Phase 4 local repository controls

Product records are stored in the app-private SQLite database. The repository uses bound parameters and one transaction for full-workspace writes. A malformed row or unsupported repository version blocks the workspace with a support-safe error; it does not silently discard data. Money reports are computed locally and do not send record content anywhere.

## Money transfer controls

Transfers use stable account IDs, same-currency validation, positive integer minor units, and the existing transactional local repository. They are kept separate from income and expense records so a balance projection cannot silently alter spending reports. Transfer notes remain local user content and are excluded from logs.

Split entries use stable category IDs and positive integer minor units. The repository stores one parent and one linked split record in the same workspace transaction. Exact-sum validation prevents a projection from creating or losing money, and split notes remain local user content.

Budgets are local records and projections. They use category IDs, bound local persistence, and no network path. Budget status is derived from local entries and split lines without logging notes or sending financial content.

## Phase 3 app-time controls

App exclusions are package-name settings stored only in the local workspace. Excluded snapshots stay local so the user can include them again without another Android read. Excluded apps are not sent to a service, and totals ignore snapshots marked `included = false`.
