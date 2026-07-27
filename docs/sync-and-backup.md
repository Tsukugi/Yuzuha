# Sync and backup

Status: Local password-encrypted and recovery-key backup/restore are implemented for text and document files. Account sync, device enrollment, attachments, and remote backup remain planned.

## Goals

- Keep local-first behavior when offline.
- Let a user continue on more than one device.
- Keep synced personal content encrypted so the service cannot read it.
- Make conflict behavior visible and reversible.
- Give the user a recovery path that does not depend on support staff seeing their data.

## Sync modes

| Mode | Account | Network | Data path |
| --- | --- | --- | --- |
| Local-only | No | Not required | Device only. |
| Sync paused | Yes | Not required | Local changes queue; no upload/download. |
| Synced | Yes | Needed for transfer | Encrypted change records move through the service. |
| Recovery | Yes or recovery key | Needed for new device setup | User proves ownership and restores encrypted data. |

## Account and device enrollment

1. The user chooses `Use sync` from the privacy center.
2. The app creates or signs into an account without uploading existing content before consent.
3. The device creates an encryption identity and a recovery key.
4. The user confirms the recovery key by re-entering a requested segment or scanning a printed/secondary copy.
5. The user chooses which local records to add to the synced workspace.
6. New devices are enrolled by QR code, recovery key, or an already trusted device.

Device revocation stops future sync for that device. It does not erase local data unless the user separately chooses remote wipe, and remote wipe is only best effort while the device is offline.

## Encryption model

The planned model is envelope encryption:

- each workspace has a data-encryption key;
- records and attachments are encrypted before upload;
- the workspace key is wrapped for each enrolled device;
- the recovery key can restore the workspace key;
- the service stores ciphertext, opaque IDs, size, version, and minimal routing metadata.

The local backup contract uses `@noble/ciphers` XChaCha20-Poly1305 and `@noble/hashes` scrypt. The backup stores a versioned header with scrypt parameters, a random 16-byte salt, a random 24-byte nonce, and authenticated ciphertext. The current mobile parameters are `N=32768`, `r=8`, `p=1`, and a 32-byte key. Secure randomness comes from `react-native-get-random-values`. The app does not store the password. Do not invent cryptography or write a custom cipher.

## Change protocol

Each local change has:

- change UUID and idempotency key;
- object UUID and object type;
- base object revision;
- operation (`create`, `update`, `delete`);
- encrypted payload;
- device ID and logical clock;
- created time.

The service accepts encrypted changes, deduplicates by change UUID, and returns an acknowledgement plus a cursor. Clients pull changes after a cursor and apply them in a transaction.

## Conflict rules

- Deletes create tombstones. A late update cannot resurrect a deleted object without an explicit restore action.
- Notes and tasks use field-level merge only for independent fields. If the same field changed on two devices, keep a conflict revision and ask the user to choose.
- Money transactions never silently merge. Same-object conflicts create a visible conflict copy with both versions and a resolution action.
- Budgets, recurrence rules, settings, and device configuration use explicit conflict screens when changes overlap.
- Applying the same change twice has no additional effect.
- A sync failure never blocks local creation or editing unless the encrypted local database cannot be opened.

## Offline outbox

The outbox is encrypted at rest and bounded. When full, the app stops adding new sync changes, keeps local data, and asks the user to sync or export. A failed change has a stable reason and retry policy; the app does not loop forever.

## Backup and restore

### Export backup

The user can create a password-encrypted Yuzuha backup containing the current versioned JSON workspace. The app can share the encrypted text through the Android system sheet or save an encrypted JSON file through the system document picker. The password is not stored and the backup is never uploaded automatically. The saved file is a portable JSON envelope with the same authenticated header and ciphertext as the text flow.

### Local recovery-key backup

The user can generate a separate recovery-key backup from Data tools. The key is 32 secure random bytes shown as eight uppercase hexadecimal groups. The user must re-enter it before the backup can be saved. The key is not stored locally, logged, or uploaded. The recovery backup uses the same authenticated envelope and scrypt parameters, with a `recovery-key` credential marker and a distinct file name. Restore accepts the grouped or ungrouped form and normalizes it before key derivation. This is local backup portability only; it does not enroll a device, recover a sync account, or provide support-assisted password recovery.

### Platform backup

Android and iOS backup behavior is platform-specific. The app must state whether backups include records, encryption keys, usage snapshots, and cached bundles. A platform restore must run migrations and integrity checks before opening the main UI.

### Restore flow

Encrypted restore can use pasted text or a selected JSON file. It derives the key from the entered password, authenticates and decrypts the complete export, runs the existing migration and integrity checks, previews record counts, and commits only after confirmation. If the picker is canceled, the app keeps the current screen; if authentication, validation, or commit fails, the existing workspace remains unchanged. Restored records retain their stable IDs; duplicate IDs are rejected by the current JSON validation contract.

## API surface

The sync service is separate from the installer service. Planned endpoints are:

- `POST /v1/auth/session` - create or refresh an account session;
- `POST /v1/devices` - enroll a device using an encrypted key envelope;
- `GET /v1/devices` - list device metadata;
- `DELETE /v1/devices/{id}` - revoke a device;
- `POST /v1/sync/push` - submit encrypted changes with idempotency keys;
- `GET /v1/sync/pull?cursor=...` - retrieve encrypted changes and the next cursor;
- `POST /v1/workspace/recovery` - begin a recovery flow without receiving plaintext content;
- `DELETE /v1/account` - delete account-side ciphertext and device records.

All endpoints require authentication, rate limits, request size limits, replay protection, and audit-safe logs. API details are not a license to place plaintext content in request logs.

## Sync acceptance gates

- Two devices converge after create, edit, delete, and restore operations.
- Replaying a batch is safe.
- Offline edits survive process death and restart.
- Conflicts are visible and resolvable.
- Lost-device revocation works after the service receives it.
- Recovery succeeds with a valid recovery key and fails safely with an invalid one.
- The service cannot decrypt a test fixture without the client key.
