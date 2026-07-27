# Requirements traceability

Status: Traceability baseline through the Android JSON-file-restore pass.

## Authoritative source by concern

| Concern | Authoritative document | Evidence required |
| --- | --- | --- |
| Product scope and phases | `product-plan.md` | Accepted phase decision and product review. |
| Detailed user behavior | `full-product-spec.md` | Feature acceptance tests and UX review. |
| Requirement IDs | `requirements.md` | Automated or documented acceptance evidence. |
| Runtime and module boundaries | `architecture.md` | Code ownership, integration tests, and diagrams. |
| Local/sync schema | `data-model.md` | Migration, fixture, export, and conflict tests. |
| Sync API | `sync-and-backup.md`, `api-contract.md` | Two-device, retry, recovery, and security tests. |
| Notifications | `notifications-and-automation.md` | Scheduler and device behavior tests. |
| Integrations | `integrations.md` | Permission, revoke, offline, and platform tests. |
| Accessibility/localization | `accessibility-and-localization.md` | Screen-reader, large-text, RTL, and locale tests. |
| Privacy/security | `security-and-privacy.md` | Threat review, redaction tests, and release approval. |
| Bundle startup | `installer.md` | Installer matrix and release evidence. |
| Quality and operations | `testing.md`, `analytics-and-operations.md` | CI, device, service, incident, and rollback evidence. |

## Phase evidence matrix

| Phase | Product evidence | Engineering evidence | Release evidence |
| --- | --- | --- | --- |
| 0 Foundation | Scope and open decisions accepted. | Shell, database, migrations, typed errors, and installer tests. | Clean install, offline launch, and bad-bundle result. |
| 1 Core records | Money, notes, tasks, Home, app-time empty states. | Repository, query, export, delete, and device tests. | MVP release checklist and migration fixture. |
| 2 Planning and insight | Budgets, goals, reports, projects, recurrence, focus. | Reconciliation, timezone, dependency, and projection tests. | Data release notes and performance baseline. |
| 3 Capture and automation | Rich notes, links, reviews, reminders, integrations, and one-way dated-task calendar drafts. | Scheduler, search, attachment, calendar-boundary, permission, and accessibility tests. | Integration disclosures and notification rollback. |
| 4 Continuity | Sync, recovery, conflicts, backup, import. | Two-device, encryption, API, deletion, outage, current CSV import, and current JSON file restore tests. | Security review, service rollout, and recovery rehearsal. |
| 5 Maturity | iOS capability matrix, localization, support. | Performance, SLO, redaction, store, and incident tests. | Staged rollout and public support policy. |
| 6 Optional integrations | Provider/OCR/advanced automation decision. | Provider isolation and new threat model. | Separate legal, privacy, and rollback approval. |

## Requirement evidence rule

An item is complete only when its requirement row, source specification, implementation, test, and release gate agree. A green unit test does not prove permission, migration, accessibility, privacy, or rollback behavior unless that layer is tested too.

## Open decision register

Before a phase starts, move its open decisions into `decision-log.md` with an owner, choice, reason, consequence, and validation plan. Do not treat an unresolved decision as an implementation detail when it changes the data model, user promise, privacy boundary, or release process.
