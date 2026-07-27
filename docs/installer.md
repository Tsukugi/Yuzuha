# JavaScript bundle installer contract

Status: Android native installer implementation through the verified remote-bundle pass. The native shell checks signed metadata, downloads only a newer compatible bundle, verifies its hash and signature, atomically activates it, and starts from the newest verified local or embedded bundle.

## Purpose

The native shell ships an embedded JavaScript bundle. On every launch it checks whether a newer compatible bundle is available. It may activate a remote bundle only after verification. `MainApp` must not be presented before this launch gate completes.

## Remote endpoint

Default metadata URL:

```text
https://updates.yuzuha.dev/installer/bundle.json
```

The endpoint must be HTTPS, use a stable response schema, and return immutable bundle URLs. The update service must not require user identity for a public bundle.

## Metadata schema

Example:

```json
{
  "schema": 1,
  "appId": "yuzuha-mobile",
  "platform": "android",
  "runtime": "0.86.0",
  "version": "1.0.0",
  "minNativeVersion": "1.0.0",
  "bundleUrl": "https://updates.yuzuha.dev/bundles/android/1.0.0/main.jsbundle",
  "sha256": "hex-64-character-sha256",
  "sizeBytes": 1234567,
  "publishedAt": "2026-01-31T12:00:00Z",
  "signature": "base64-signature"
}
```

Required fields are `schema`, `appId`, `platform`, `runtime`, `version`, `minNativeVersion`, `bundleUrl`, `sha256`, `sizeBytes`, `publishedAt`, and `signature`.

Rules:

- `appId`, `platform`, and `runtime` must match the running shell.
- `version` uses strict semantic version comparison. Never downgrade.
- `minNativeVersion` must be less than or equal to the installed native version.
- `bundleUrl` must use HTTPS and must not contain user data.
- `sha256` must be a lowercase 64-character hex digest.
- `sizeBytes` must be positive and below the configured maximum bundle size.
- `publishedAt` must be a valid UTC timestamp.
- `signature` must verify against the pinned public key.

The service must return one release per platform/runtime. A future schema change needs a migration plan and test fixtures.

## Local state

Keep these records separately:

- embedded bundle: immutable baseline shipped in the native package;
- downloaded bundle: temporary until verification passes;
- verified bundle: immutable file with matching metadata;
- activation record: pointer to the selected verified bundle;
- last-known-good record: previous verified pointer kept for rollback.

Installer metadata is owned by the Android native shell in app-private files under `filesDir/installer`. The bundle file must use an app-private file path. Writes are atomic: download to a temporary file, verify, move into place, then atomically replace the activation pointer. No product data, AsyncStorage path, account, or network identity is used.

## Launch decision

The installer returns one typed result:

| Result | Meaning | Action |
| --- | --- | --- |
| `remote-activated` | A newer bundle passed all checks. | Start that bundle. |
| `local-current` | Local verified bundle is current or remote is not newer. | Start local bundle. |
| `offline-local` | Remote check timed out or had no network. | Start newest verified local bundle. |
| `invalid-remote` | Metadata, signature, hash, size, or compatibility check failed. | Keep local bundle; log a reason code. |
| `no-verified-bundle` | Clean install has no usable remote or embedded bundle. | Show a blocking update error; do not render `MainApp`. |

The UI may provide retry for a failed remote check, but retry must call the same deterministic installer path. Do not activate an unverified file or silently ignore a failed first install.

## Verification order

1. Parse JSON and reject unknown critical schema versions.
2. Validate all required fields and fixed values.
3. Compare versions and native compatibility.
4. Verify the metadata signature using the pinned public key.
5. Download with a timeout and bounded size.
6. Check actual byte size against `sizeBytes`.
7. Compute SHA-256 and compare to `sha256`.
8. Atomically activate the bundle.
9. Record the activation only after the move succeeds.

## Rollback

Keep the previous last-known-good bundle until the new bundle has started successfully and passed a startup health signal. If the new bundle fails that signal, mark it bad, restore the previous verified pointer, and expose a reason code for diagnostics. Rollback must not erase user data or change database schema.

## Operational requirements

- Publish the bundle and metadata atomically from the release pipeline.
- Never overwrite an existing immutable version.
- Keep a signed release record with version, platform, runtime, hash, and build job.
- Monitor metadata availability and bundle download failures without collecting personal content.
- Test the endpoint with `npm run check-bundle` before release.

## Developer note: local data starts after bundle verification

Current data boundary: the payee pass raises the accepted app schema to 29 and repository schema to 3. A fresh database seeds current payee records directly; old versions are rejected rather than upgraded.

The current report-filter pass is derived UI state over the accepted app schema 29/repository schema 3 data. It changes no installer metadata, bundle gate, cache rule, or startup work.

The next detailed provider description retains the prior pass wording for history; the current provider requires app schema 29 and repository schema 3 and rejects older data.

The current JavaScript path still checks the embedded bundle gate before mounting `AppStoreProvider`. The provider then opens the local SQLite repository, requires repository schema 2 and app schema 28, expands due money and task rules, copies any recurring-rule local reminder times into generated tasks, and synchronizes future open-task reminders through the current quiet-hours projection before `MainApp` receives the workspace. It also validates project references, task template fields and references, app-group records, focus-session states, task parent references, same-list parent links, parent cycles, task dependency references, cycles, and per-list task sort order before the workspace is shown. That synchronization is empty when the global `taskRemindersEnabled` flag is off. When the global flag is on, tasks linked to a recurring rule are also filtered by `recurringTaskRemindersEnabled`; one-off task reminders remain active when only the recurring flag is off. Both flags pause native alarms without deleting logical reminder timestamps, and turning them back on rebuilds future schedules. A current-schema validation, recurrence-expansion, project, template, app-group, focus-session, subtask, dependency, sort-order, or reminder-sync error is shown as a deterministic workspace error after the bundle has been verified; old schemas are rejected and are not guessed or upgraded. Restore also synchronizes the incoming projected reminder set before committing it, subject to both restored category flags.

The current Android gate runs once in `MainApplication` before the React host is created. It starts one background metadata request with 1.5-second connection/read bounds, validates Ed25519 metadata against the pinned public key, limits bundle downloads to 64 MiB and 5 seconds of read time, hashes bytes while writing a temporary file, and only then selects the private bundle path. A valid but not newer release keeps the newest verified local bundle. Timeout or network failure keeps the local bundle; invalid metadata, signature, compatibility, size, or hash keeps the same verified candidate. No retry loop or background update worker is started. The JavaScript installer module only reads the native launch result.

## Developer note

This contract is a startup dependency. Any change to metadata fields, cache paths, version rules, verification, activation, timeout, or rollback must update `architecture.md`, `testing.md`, and `release.md` in the same change.
