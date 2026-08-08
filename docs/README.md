# Yuzuha documentation

This is the product and engineering baseline for Yuzuha. Core code exists through the Android summary widget, launcher shortcuts, strict local deep links, text/file share capture, the one-way task calendar draft, strict current-format money CSV import, current JSON export file restore, bounded encrypted-backup file opening, selected App Time period reports, selected Home dashboard periods, read-only period Reviews, local Money entry filters and filtered totals, and the native verified-remote-bundle startup gate, while later documents use clear labels for current behavior and planned behavior. The specification covers the full personal product, not only the first MVP.

The latest current-schema pass adds weekday-aware periodic money rules after the local note-link pass. It uses app schema 33 and repository schema 3; old versions remain intentionally rejected.

The current Money report pass adds derived period, type, category, and account filters with an explicit scope disclosure. Split-line categories are matched by stable IDs, transfers stay out of reports, and currencies remain separate.

## Read in this order

1. [Product plan](product-plan.md) - why the product exists, full scope, phases, metrics, and review questions.
2. [Full product specification](full-product-spec.md) - detailed behavior for each product area.
3. [Requirements](requirements.md) - behavior and acceptance criteria.
4. [Architecture](architecture.md) - runtime shape, module boundaries, and startup sequence.
5. [Data model](data-model.md) - local and sync entities, migrations, and time handling.
6. [Sync and backup](sync-and-backup.md) - optional account sync, encryption, conflict rules, and recovery.
7. [Notifications and automation](notifications-and-automation.md) - reminders, recurring work, budgets, and review prompts.
8. [Integrations](integrations.md) - Android/iOS entry points, widgets, imports, and exports.
9. [UX plan](ux.md) - screens, flows, empty states, and accessibility.
10. [Accessibility and localization](accessibility-and-localization.md) - inclusive interaction and language/region support.
11. [Security and privacy](security-and-privacy.md) - sensitive data handling and permissions.
12. [Installer contract](installer.md) - bundle metadata, verification, caching, and launch rules.
13. [Testing strategy](testing.md) - test levels, examples, and release gates.
14. [Code standards](codeStandards.md) - TypeScript, React Native, naming, and review rules.
15. [Implementation plan](implementation-plan.md) - phases, work slices, and definition of done.
16. [Release process](release.md) - native releases, JavaScript releases, rollback, and checklists.
17. [Analytics and operations](analytics-and-operations.md) - telemetry, SLOs, support, and incidents.
18. [API contract](api-contract.md) - sync service requests, responses, errors, and versioning.
19. [Traceability](traceability.md) - requirement families, authoritative documents, and evidence.
20. [Decision log](decision-log.md) - decisions that affect future work.
21. [v0.1.7 OTA release record](releases/v0.1.7.md) - latest color-palette OTA artifact, verification, and release boundary.
22. [v0.1.6 OTA release record](releases/v0.1.6.md) - previous OTA artifact and Settings flow record.
23. [v0.1.5 OTA release record](releases/v0.1.5.md) - previous OTA artifact and Settings rollout record.
24. [v0.1.3 release record](releases/v0.1.3.md) - current native APK artifact identity and release boundary.
25. [v0.1.2 release record](releases/v0.1.2.md) - previous artifact identity and release boundary.
26. [v0.1.0 release record](releases/v0.1.0.md) - earlier artifact identity and release boundary.

## Documentation rules

- Update the relevant document in the same change as the code or configuration change.
- Mark items as `Current`, `Planned`, or `Open decision`.
- Keep examples deterministic. A fallback must have a defined condition and a defined result.
- Do not store secrets, private user data, or production credentials in this tree.
