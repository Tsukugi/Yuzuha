# Android update channels

Status: Published under `YZ-012`. GitHub `v0.1.11` is the native-`0.1.3`
recovery release and `v0.2.0` is the native updater baseline. API 35 emulator
tests cover package replacement, workspace preservation, the real non-root
system installer, and a controlled root install. Physical Pixel validation
remains open.

## Problem

Yuzuha published JavaScript bundle `0.1.10` as the global latest OTA even
though it requires native APK `0.1.9`. Existing installations running native
`0.1.3` and bundle `0.1.8` reject that metadata. The old UI reports the whole
native validation failure as invalid metadata or signature, so it hides the
real compatibility requirement.

One mutable `latest` pointer cannot safely serve both native compatibility
lines. An OTA release must never require a native bridge that is absent from
the APK accepting that OTA.

## Version rule

Yuzuha versions use semantic version components as an update contract:

- A native-incompatible release increments the minor component and resets the
  patch component to zero. The next incompatible line starts at `0.2.0`.
- JavaScript-only releases keep the installed native line's major and minor
  components and increment the patch component: `0.2.1`, `0.2.2`, and so on.
- A bundle metadata record is compatible only when its required native
  major/minor line is installed. Release tooling must reject an OTA version
  whose major/minor line differs from that native line.
- Every release publishes a complete signed APK, including patch releases.
  `0.2.3` therefore has both an APK and an OTA bundle. The APK carries an
  increasing Android version code and embeds bundle `0.2.3`.
- A major release such as `1.0.0` starts a new native line. After `1.0.0`,
  `1.0.1` is available as both an OTA and a full APK, while `1.1.0` starts the
  next incompatible line.
- A device already on the release's major/minor line prefers the smaller OTA.
  A device on an older major/minor line downloads the latest release's APK
  directly. It does not install patch zero first.

The native release command requires `--release-kind native-baseline` or
`--release-kind compatible-patch`. A native baseline is accepted only when the
patch is zero; a compatible patch is accepted only when the patch is greater
than zero. This forces the release author to classify the change and prevents
a declared native baseline such as `0.3.4` from being staged.

`0.1.9` and `0.1.10` remain historical published versions. New releases use
the rule above; their historical names are not rewritten.

## Legacy recovery release

`0.1.11` is the final JavaScript OTA for native `0.1.3` and also has its own
complete APK. Its bundle must be built and tested without requiring the
date/time picker and Usage Access behavior added after native `0.1.3`. Its job
is to restore a valid OTA response for installed `0.1.3` shells and explain
the next native-line transition accurately.

Native `0.1.3` cannot securely launch Android's package installer for a file
downloaded by JavaScript. Its existing FileProvider exposes only validated
note attachments, rejects the APK MIME type, and does not grant an APK URI to
the package installer. OTA code cannot add a native module, manifest
permission, provider path, or root command boundary. Therefore `0.1.11`
cannot honestly claim automatic APK installation. It may present the signed
`0.2.0` GitHub release link, but installing `0.2.0` is the one-time bootstrap
step for devices on native `0.1.3`.

This limitation applies only to the legacy transition. It must not be hidden
behind a signature error or an unusable downloaded APK.

## Native update manifest

Native `0.2.0` introduces a separate signed Android native-release manifest.
The bundle OTA metadata remains a compatibility-line asset; it is not reused
as APK metadata.

The native manifest contains:

- exact schema, app ID, platform, release version, and version code;
- immutable HTTPS GitHub Release APK URL;
- exact APK byte size and lowercase SHA-256;
- expected application ID and release signer certificate SHA-256;
- publication timestamp and Ed25519 signature.

The signature covers every field in a fixed canonical order. The private key
stays outside the repository. Native code pins the public key.

## Automatic native update flow

From native `0.2.0` onward, Android follows this deterministic flow when the
latest release is on a newer major/minor line:

1. Fetch the signed native-release manifest once during startup.
2. Prefer bundle OTA when the latest release is on the installed major/minor
   line. Continue below only when the latest release is on a newer line.
3. Ignore an equal or older version code.
4. Download the latest release's APK automatically to app-private installer
   storage. For example, `0.2.8` installs APK `0.3.4` directly when `0.3.4` is
   latest.
5. Enforce the byte limit, exact size, SHA-256, package ID, version name,
   increasing version code, and same release signing certificate. Ed25519
   metadata verification uses the app-bundled Bouncy Castle provider because
   Android API 35 does not expose a software Ed25519 provider.
6. Keep the current application and product data unchanged on any failure.
7. After the main activity is available, try the root installer path.
8. If a bounded `su` probe succeeds, run `pm install -r` with the fixed,
   verified private APK path. No user input is requested.
9. If root is unavailable or denied, grant one FileProvider URI and open
   Android's standard package installer immediately. Android owns the install
   confirmation and any `Install unknown apps` permission screen; Yuzuha does
   not add a second confirmation.

Root is an optimization, not a trust boundary. Android's package manager must
still accept the APK signature and application ID. A failed root install does
not silently fall through after an ambiguous partial result; it reports the
named failure and allows an explicit retry through the standard installer.

The app never installs an unverified APK, never downloads executable code in a
polling worker, and never uses a remote shell command or metadata-controlled
filesystem path.

## Release feeds

- Legacy native `0.1.3` continues using the existing `bundle.json` latest
  asset and receives compatible `0.1.11`.
- Native `0.2.0` and later use a native-release manifest that points to the
  latest release's complete APK and a compatibility-line bundle feed for
  JavaScript OTA discovery.
- Every published version has an APK. A patch APK is used for clean install or
  a direct cross-line upgrade even though same-line installed devices use OTA.
- Publishing a new native minor must not replace an older line's bundle feed
  with incompatible metadata.

Release tooling and the release checklist must validate both feeds before a
release is described as available.

## Auto-grill

These questions challenge the update design. Their answers are part of the
contract, not optional implementation advice.

### Can a patch release contain a native change if the change is small?

No. Change size is irrelevant. Any new Android module, manifest entry,
permission, resource, bundled native library, React Native runtime, or native
configuration requires the next major/minor baseline with patch zero. A native
bug fix after `0.2.7` is `0.3.0`, not `0.2.8`.

### Can a patch release be published as both APK and OTA with the same version?

Yes, and it must be. The artifacts are two delivery forms of the same product
release: APK `0.3.4` embeds bundle `0.3.4`, while OTA `0.3.4` contains that
same JavaScript release for already-compatible `0.3.x` shells. Their metadata
identifies the artifact type, hash, and size separately.

### What if a JavaScript change alters the product-data schema?

A schema change is not automatically native, but it can make OTA rollback
unsafe. A patch OTA may change schema only when forward migration and rollback
behavior are explicitly supported and tested. Publishing the mandatory patch
APK does not make an old shell's embedded rollback bundle compatible. Under
Yuzuha's current latest-only, no-migration boundary, a schema-changing patch
must wait until rollback safety exists; a version label must not bypass that
rule.

### How does `0.2.x` update when `0.3.4` is latest?

The native-release feed points directly to APK `0.3.4`, because every release
has a full APK. The `0.2.x` shell verifies and installs `0.3.4` once. It does
not install `0.3.0` and then replay `0.3.1` through `0.3.4`. A shell already
on `0.3.x` uses OTA `0.3.4` instead.

### Must devices install every intermediate APK baseline?

No, unless a release explicitly declares that requirement. An older shell may
install the newest signed APK directly only when the newest APK accepts its
current version code and all intervening product-data migrations are tested.
If direct upgrade is unsafe, the manifest must name the required next APK;
the installer must not guess an upgrade chain.

### What happens to a cached old-line OTA after an APK upgrade?

The new embedded version is authoritative. A cached bundle from an older
major/minor line is rejected and removed from selection even if its file and
signature were valid for the previous APK. The new shell then checks only its
own compatibility-line bundle feed.

### Can the OTA signing key authorize an arbitrary APK?

No. The metadata signature authenticates release instructions, but APK trust
also requires the installed production package ID and signing certificate.
Compromise of the OTA metadata key alone must not authorize a differently
signed APK. Signing-key rotation needs a separate, tested Android signer-lineage
decision.

### Does root bypass APK verification?

No. The exact downloaded bytes are verified before root is probed. The archive
package, version, version code, and signer are verified before `pm install`.
Android's package manager performs its own signature check as well. Metadata
never supplies command text or a filesystem path.

### What counts as root being available?

A `su` binary existing is not enough. A bounded, non-interactive probe must
finish successfully and identify uid 0. The updater supports the common
Magisk `su -c <command>` form and the AOSP/userdebug `su 0 sh -c <command>`
form. A denial, timeout, missing binary, or non-root result means root is
unavailable and selects the standard Android installer. If the probe succeeds
but `pm install` later fails or times out, the result is an explicit
root-install failure; the app does not start a second installer over a
possibly changing package state.

### Can non-root installation require no user interaction?

No. Android requires the system package installer and may require both the
`Install unknown apps` grant and install confirmation. Yuzuha automatically
downloads, verifies, and opens that system flow without an extra in-app
confirmation. It must not claim silent non-root installation.

### What if the network is metered or storage is low?

The requested behavior is automatic download, so the first implementation
does not add a Wi-Fi-only preference. It performs one bounded attempt, enforces
the signed size before and during transfer, checks available app-private
storage before writing, and reports a named failure. It does not retry in a
loop or leave partial APK files.

### What if the user cancels the system installer?

The verified APK may remain cached for an explicit retry, but Yuzuha must not
reopen the installer repeatedly during the same foreground session. The next
cold start may check again and offer the system flow once. Product data is not
changed.

### Can `0.1.11` fully automate the jump from native `0.1.3`?

No. That would require native functionality absent from `0.1.3`. A bundle can
download bytes, but it cannot add the manifest permission, safe FileProvider
APK path, URI grant, archive/signing inspection, or bounded root process
runner. Treating a public file URL or `file://` intent as equivalent would
weaken verification and still would not reliably open Android's installer.
The one-time `0.1.3` to `0.2.0` bootstrap therefore needs the existing Android
browser/package-installer path. Every later baseline update is handled by the
native updater added in `0.2.0`.

### Could `0.1.11` silently pretend the device is current?

No. It must stop the false signature warning and say that native `0.2.0` is
required. It may open the immutable signed release page, but it must not label
the APK installed, prepared, or verified by Yuzuha when native `0.1.3` cannot
perform those checks.

## Validation target

Completion requires tests proving:

- version-line acceptance and rejection for native and OTA releases;
- signed native manifest parsing and canonical signature verification;
- bounded APK download, exact hash/size, package/version, and signer checks;
- no install action for invalid, equal, or older APKs;
- silent root installation only after a successful root probe;
- standard installer intent with a one-file read grant when root is absent;
- deterministic reporting for root failure, missing unknown-source access,
  canceled installation, and unavailable network;
- `0.1.11` contains no call to a bridge missing from native `0.1.3`;
- `0.2.0` preserves the workspace when installed over the signed production
  package.

Device proof needs one non-root Android run and one controlled rooted emulator
run. Unit tests alone do not prove either installer UI or root behavior.
