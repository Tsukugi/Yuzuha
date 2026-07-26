# Analytics and operations

Status: Planned full-product operating model.

## Privacy-first telemetry

Telemetry is opt-in where it is not required for security or service operation. The product never sends note bodies, transaction descriptions or amounts, task details, raw app-usage records, attachment contents, recovery keys, or export files.

### Allowed operational events

- app start result: embedded, local, remote, offline, invalid, or blocked;
- crash and non-sensitive error code;
- bundle version, native version, platform, and installation channel;
- sync duration, item count, and reason code without plaintext content;
- migration duration and success/failure code;
- notification scheduling result;
- import/export size bucket and success/failure code, not content.

Users can view and reset diagnostics data. Event names and fields are versioned.

## Service goals

Target service objectives after synced mode launches:

- update metadata availability: 99.9% monthly;
- sync API availability: 99.9% monthly;
- successful valid-bundle activation: 99.5% of eligible update attempts;
- no known plaintext personal content in service storage or logs;
- incident acknowledgement within one business day for a confirmed data or security issue.

These are operating targets, not promises to users until the service is staffed and measured.

## Dashboards and alerts

Monitor:

- metadata errors and stale publishing;
- download failures by platform/runtime/reason code;
- signature or hash rejection rate;
- startup block rate;
- crash-free sessions and startup time;
- sync push/pull failures, cursor age, conflict rate, and outbox growth;
- migration failures by schema version;
- notification scheduling failures;
- import/export failure rate.

Alerts need an owner, threshold, runbook, and stop condition. Do not alert on raw user content.

## Support model

The app provides a redacted support package containing app version, native version, bundle status, platform capabilities, schema version, and recent reason codes. The user previews the package before sharing. It excludes all personal records and content.

Support cannot recover plaintext data from the service. For synced users, support can help with account/device status and documented recovery steps, but not decrypt content.

## Incident classes

| Class | Example | First action |
| --- | --- | --- |
| S0 | Active data exposure or unsafe code update | Disable affected service/update, page security owner, preserve evidence. |
| S1 | Widespread startup block or data loss risk | Stop rollout, activate rollback, publish user-facing status. |
| S2 | Major feature or sync outage | Keep local mode working, repair service, communicate limits. |
| S3 | Small defect or isolated support issue | Triage, document, and schedule a normal fix. |

## Change and audit policy

Production changes require an owner, review, rollback plan, and post-change check. Security, key, schema, installer, and sync changes require a second reviewer. Keep an audit trail for bundle publication, signing-key use, schema release, and account deletion requests.

## Data retention

Operational logs use the shortest useful retention and contain only redacted fields. Crash data is sampled and scrubbed. Deleted account ciphertext, device records, and operational references follow the published deletion policy and are not retained for product analytics.

