# JavaScript bundle installer contract

Status: Phase 0 implementation plus target contract. `src/installer` currently provides the embedded launch gate and metadata validator. Native remote bundle download, verification, and activation remain a later phase.

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

Installer metadata may use AsyncStorage, but the bundle file must use an app-private file path. Writes must be atomic: download to a temporary file, verify, move into place, then write the activation pointer.

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

The current JavaScript path still checks the embedded bundle gate before mounting `AppStoreProvider`. The provider then opens the local SQLite repository, imports legacy AsyncStorage data on first use, expands due money and task rules, copies any recurring-rule local reminder times into generated tasks, and synchronizes future open-task reminders through the current quiet-hours projection before `MainApp` receives the workspace. That synchronization is empty when the schema 20 `taskRemindersEnabled` category flag is off; the flag pauses native alarms without deleting logical reminder timestamps, and turning it back on rebuilds future schedules. A database migration, recurrence-expansion, or reminder-sync error is shown as a deterministic workspace error after the bundle has been verified; it must never cause the app to run an unverified bundle or silently drop records. Restore also synchronizes the incoming projected reminder set before committing it, subject to the restored category flag.

## Developer note

This contract is a startup dependency. Any change to metadata fields, cache paths, version rules, verification, activation, timeout, or rollback must update `architecture.md`, `testing.md`, and `release.md` in the same change.
