# Yuzuha documentation

This is the product and engineering baseline for Yuzuha. Core code exists through the Android summary widget, launcher shortcuts, strict local deep links, text/file share capture, the one-way task calendar draft, strict current-format money CSV import, current JSON export file restore, bounded encrypted-backup file opening, selected App Time period reports and derived usage analysis, selected Home dashboard periods, read-only period Reviews, local Money Year/Custom filters and chronological history, Android OS date/time dialogs for local date fields, and the native verified-remote-bundle startup gate, while later documents use clear labels for current behavior and planned behavior. The specification covers the full personal product, not only the first MVP.

The latest current-schema pass adds weekday-aware periodic money rules after the local note-link pass. It uses app schema 33 and repository schema 3; old versions remain intentionally rejected.

The current Money report pass adds derived period, type, and category filters, plus an account filter when multiple active accounts make that choice meaningful. With one active account it uses the all-accounts scope automatically. The report has an explicit scope disclosure; split-line categories are matched by stable IDs, transfers stay out of reports, and currencies remain separate.

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
10. [UI standardization](ui-standardization.md) - shared sizes, theme roles, controls, layout, flow, and quality gates.
11. [Accessibility and localization](accessibility-and-localization.md) - inclusive interaction and language/region support.
12. [Security and privacy](security-and-privacy.md) - sensitive data handling and permissions.
13. [Installer contract](installer.md) - bundle metadata, verification, caching, and launch rules.
14. [Testing strategy](testing.md) - test levels, examples, and release gates.
15. [Code standards](codeStandards.md) - TypeScript, React Native, naming, and review rules.
16. [Implementation plan](implementation-plan.md) - phases, work slices, and definition of done.
17. [Release process](release.md) - native releases, JavaScript releases, rollback, and checklists.
18. [Analytics and operations](analytics-and-operations.md) - telemetry, SLOs, support, and incidents.
19. [API contract](api-contract.md) - sync service requests, responses, errors, and versioning.
20. [Traceability](traceability.md) - requirement families, authoritative documents, and evidence.
21. [Decision log](decision-log.md) - decisions that affect future work.
22. [Backlog](Backlog.md) - open bugs, improvements, and planned work.
23. [Resolved backlog](BacklogResolved.md) - completed backlog items with evidence.
24. [v0.1.10 OTA release record](releases/v0.1.10.md) - latest current-schema OTA artifact, verification, and release boundary.
25. [v0.1.9 native release record](releases/v0.1.9.md) - current Android APK artifact identity and native compatibility boundary.
26. [v0.1.8 OTA release record](releases/v0.1.8.md) - previous OTA artifact, verification, and release boundary.
27. [v0.1.6 OTA release record](releases/v0.1.6.md) - previous OTA artifact and Settings flow record.
28. [v0.1.5 OTA release record](releases/v0.1.5.md) - previous OTA artifact and Settings rollout record.
29. [v0.1.3 release record](releases/v0.1.3.md) - previous native APK artifact identity and release boundary.
30. [v0.1.2 release record](releases/v0.1.2.md) - previous artifact identity and release boundary.
31. [v0.1.0 release record](releases/v0.1.0.md) - earlier artifact identity and release boundary.

## Documentation rules

- Update the relevant document in the same change as the code or configuration change.
- Mark items as `Current`, `Planned`, or `Open decision`.
- Keep `docs/Backlog.md` synchronized with implementation and release records.
- Keep examples deterministic. A fallback must have a defined condition and a defined result.
- Do not store secrets, private user data, or production credentials in this tree.
