# JavaScript bundle installer contract

Status: Android native installer and manual OTA implementation for the 0.1.3 release. The native shell checks signed metadata, verifies only a newer compatible bundle, stores manual updates as pending for the next launch, and rolls back a pending bundle that does not report a healthy React root. GitHub Release publication, live activation, pending promotion, and rollback device smoke pass; evidence is in `docs/releases/v0.1.3.md`.

The current project OTA trust anchor is a fresh Ed25519 key. Its public-key
SHA-256 fingerprint is
`cf181636d6a4ee260f4739a3239c1eb17dd72dcb2bd9c93ad5c74f59a7b28f5e`; the
private key is outside the repository. A new APK is required for this pin to
reach devices.

## Purpose

The native shell ships an embedded JavaScript bundle. On every launch it checks whether a newer compatible bundle is available. It may activate a remote bundle only after verification. `MainApp` must not be presented before this launch gate completes.

## Remote endpoint

Default metadata URL:

```text
https://github.com/Tsukugi/Yuzuha/releases/latest/download/bundle.json
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
  "bundleUrl": "https://github.com/Tsukugi/Yuzuha/releases/download/v1.0.0/Yuzuha-1.0.0.jsbundle",
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
- `bundleUrl` must use HTTPS, must not contain user data, and must include an
  exact version path segment (`/<version>/` or `/v<version>/`).
- `sha256` must be a lowercase 64-character hex digest.
- `sizeBytes` must be positive and below the configured maximum bundle size.
- `publishedAt` must be a valid ISO-8601 timestamp with an explicit timezone.
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

The current state record is schema `2`:

```json
{
  "schema": 2,
  "current": {"version": "0.1.3", "fileName": "bundle-0.1.3.jsbundle", "sizeBytes": 1234567, "sha256": "...", "runtime": "0.86.0", "minNativeVersion": "0.1.3"},
  "pending": {"version": "0.1.5", "fileName": "bundle-0.1.5.jsbundle", "sizeBytes": 1234567, "sha256": "...", "runtime": "0.86.0", "minNativeVersion": "0.1.3", "attempted": false},
  "blockedVersion": null
}
```

`current` is the last known-good bundle. `pending` is a verified update that
will be tried on the next launch. Native code sets `attempted` before selecting
it. JavaScript calls `markLaunchSuccessful` after the root app renders; only
then does native code promote `pending` to `current`. If the next launch sees
an already-attempted pending bundle, it removes it, records `blockedVersion`,
and returns to `current` or the embedded bundle. The old flat state record from
an older installer record is read as a current record and is rewritten as schema 2
after the next state change. This is installer-state compatibility, not a
product-data migration. A malformed state file is not guessed or silently
rewritten: the native gate uses the embedded bundle with `INVALID_STATE`, and
manual update calls return the same deterministic error.
Each cached reference also stores the runtime and minimum native version from
the signed metadata; a reference outside the installed native contract is not
selected.

## Launch decision

The installer returns one typed result:

| Result | Meaning | Action |
| --- | --- | --- |
| `remote-activated` | A newer bundle passed all checks. | Start that bundle. |
| `local-current` | Local verified bundle is current or remote is not newer. | Start local bundle. |
| `offline-local` | Remote check timed out or had no network. | Start newest verified local bundle. |
| `invalid-remote` | Metadata, signature, hash, size, or compatibility check failed. | Keep local bundle; log a reason code. |
| `embedded` | Clean install or invalid local installer state uses the embedded bundle. | Render `MainApp` with the embedded code and keep the reason code in diagnostics. |

The UI may provide retry for a failed remote check, but retry must call the same deterministic installer path. Do not activate an unverified file or silently ignore a failed first install.

The Settings screen has an expanded Android `Code updates` section. Data tools
keeps the same control collapsed as a secondary path. `Check for updates` and
`Download update` call the native bridge. JavaScript does not fetch, hash,
verify, or select a bundle. A downloaded update stays pending and the current
process continues to run its current bundle. The user is told to close and
reopen Yuzuha to apply it. A failed check does not remove a prepared update. A
valid pending version is also retained when the endpoint currently points to
an older release.

## Verification order

1. Parse JSON and reject unknown critical schema versions.
2. Validate all required fields and fixed values.
3. Compare versions and native compatibility.
4. Verify the metadata signature using the pinned public key.
5. Download with a timeout and bounded size.
6. Check actual byte size against `sizeBytes`.
7. Compute SHA-256 and compare to `sha256`.
8. Atomically move the verified bundle into its versioned private file.
9. Write a pending activation record without replacing the current bundle.
10. Select the pending bundle on the next launch and promote it only after the
    root health signal.

## Rollback

Keep the previous last-known-good bundle until the new bundle has started successfully and passed a startup health signal. If the new bundle fails that signal, mark its exact version bad in `blockedVersion`, restore the previous verified pointer, and expose a reason code for diagnostics. The same blocked version is not retried forever. Rollback must not erase user data or change database schema.

## Operational requirements

- Publish the bundle and metadata atomically from the release pipeline.
- Never overwrite an existing immutable version.
- Keep a signed release record with version, platform, runtime, hash, and build job.
- Monitor metadata availability and bundle download failures without collecting personal content.
- Test metadata shape with `npm run check-bundle` and a signed release record with `npm run ota-check -- <bundle.json>` before release.
- Build a bundle and signed metadata with `npm run ota-release -- --version <version>`. Supply `YUZUHA_OTA_PRIVATE_KEY_BASE64` from ignored CI/local secret storage; never commit it.

## Developer note: local data starts after bundle verification

Current data boundary: the money CSV undo pass raises the accepted app schema to 31 while repository schema remains 3. A fresh database seeds current payees, the Monday week-start default, and an empty latest-import receipt directly; old versions are rejected rather than upgraded.

The current weekday-aware periodic-money pass uses accepted app schema 33/repository schema 3 data. Weekday selections are local persisted data and change no installer metadata, bundle gate, cache rule, or startup work.

The next detailed provider description retains the prior pass wording for history; the current provider requires app schema 33 and repository schema 3 and rejects older data.

The provider inventory paragraph below is historical implementation wording. The current provider opens repository schema 3 and validates app schema 33 before `MainApp` is shown.

The current JavaScript path still checks the embedded bundle gate before mounting `AppStoreProvider`. The provider then opens the local SQLite repository, requires repository schema 2 and app schema 28, expands due money and task rules, copies any recurring-rule local reminder times into generated tasks, and synchronizes future open-task reminders through the current quiet-hours projection before `MainApp` receives the workspace. It also validates project references, task template fields and references, app-group records, focus-session states, task parent references, same-list parent links, parent cycles, task dependency references, cycles, and per-list task sort order before the workspace is shown. That synchronization is empty when the global `taskRemindersEnabled` flag is off. When the global flag is on, tasks linked to a recurring rule are also filtered by `recurringTaskRemindersEnabled`; one-off task reminders remain active when only the recurring flag is off. Both flags pause native alarms without deleting logical reminder timestamps, and turning them back on rebuilds future schedules. A current-schema validation, recurrence-expansion, project, template, app-group, focus-session, subtask, dependency, sort-order, or reminder-sync error is shown as a deterministic workspace error after the bundle has been verified; old schemas are rejected and are not guessed or upgraded. Restore also synchronizes the incoming projected reminder set before committing it, subject to both restored category flags.

The current Android gate runs once in `MainApplication` before the React host is created. It starts one background metadata request with 1.5-second connection/read bounds, validates Ed25519 metadata against the pinned public key, limits bundle downloads to 64 MiB and 5 seconds of read time, hashes bytes while writing a temporary file, writes a pending record, and only then selects the private bundle path. The root app reports launch health through `YuzuhaInstaller.markLaunchSuccessful`, which promotes the pending record to current. A valid but not newer release keeps the newest verified local bundle. Timeout or network failure keeps the newest verified candidate; invalid metadata, signature, compatibility, size, or hash keeps the same verified candidate. A failed pending launch is rolled back and its exact version is blocked. The Data tools screen can run the same native check and prepare a pending update while the current process continues. No retry loop or background update worker is started.

For Android 0.1.3, the embedded and native installer baseline is `0.1.3`; the current OTA bundle is `0.1.5` and requires native `0.1.3`. The release uses app schema 33 and repository schema 3, with no legacy bundle or data migration path.

## Developer note

This contract is a startup dependency. Any change to metadata fields, cache paths, version rules, verification, activation, timeout, or rollback must update `architecture.md`, `testing.md`, and `release.md` in the same change.
