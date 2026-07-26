# Service API contract

Status: Planned contract for optional synced mode. The installer endpoint is defined separately in `installer.md`.

## Contract rules

- Base path is versioned, for example `/v1`.
- JSON is UTF-8 and uses stable field names.
- User record payloads are encrypted before they reach the service.
- Request IDs, idempotency keys, cursors, and opaque object IDs are safe for logs; plaintext content is not.
- Clients must tolerate added response fields and reject unknown critical schema versions.
- Every mutating request has a deterministic retry rule.

## Common headers

```text
Authorization: Bearer <session-token>
Content-Type: application/json
X-Client-Version: <native-or-js-version>
X-Device-Id: <opaque-device-id>
Idempotency-Key: <unique-request-key>
X-Request-Id: <client-generated-request-id>
```

Do not put recovery keys, note text, transaction data, or access tokens in query strings.

## Authentication and sessions

`POST /v1/auth/session` creates or refreshes a session. The response contains an access token, expiry, account ID, and a required action when the account needs recovery or device approval. Refresh tokens are stored only in protected native storage.

The service must support session revocation, rate limiting, suspicious-session review, and account deletion. Authentication errors use the same safe response shape so they do not reveal whether another account exists.

## Device endpoints

### `POST /v1/devices`

Registers a device after the client has created its key identity. The body contains device label, platform, app version, public device key, and an encrypted workspace-key envelope. It does not contain plaintext workspace data.

### `GET /v1/devices`

Returns device ID, label, platform, created time, last sync time, and revoked state. It does not return device secrets.

### `DELETE /v1/devices/{deviceId}`

Revokes a device. The request is idempotent. A revoked device receives `DEVICE_REVOKED` on future sync calls and must stop uploading.

## Sync push

### `POST /v1/sync/push`

Example shape:

```json
{
  "schema": 1,
  "workspaceId": "opaque-workspace-id",
  "baseCursor": "opaque-cursor",
  "changes": [
    {
      "changeId": "opaque-change-id",
      "objectId": "opaque-object-id",
      "objectType": "note",
      "baseRevision": 4,
      "operation": "update",
      "ciphertext": "base64-ciphertext",
      "deviceClock": 18
    }
  ]
}
```

The service validates authentication, device state, request size, change IDs, and cursor validity. It stores accepted encrypted changes and returns:

```json
{
  "schema": 1,
  "accepted": ["opaque-change-id"],
  "alreadyApplied": [],
  "rejected": [],
  "nextCursor": "opaque-cursor",
  "hasMore": false
}
```

Push must be safe to retry with the same idempotency key and change IDs.

## Sync pull

### `GET /v1/sync/pull?cursor=<opaque-cursor>`

Returns encrypted changes, tombstone envelopes, conflict hints, and the next cursor. The service may paginate. The client acknowledges application only after local transaction commit.

The server does not decide the user-visible merge for a money conflict. It can mark that a base revision diverged; the client creates the conflict record using the encrypted payloads.

## Backup and account deletion

Encrypted backups are created and restored by the client. The service does not receive a backup password or recovery key. `DELETE /v1/account` revokes sessions and devices, deletes account-side ciphertext and metadata according to the retention policy, and returns a request ID plus completion state.

## Error contract

```json
{
  "error": {
    "code": "CURSOR_EXPIRED",
    "message": "Sync must start from a fresh cursor.",
    "retryable": false,
    "requestId": "opaque-request-id"
  }
}
```

Stable error codes include:

- `AUTH_REQUIRED`;
- `DEVICE_REVOKED`;
- `WORKSPACE_NOT_FOUND`;
- `CURSOR_EXPIRED`;
- `PAYLOAD_TOO_LARGE`;
- `SCHEMA_UNSUPPORTED`;
- `RATE_LIMITED`;
- `CONFLICT_REQUIRES_CLIENT_RESOLUTION`;
- `SERVICE_UNAVAILABLE`;
- `ACCOUNT_DELETION_PENDING`.

The client retries only errors marked `retryable`, with bounded exponential backoff and a visible outbox state. It never retries authentication or schema errors forever.

## Versioning and compatibility

- Additive fields are backward-compatible when optional.
- Breaking payload changes require a new API or schema version.
- A client advertises supported schema versions during device enrollment and sync.
- The service keeps a compatibility window for supported app versions, documented in release notes.
- Sync encoding changes require fixtures for old clients, new clients, offline batches, conflicts, deletion, and recovery.

## API security gates

Before service launch, verify TLS, authentication, device revocation, replay protection, request limits, rate limits, error redaction, audit logs, account deletion, and the service’s inability to decrypt a client fixture without the key.

