# Android bundle and APK installer contract

Status: `YZ-012` is published. Recovery `0.1.11` and native `0.2.0` are public. API 35 emulator tests prove signed-package replacement with preserved workspace, the real non-root Android installer UI, and controlled root installation. A physical Pixel remains unverified.

The current project OTA trust anchor is a fresh Ed25519 key. Its public-key
SHA-256 fingerprint is
`cf181636d6a4ee260f4739a3239c1eb17dd72dcb2bd9c93ad5c74f59a7b28f5e`; the
private key is outside the repository. A new APK is required for this pin to
reach devices.

The Android `localTest` build type is a device-smoke variant only. It uses the
application ID `dev.yuzuha.localtest`, signs with the debug key, selects the
embedded bundle, and disables metadata and bundle downloads through the typed
`YUZUHA_LOCAL_BUNDLE_ONLY` build flag. It keeps its own app data and cannot
change the production `dev.yuzuha` installer behavior. Native tests prove that
the variant does not fetch remote metadata or download an OTA bundle.

## Purpose

The native shell ships an embedded JavaScript bundle. Before `MainApp`, it checks its compatibility-line bundle feed and may select only verified same-line code. After React launch health is reported, native `0.2.0` and later check a separate signed native-release feed. A cross-line release downloads the latest patch APK directly.

## Remote endpoint

Bundle metadata URLs are compatibility-line assets:

```text
https://github.com/Tsukugi/Yuzuha/releases/latest/download/bundle.json       # legacy native 0.1.3
https://github.com/Tsukugi/Yuzuha/releases/latest/download/bundle-0.2.json   # native 0.2.x
```

Each later native line uses its own `bundle-<major>.<minor>.json`. A new minor release must not replace an older line's asset with incompatible metadata. The separate `android-update.json` latest asset points to the newest release's complete APK. All endpoints use HTTPS and immutable release URLs and require no user identity.

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
- `minNativeVersion` must have the same major/minor line as the installed native version.
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

The Settings screen has a dedicated Android `Code updates` detail and is the
only UI owner of the update controls. `Check for updates` and
`Download update` call the native bridge. JavaScript does not fetch, hash,
verify, or select a bundle. A downloaded update stays pending and the current
process continues to run its current bundle. The user is told to close and
reopen Yuzuha to apply it. A failed check does not remove a prepared update. A
valid pending version is also retained when the endpoint currently points to
an older release.

## Verification order

1. Parse JSON and reject unknown critical schema versions.
2. Validate all required fields and fixed values.
3. Verify the metadata signature using the pinned public key.
4. Compare versions and native-line compatibility. A verified incompatible release reports `NATIVE_UPDATE_REQUIRED`; it is not mislabeled as a bad signature.
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

## Native APK updates

Every release version has both a complete signed APK and a bundle. A native-incompatible change starts the next minor at patch zero. A same-line device prefers OTA; an older-line device reads `android-update.json` and installs the latest patch APK directly. For example, `0.2.8` installs APK `0.3.4`, while an installed `0.3.x` shell uses bundle `0.3.4`.

Before any install action, native code verifies the manifest signature using the bundled Bouncy Castle Ed25519 provider, bounded size, exact SHA-256, archive package `dev.yuzuha`, version name and increasing version code, and the installed release signer certificate. It stores only the verified APK below `filesDir/installer/apk`. A successful bounded Magisk `su -c` or AOSP `su 0 sh -c` uid-0 probe selects fixed `pm install -r`; otherwise a one-file FileProvider grant opens Android's installer. A failed root install reports an error and does not start a second installer over ambiguous package state.

Native `0.1.3` cannot gain this bridge through OTA. Recovery `0.1.11` restores its valid bundle feed and links to the latest release for one manual bootstrap. See `docs/android-updates.md` for the complete policy and auto-grill.

## Developer note: local data starts after bundle verification

Current data boundary: the accepted app schema is 33 and the repository schema is 3. A fresh database seeds current payees, the Monday week-start default, and an empty latest-import receipt directly; old versions are rejected rather than upgraded.

The current weekday-aware periodic-money pass uses accepted app schema 33/repository schema 3 data. Weekday selections are local persisted data and change no installer metadata, bundle gate, cache rule, or startup work.

The next detailed provider description retains the prior pass wording for history; the current provider requires app schema 33 and repository schema 3 and rejects older data.

The provider inventory paragraph below is historical implementation wording. The current provider opens repository schema 3 and validates app schema 33 before `MainApp` is shown.

The current JavaScript path still checks the embedded bundle gate before mounting `AppStoreProvider`. The provider then opens the local SQLite repository, requires repository schema 3 and app schema 33, expands due money and task rules, copies any recurring-rule local reminder times into generated tasks, and synchronizes future open-task reminders through the current quiet-hours projection before `MainApp` receives the workspace. It also validates project references, task template fields and references, app-group records, focus-session states, task parent references, same-list parent links, parent cycles, task dependency references, cycles, and per-list task sort order before the workspace is shown. That synchronization is empty when the global `taskRemindersEnabled` flag is off. When the global flag is on, tasks linked to a recurring rule are also filtered by `recurringTaskRemindersEnabled`; one-off task reminders remain active when only the recurring flag is off. Both flags pause native alarms without deleting logical reminder timestamps, and turning them back on rebuilds future schedules. A current-schema validation, recurrence-expansion, project, template, app-group, focus-session, subtask, dependency, sort-order, or reminder-sync error is shown as a deterministic workspace error after the bundle has been verified; old schemas are rejected and are not guessed or upgraded. Restore also synchronizes the incoming projected reminder set before committing it, subject to both restored category flags.

The current Android gate runs once in `MainApplication` before the React host is created. It starts one background metadata request with 1.5-second connection/read bounds, validates Ed25519 metadata against the pinned public key, limits bundle downloads to 64 MiB and 5 seconds of read time, hashes bytes while writing a temporary file, writes a pending record, and only then selects the private bundle path. The root app reports launch health through `YuzuhaInstaller.markLaunchSuccessful`, which promotes the pending record to current. A valid but not newer release keeps the newest verified local bundle. Timeout or network failure keeps the newest verified candidate; invalid metadata, signature, compatibility, size, or hash keeps the same verified candidate. A failed pending launch is rolled back and its exact version is blocked. Settings Code updates can run the same native check and prepare a pending update while the current process continues. No retry loop or background update worker is started.

The current public pairing is recovery `0.1.11` for native `0.1.3` and native
updater `0.2.0` with version code `7`, embedded bundle `0.2.0`,
`bundle-0.2.json`, and `android-update.json`. The latest `bundle.json` is
deliberately preserved at recovery `0.1.11` for the legacy shell. Emulator
installer evidence is recorded in `testing.md`; physical Pixel validation
remains open. The release uses app schema 33 and repository schema 3, with no
legacy product-data migration path.

## Developer note

This contract is a startup dependency. Any change to metadata fields, cache paths, version rules, verification, activation, timeout, or rollback must update `architecture.md`, `testing.md`, and `release.md` in the same change.

## Native 0.3.0 icon baseline

The release prepared on 28.10.2026 starts native 0.3 with embedded version
0.3.0 and bundle-0.3.json. The APK includes MaterialDesignIcons.ttf and its
native library. Metro uses the static icon entry so OTA has no font asset.
Native 0.2.x receives the complete 0.3.0 APK through android-update.json;
its bundle-0.2.json feed and legacy bundle.json remain preserved. Trust key,
metadata schemas, private cache and startup verification rules are unchanged.
See [release record](releases/v0.3.0.md).
