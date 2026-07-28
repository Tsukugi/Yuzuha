# Release process

Status: Current Android native release process. The release APK is signed with a private non-debug keystore, uploaded as a GitHub Release asset, and kept separate from the source repository. Keystores, signing properties, and passwords are never committed.

## Current pass release notes

The latest-only entry below supersedes compatibility statements in older historical pass notes. Those older entries describe behavior before the app had a public release.

## Current Android release procedure

Use the `Tsukugi/Yuzuha` GitHub repository and a `v<package-version>` tag. The release APK must be built from a clean committed tree with the current Java/React Native toolchain, and its SHA-256 must be recorded in the release notes and checked against the uploaded GitHub asset.

1. Configure the private signing key through ignored `android/keystore.properties` or the four `YUZUHA_RELEASE_*` environment variables.
2. Run `npm run test -- --runInBand`, `npm run typecheck`, `npm run lint`, and `npm run check-bundle`.
3. Run `android\gradlew.bat :app:assembleRelease --no-daemon --max-workers=2 --offline` with Java 17.
4. Inspect the APK signer and reject any APK signed by `Android Debug`.
5. Copy the APK to an ignored release staging path, calculate SHA-256 and byte size, and install that exact file on the emulator and phone for smoke checks.
6. Commit source and documentation changes, push the branch, and create the GitHub Release with `gh release create v<version> <apk> --title ... --notes-file ...`.
7. Download or inspect the published asset and compare its byte size and SHA-256 with the local release record.

The release process does not auto-commit, auto-push, generate a new signing key, or publish import/export changes. Rapunzel's `v<version>` tag and APK asset convention is used as a reference; its older automatic release script is not copied into Yuzuha.

2026-07-28 Android Money graphs and theme pass:

- added pure split-aware Money chart data for category spending and local daily income/spending, with the current Money filters and separate currencies preserved;
- rendered lightweight React Native bar charts without adding a native chart dependency;
- added System, Light, and Dark theme tokens across startup, shell, Money, forms, lists, and secondary screens. System follows Android `useColorScheme`; manual Light/Dark overrides are temporary and do not change AppData;
- kept Home to the compact Money widget and kept Money list-first: balance/activity, current entries, Add money entry, then graphs;
- typecheck, lint, diff checks, 52 Jest suites/231 tests, signed Java 17 release build, Xiaomi install, Money hierarchy smoke in system light/dark modes, and filtered logcat checks passed. Xiaomi still rejects adb touch injection; no GitHub release was created for this local UI pass.

2026-07-28 Android Notes UX pass:

- kept Notes list-first and made search visible on entry, with All/Pinned/Archived chips, pinned/recent sections, compact tappable note cards, and one floating Add note action;
- moved attachments, links, task conversion, pin/archive, and delete behind the card's More action so the current list is easier to scan;
- preserved the existing note form, attachments, links, saved searches, and note-to-task behavior; no schema, migration, network request, worker, or background process changed;
- typecheck, lint, diff checks, 52 Jest suites/231 tests, signed Java 17 release build, Xiaomi light/dark screenshots, launcher add-form smoke, and filtered logcat checks passed. Local APK SHA-256: `F21879B74F871B0DA6CD317EC2DBBCBD7DF06CB05E4671F46E36B27AF11106FB`. No GitHub release was created for this local UI pass.

2026-07-28 Android Tasks UX pass:

- kept Tasks list-first and added All/Today/Upcoming/Completed tabs, Today/Upcoming/no-date sections, a compact overview, compact task rows, and one floating Add task action;
- moved Task tools, Agenda, Overdue, sorting, reminders, dependencies, projects, templates, lists, and recurrence below the primary task dashboard;
- preserved existing task records, completion, reminders, calendar draft, projects, dependencies, templates, lists, recurrence, and edit behavior; no schema, migration, network request, worker, or background process changed;
- typecheck, lint, diff checks, 52 Jest suites/231 tests, signed Java 17 release build, Xiaomi light/dark screenshots, launcher add-form smoke, and filtered logcat checks passed. Local APK SHA-256: `14BB448A7D26D8E958AFA0FDA8F46A998115278BD084DFBD8F77AB433D6FC4BA`. No GitHub release was created for this local UI pass.

2026-07-28 Android Money/Home reference UI pass:

- removed the Yuzuha title, description, and bundle label from the React shell and startup content;
- replaced the Home capture-heavy layout with one derived Money widget showing main-currency balance and selected-period spending/income;
- added the reference-style Money balance/activity card while keeping current entries and Add money entry as the first Money workflow;
- removed the duplicate entry list from the open Money form so the form contains only the fields needed to save;
- changed only local layout, styling, and derived view state; no schema, migration, import/export format, network request, worker, or background process changed;
- typecheck, lint, diff checks, 51 Jest suites/229 tests, signed Java 17 release build, Xiaomi install, cold/warm Money hierarchy smoke, and filtered logcat checks passed. Xiaomi still rejects adb touch injection, so arbitrary touch testing remains manual; no GitHub release was created for this UI-only pass.

2026-07-28 Android UI simplification pass:

- the primary capture and query controls remain visible while optional filters, settings, management, formatting, restore/import actions, focus tools, and task tools move behind labeled disclosures;
- Money, Notes, and Tasks now open on their current list/view and show a separate Add action before rendering the form; Home Quick capture opens those forms directly, while normal navigation remains list-first;
- the Money form keeps type, amount, category, and account visible; Notes keeps title/body visible and moves formatting/tags into More note details; Tasks keeps title/save visible and keeps optional fields under Task details;
- Data tools starts with export, import, restore, and delete sections closed, matching the current decision to keep import/export out of the primary flow;
- the pass changes only local view state and layout; no schema, import/export format, network request, worker, or background process changed;
- typecheck, lint, diff checks, signed Java 17 release build, APK signer/version inspection, prior emulator screen smoke, and final Xiaomi install/startup passed; Xiaomi rejects adb touch injection, so manual tapping remains required for the final Add-to-form interaction check; no GitHub release was created for this UI-only pass.

2026-07-28 Android budget-search-focus pass:

- budgets now have local edit controls using the existing budget validation and store boundary;
- Global Search budget results pass their stable ID through the Money budget focus path and open the matching budget in edit mode;
- updating a budget preserves its stable ID and archive state while replacing only validated editable fields;
- no schema, permission, import/export UI, network request, worker, or background process changed;
- focused budget lifecycle/navigation tests, full Jest (51 suites, 229 tests), lint, typecheck, bundle validation, Java 17 / two-worker release build, emulator budget create/search/edit/delete smoke, and phone cold-start process/activity smoke passed; the phone rejects automated touch input, and both devices were force-stopped.

2026-07-28 Android v0.1.0 release:

- release signing now requires a private non-debug keystore from ignored local configuration or `YUZUHA_RELEASE_*` environment variables;
- Android `versionName` is `0.1.0`, matching the embedded bundle version, with version code `1`;
- the release APK is staged as `Yuzuha-0.1.0.apk` and its SHA-256 is `317B7C8C0C64F6D413B1B66034DED41A452A13842C3F66307D7C9C754E1D7D98`;
- full tests, static checks, signed release build, APK signature inspection, clean emulator install, and clean phone startup passed;
- the exact release record is in [`docs/releases/v0.1.0.md`](releases/v0.1.0.md), and the published release is [Tsukugi/Yuzuha v0.1.0](https://github.com/Tsukugi/Yuzuha/releases/tag/v0.1.0);
- the downloaded GitHub asset matched the local APK byte-for-byte: 67,352,639 bytes and SHA-256 `317B7C8C0C64F6D413B1B66034DED41A452A13842C3F66307D7C9C754E1D7D98`.

2026-07-28 Android app-group-search-focus pass:

- app groups now have local edit controls using the existing `updateAppGroup` store action;
- Global Search app-group results pass their stable ID through the App Time focus path and open the matching group in edit mode;
- deleting the currently focused group clears the editor and selected group instead of retaining deleted values;
- no schema, permission, import/export UI, network request, worker, or background process changed;
- focused navigation and app-group lifecycle tests, full Jest (51 suites, 228 tests), lint, typecheck, bundle validation, Java 17 / two-worker release build, emulator app-group-focus/delete smoke, and phone cold-start process/activity smoke passed; the phone rejects automated touch input, and both devices were force-stopped.

2026-07-28 Android task-list-search-focus pass:

- Global Search task-list results now pass their stable ID through the existing Tasks rename focus path and open the matching list in rename mode;
- money, note, task, project, and task-template results keep exact focus, while account, category, transfer, split, budget, recurrence, template-adjacent, app-time, and other results keep owning-tab-only behavior;
- no schema, permission, import/export UI, network request, worker, or background process changed;
- focused list-navigation tests, full Jest (51 suites, 227 tests), lint, typecheck, bundle validation, Java 17 / two-worker release build, emulator task-list-focus smoke, and phone cold-start process/activity smoke passed; the phone rejects automated touch input, and both devices were force-stopped.

2026-07-28 Android template-search-focus pass:

- Global Search task-template results now pass their stable ID through the existing Tasks template focus path and open the matching template in edit mode;
- money, note, task, and project results keep exact focus, while account, category, transfer, split, budget, recurrence, list, app-group, focus, goal, usage, and other results keep owning-tab-only behavior;
- no schema, permission, import/export UI, network request, worker, or background process changed;
- focused template-navigation tests, full Jest (51 suites, 227 tests), lint, typecheck, bundle validation, Java 17 / two-worker release build, emulator template-focus smoke, and phone cold-start process/activity smoke passed; the phone rejects automated touch input, and both devices were force-stopped.

2026-07-28 Android project-search-focus pass:

- Global Search project results now pass their stable ID through the existing Tasks project focus path and open the matching project in edit mode;
- money, note, and task results keep exact focus, while account, category, transfer, split, budget, recurrence, list, template, app-time, and other results keep owning-tab-only behavior;
- no schema, permission, import/export UI, network request, worker, or background process changed;
- focused project-navigation tests, full Jest (51 suites, 227 tests), lint, typecheck, bundle validation, Java 17 / two-worker release build, emulator project-focus smoke, and phone cold-start process/activity smoke passed; the phone rejects automated touch input, and both devices were force-stopped.

2026-07-28 Android money-search-focus pass:

- Global Search money results now pass their stable ID through the existing Money focus path and open the matching entry in edit mode;
- note and task results keep exact focus, while account, category, transfer, split, budget, recurrence, project, app-time, and other results keep owning-tab-only behavior;
- no schema, permission, import/export UI, network request, worker, or background process changed;
- focused money-navigation tests, full Jest (51 suites, 227 tests), lint, typecheck, bundle validation, Java 17 / two-worker release build, emulator money-focus smoke, and phone cold-start process/activity smoke passed; the phone rejects automated touch input, and both devices were force-stopped.

2026-07-28 Android note-search-focus pass:

- Global Search note results now pass their stable ID through the existing Notes focus path and open the matching note in edit mode;
- task results keep exact task focus, while money, project, app-group, focus, goal, and other results keep owning-tab-only behavior;
- no schema, permission, import/export UI, network request, worker, or background process changed;
- focused note-navigation tests, full Jest (51 suites, 227 tests), lint, typecheck, bundle validation, Java 17 / two-worker release build, emulator note-focus smoke, and phone cold-start smoke passed; both devices were force-stopped.

2026-07-28 Android task-search-focus pass:

- Global Search task results now pass their stable ID through the existing Tasks focus path and open the matching task in edit mode;
- note, money, project, app-group, focus, goal, and other results keep the owning-tab-only behavior from the prior pass;
- no schema, permission, import/export UI, network request, worker, or background process changed;
- focused task-navigation tests, full Jest (51 suites, 227 tests), lint, typecheck, bundle validation, Java 17 / two-worker release build, emulator task-focus smoke, and phone cold-start smoke passed; both devices were force-stopped.

2026-07-28 Android search-navigation pass:

- Global Search result rows are now tappable and route to the owning Money, Notes, Tasks, or App Time tab;
- the mapping covers every current result kind, closes Search, and does not claim exact-record focus or mutate data;
- no schema, permission, import/export UI, network request, worker, or background process changed;
- focused navigation mapping tests, full Jest (51 suites, 226 tests), lint, typecheck, bundle validation, Java 17 / two-worker release build, emulator route smoke, and phone cold-start smoke passed; both devices were force-stopped.

2026-07-28 Android rich-note pass:

- Notes now offer small local formatting actions for bold, italic, code, bullets, and headings;
- formatting stays in the existing plain `Note.body` string, so search, task conversion, JSON, encrypted backup, and SQLite keep the same portable body data; unsupported markup stays readable;
- no app/repository schema, dependency, permission, import/export UI, network request, worker, or background process changed;
- focused markup tests, full Jest (51 suites, 225 tests), lint, typecheck, bundle validation, Java 17 / two-worker release build, emulator Notes smoke, and phone cold-start smoke passed; the temporary emulator smoke note was deleted with confirmation and both devices were force-stopped.

2026-07-28 Android linked-target-search pass:

- Global Search now finds an active note through searchable fields on its linked task, project, money entry, or focus session;
- note results include readable `Linked ...` labels, archived project target text stays behind the archived-results control, and deleted target content is not searched;
- the search remains an in-memory projection over loaded AppData with no schema, persistent index, permission, network request, worker, or background process;
- focused global-search tests, full Jest (50 suites, 220 tests), lint, typecheck, bundle validation, and the Java 17 / two-worker Android release build passed;
- emulator smoke searched `LinkTask` and showed both the task and linked `LinkNote` with `Linked task: LinkTask`; phone cold-start smoke showed no filtered app errors; both devices were force-stopped and no Yuzuha/Gradle/Java/Node process remained.

2026-07-27 Android local note-link pass:

- Notes can link to tasks, projects, money entries, and focus sessions with stable local IDs;
- Notes shows linked target labels, supports removal, rejects duplicate links, and keeps a `Deleted ...` label when a target is later removed;
- links persist through AppStore, SQLite `app_records`, current JSON, and encrypted backup; app schema is now 32 and repository schema remains 3;
- no import/export UI expansion, legacy migration, network request, worker, or background process was added;
- focused note-link/AppStore/SQLite/restore/backup tests, full Jest (50 suites, 218 tests), lint, typecheck, bundle validation, release APK build, emulator Notes smoke, and phone startup smoke passed; both devices were force-stopped after testing.

2026-07-27 Android money CSV latest-import undo pass:

- Data tools now persist only the latest money CSV import receipt: source name, import time, and each imported entry's ID plus creation/update timestamps;
- `Undo latest money CSV import` removes the batch only when every imported entry still exists unchanged. A missing or edited entry blocks undo with no write, and a later import replaces the receipt;
- the receipt persists through AppStore, JSON export/restore, encrypted backup, and SQLite metadata; app schema is now 31 and repository schema remains 3;
- no legacy import path, migration, network request, worker, or background process was added;
- focused receipt/AppStore/SQLite/data-import/export tests, full Jest (49 suites, 214 tests), lint, typecheck, bundle validation, release APK build, emulator Data tools smoke, and phone startup smoke passed; both devices were force-stopped after testing.

2026-07-27 Android week-start pass:

- Home now saves Sunday or Monday as the local week start; Home, Review, Money, App Time, and budget projections use the same current setting;
- JSON, encrypted backups, and SQLite preserve and require `weekStartsOn`; app schema is now 30 and repository schema remains 3;
- old app, backup, CSV, and SQLite data remain rejected; no migration, network request, worker, or background process was added;
- focused period/filter/budget/store tests, full Jest (48 suites, 208 tests), lint, typecheck, bundle validation, release APK build, emulator week-start smoke, and phone startup smoke passed; both devices were force-stopped after testing.

2026-07-27 Android Money-report-filter pass:

- Money reports now filter by local Day/Week/Month range, type, category, and account in one derived scope;
- the scope card states the exact range, active filters, transfer/out-of-range exclusions, and separate-currency behavior; split lines use their own category IDs;
- no schema, migration, network request, worker, or background process was added;
- focused report tests, full Jest (48 suites, 204 tests), lint, typecheck, bundle validation, release APK build, emulator report-control smoke, and phone startup smoke passed; both devices were force-stopped after testing.

2026-07-27 Android Money-payee pass:

- Money entries can select an optional local payee by stable ID; payees have trimmed case-insensitively unique names, archive controls, and visible form/list state;
- payees and entry references persist through current JSON, encrypted backups, SQLite repository schema 3, CSV export/import, and global search; app schema is now 29;
- old app, SQLite, backup, and CSV versions remain rejected; no migration, account, network request, worker, or background process was added;
- focused payee tests, full Jest (48 suites, 203 tests), lint, typecheck, bundle validation, release APK build, emulator payee-form smoke, and phone startup smoke passed; both devices were force-stopped after testing.

2026-07-27 Android Money-filtered-totals pass:

- Money history now derives the visible non-split list and currency-separated count, spending, income, and net totals from one All/Day/Week/Month, type, category, and account filter;
- integer minor-unit totals remain separate by currency, while split parents and lines keep the existing list boundary;
- no schema, migration, separate-report change, network request, background process, or legacy path was added;
- focused Money-filter tests, full Jest (47 suites, 200 tests), lint, typecheck, bundle validation, release APK build, emulator UI smoke, and phone startup smoke passed; both devices were force-stopped after testing.

2026-07-27 Android Money-filter pass:

- Money history now filters the existing non-split entry list by local All/Day/Week/Month period, expense/income type, category, and account;
- the list shows the matching count and an explicit empty result; archived selected categories or accounts remain available while filtering;
- no schema, migration, report change, network request, background process, or legacy path was added;
- focused Money-filter tests, full Jest (47 suites, 199 tests), lint, typecheck, bundle validation, release APK build, emulator control smoke, and phone startup smoke passed; both devices were force-stopped after testing.

2026-07-27 Android period-review pass:

- Home now opens a read-only Review for Today, This week, and This month;
- the Review shows source-backed main-currency money, included app time and last-read state, due/completed/overdue tasks, and active notes updated in the range, with links to the existing feature screens;
- no review record, reflection field, schema, native usage refresh, timer, worker, or legacy path was added;
- focused review tests, full Jest (46 suites, 197 tests), lint, typecheck, bundle validation, release APK build, emulator three-period Review smoke, and phone startup smoke passed.

2026-07-27 Android Home-period pass:

- Home now selects Today, This week, or This month and shows the exact local date range used by its cards;
- money totals are restricted to the main currency and selected range, while app time, due-task counts, and recent note updates use the same derived range;
- no schema, preference record, native refresh, timer, worker, or legacy path was added;
- focused period tests, full Jest (45 suites, 195 tests), lint, typecheck, bundle validation, release APK build, emulator Day/Week/Month smoke, and phone startup smoke passed; both devices were force-stopped after testing.

2026-07-27 Android verified-remote-bundle pass:

- the native shell now performs one bounded HTTPS metadata check before creating the React host, verifies canonical Ed25519-signed metadata, downloads only a newer compatible Android bundle, checks the 64 MiB size cap and SHA-256, and atomically activates private files;
- timeout or network failure selects the newest verified private bundle or embedded asset; no retry loop, polling worker, account identity, or legacy bundle migration path was added;
- Android minimum API is now 33 for the supported Ed25519 runtime; the JavaScript bridge reads the native launch result and never downloads or activates a bundle;
- focused installer tests, full Jest (45 suites, 194 tests), lint, typecheck, bundle validation, native Kotlin compilation, release APK build, emulator startup, and phone startup passed; live remote activation remains an endpoint-release test rather than a device-smoke claim.

2026-07-27 Android App-Time-period pass:

- no app or repository schema change; App Time now selects Today, This week, or This month and states the exact local date range and last-read time;
- refresh splits the selected range into sequential local-day Usage Access reads and replaces the selected snapshots once after all reads succeed; no worker, timer, polling loop, or legacy import path was added;
- focused usage tests, full Jest (45 suites, 191 tests), lint, typecheck, bundle validation, Android debug/release builds, emulator selector and Week-refresh smoke, and phone clean-launch smoke passed;
- the emulator had Usage Access enabled for the read; the phone remained in the honest unavailable state because permission was not enabled, and both devices were force-stopped after testing.

2026-07-27 Android encrypted-backup-file-bound pass:

- no app or repository schema change; selected encrypted backup files are now rejected above 96 MiB before cache copy when picker metadata provides a size, and cached files are checked again before read;
- oversized cached files are removed by the cleanup path, while valid files use the existing password/recovery-key decryption and preview flow; no credential, schema, or restore behavior changed;
- focused encrypted-backup file tests, full Jest (45 suites, 188 tests), lint, typecheck, bundle validation, Android debug/release builds, emulator valid-file picker/decrypt-preview smoke, and phone clean-launch smoke passed;
- the bound is a local resource guard only; encrypted backup schema 2, the 64 MiB plaintext limit, attachment checksum validation, and latest-only schema rejection remain unchanged; both devices were force-stopped after testing and the temporary fixture was removed.

2026-07-27 Android JSON-file-restore pass:

- no app or repository schema change; Data tools now choose one current Yuzuha JSON export through the system picker, copy it to cache, bound and validate it, and reuse the existing record-count preview before replacement;
- picker cancellation, unsupported or oversized files, malformed JSON, old schemas, and incomplete current records leave the workspace unchanged; destructive confirmation is still required before the replacement save;
- focused JSON parser/picker coverage, full Jest (45 suites, 186 tests), lint, typecheck, bundle validation, Android debug/release builds, emulator picker/preview/confirm/relaunch smoke, and phone clean-launch smoke passed;
- current JSON only is supported; encrypted backups remain a separate credential/decryption path, and sync, arbitrary imports, and legacy JSON versions remain out of scope; both devices were force-stopped after testing and the temporary fixture was removed.

2026-07-27 Android money-CSV-import pass:

- no app or repository schema change; Data tools now choose one current Yuzuha money CSV through the system picker, copy it to cache, validate it, and preview row errors and currency totals;
- duplicate IDs, broken account/category references, split-linked rows, invalid values, unsupported current schema/header values, and files over 5 MB block the append; confirmation adds valid rows in one local store save and removes the cache copy;
- focused CSV parser/picker/store coverage, full Jest (44 suites, 182 tests), lint, typecheck, bundle validation, Android debug/release builds, emulator picker/preview/confirm/relaunch smoke, and phone clean-launch smoke passed;
- arbitrary bank CSV mapping, import history/undo, split-row import, sync restore, and legacy CSV versions remain out of scope; both devices were force-stopped after testing and the temporary smoke file was removed.

2026-07-27 Android task-calendar-draft pass:

- no app or repository schema change; dated task rows validate title/details/date and open the Android system calendar editor with an all-day local draft;
- the bridge requests no calendar permission, reads no calendar rows, stores no external event ID, and starts no worker; canceling the external editor leaves Yuzuha unchanged;
- focused calendar validation, full Jest (42 suites, 176 tests), lint, typecheck, bundle validation, Android debug/release builds, emulator calendar-editor smoke, and phone clean-launch smoke passed;
- the cold-start intent regression was fixed and rechecked: unknown launcher actions no longer clear a valid deep-link intent, so cold `yuzuha://open/tasks` opens Tasks; both devices were left without Gradle or Java build processes.

2026-07-27 Android deep-link pass:

- no app or repository schema change; Android accepts only exact local `yuzuha://open/money`, `/notes`, `/tasks`, and `/app-time` routes;
- cold and warm delivery uses a typed native bridge, clears the consumed URI, and routes to existing tabs without IDs, query data, remote URLs, permissions, network requests, or background work;
- focused deep-link coverage, full Jest (41 suites, 174 tests), lint, typecheck, bundle validation, Android debug/release builds, emulator cold/warm/rejection smoke, and phone cold/warm/manifest smoke passed;
- malformed and unsupported links remain ignored; remote app links, record-specific links, dynamic shortcuts, and sync remain planned; both devices were force-stopped after the check and no Yuzuha Node, Gradle, or Java process remained.

2026-07-27 Android summary-widget pass:

- no app or repository schema change; Android registers a 3x2 summary widget for open-task and active-note counts;
- the widget updates only after the JavaScript store loads or commits workspace data, uses app-private count preferences, has no periodic worker, and opens `MainActivity` on tap;
- focused widget-summary coverage, full Jest (40 suites, 172 tests), lint, typecheck, bundle validation, Android debug/release builds, emulator placement/live-update/tap smoke, and phone provider-registration/launch smoke passed;
- no raw task, note, money, or app-time content is placed in the widget; dynamic shortcuts, user-selected widget cards, iOS widgets, and sync remain planned; both devices were force-stopped after the check and no Gradle or Java process remained.

2026-07-27 Android file-share pass:

- no app schema change; Android accepts supported image, PDF, and plain-text `EXTRA_STREAM` files through the existing share review;
- native metadata rejects unsupported MIME types, missing names, and known files over 10 MiB; the existing private copy and SHA-256 path verifies the final file;
- file shares offer Save as note only, then commit the note and attachment together; text shares retain Save as note and Save as task;
- focused attachment/share/AppStore coverage, full Jest (39 suites, 170 tests), lint, typecheck, bundle validation, Android debug/release builds, release emulator file-share/save/relaunch smoke, text-share regression, and phone text-launch smoke passed;
- unsupported files, widgets, dynamic shortcuts, iOS share handling, remote URL fetching, and sync remain planned; both devices were force-stopped after the check and no Gradle/Java process remained.

2026-07-27 Android launcher-shortcut pass:

- no app schema change; Android exposes static Add money, Add note, Add task, and App time shortcuts;
- shortcut actions use a typed native cold-start getter and warm-app event, then route to existing screens without record data, shortcut persistence, permissions, or background work;
- focused launcher-action unit coverage, full Jest (39 suites, 166 tests), lint, typecheck, bundle validation, Android debug/release builds, emulator cold/warm action smoke, static-shortcut inspection, and phone launch smoke passed;
- widgets, dynamic shortcuts, file/URI shares, iOS shortcuts, and sync remain planned; both devices were force-stopped after the check and no Gradle/Java process remained.

2026-07-27 Android share-capture pass:

- no app schema change; Android `ACTION_SEND` `text/plain` shares now show an ephemeral review screen before saving as a note or Inbox task;
- native and shared boundaries reject empty or over-20,000-character payloads, clear consumed extras, handle cold and warm activity delivery, and deduplicate one payload;
- focused share-capture unit coverage, full Jest (38 suites, 164 tests), lint, typecheck, bundle validation, Android debug/release builds, release emulator cold/warm/save/relaunch smoke, and release phone share/launch smoke passed;
- file/URI shares, widgets, dynamic shortcuts, iOS share handling, network fetching, and sync remain planned; both devices were force-stopped after the check and no Gradle/Java process remained.

2026-07-27 Home quick-capture pass:

- no app schema change; Home adds a local Quick capture menu with Add money, Add note, and Add task targets;
- each target routes to the existing feature form, so normal validation and saving remain the source of truth;
- focused quick-capture unit coverage, full Jest (37 suites, 160 tests), lint, typecheck, bundle validation, Android debug/release builds, clean emulator UI smoke, and clean phone launch smoke passed;
- clean emulator smoke showed Quick capture, Add money, Add note, and Add task; both devices were force-stopped after the check, with no Gradle/Java processes left running.

2026-07-27 local-task-template pass:

- app data schema 28 adds local task templates with strict task-shaped fields; schema 27 data remains rejected because the app has no external users;
- Tasks can add, edit, archive/restore, delete, and use templates; using one creates an independent open task without a due date, parent, recurrence, reminder, or source-note link;
- project and task-list deletion remains reference-safe while templates point to those records;
- JSON import, encrypted backups, SQLite persistence, current-record validation, global search, UX, architecture, requirements, decision, release, and testing docs include the current template contract;
- focused template/store/boundary tests, full Jest (36 suites, 159 tests), lint, typecheck, bundle validation, Android debug/release builds, clean emulator UI smoke, and clean phone launch smoke passed;
- clean emulator smoke showed `Task templates`, `Template name`, `Add template`, `Parent task (optional)`, and `No parent`; both devices were force-stopped after the check, with no Gradle/Java processes left running.

2026-07-27 local-task-subtask pass:

- app data schema 27 adds one optional same-list `Task.parentTaskId`; schema 26 data remains rejected because the app has no external users;
- the Tasks form offers a parent task from the current list, rejects self-links and cycles, and shows parent/subtask labels in task rows;
- deleting a parent promotes its direct children; nested child links remain attached to their preserved parent;
- JSON import, encrypted backups, SQLite persistence, current-record validation, and global search preserve and validate parent links;
- focused subtask/store/boundary tests, full Jest (35 suites, 154 tests), lint, typecheck, bundle validation, Android debug/release builds, clean emulator UI smoke, and phone launch smoke passed;
- emulator smoke confirmed the schema 27 Tasks form showed `Parent task (optional)` and `No parent`; both devices were force-stopped after the check, with no Gradle/Java build processes left running.

2026-07-27 focus-session pass:

- app data schema 26 adds local `appGroups` and `focusSessions`; schema 25 data remains rejected because the app has no external users;
- App Time can start one manual session, link it to an optional task, project, note, and app group, then Complete or Stop it; elapsed time comes from stored timestamps;
- app groups store trimmed package-name labels and can be archived or deleted when unused; the feature does not inspect app content or block apps;
- JSON import, encrypted backups, SQLite persistence, current-record validation, and global search include the new collections;
- focused lifecycle/store/boundary tests, full Jest (34 suites, 151 tests), lint, typecheck, bundle validation, Android debug/release builds, clean emulator UI smoke, emulator relaunch persistence, and phone launch smoke passed;
- the first release smoke exposed a stale-clock duration crash; a regression test now defines pre-start active duration as zero, and the corrected release smoke passed.

2026-07-27 local task-project pass:

- app data schema 25 adds local task projects with unique names, active/completed status, archive state, and optional `Task.projectId`; app schema 24 data remains rejected because the app has no external users;
- Tasks can create, rename, complete/reopen, archive/restore, and delete projects, with deletion blocked while tasks still reference the project; archived projects remain readable on existing tasks;
- JSON import, encrypted backups, SQLite persistence, current-record validation, global search, and the task form preserve and validate project records and links;
- focused project tests, full Jest (33 suites, 145 tests), lint, typecheck, bundle validation, Android debug/release builds, clean emulator UI smoke, and phone launch smoke passed;
- notes, money, app-time, focus, subtasks, templates, cross-device projects, and sync links remain planned.

2026-07-27 device-local task-agenda pass:

- no app schema change; the Agenda mode is a derived view over existing task `dueLocalDate` values;
- the Tasks screen groups dated open and completed tasks for the next 14 device-local calendar days and leaves undated tasks in List mode;
- unit tests cover local-window grouping, stable task order, invalid dates, and bounded window length;
- focused and full Jest tests, lint, typecheck, bundle checks, Android debug/release builds, emulator UI smoke, and phone launch smoke passed;
- selected timezone/week-start preferences, month navigation, calendar integration, and sync remain planned.

2026-07-27 latest-only dead-code cleanup pass:

- removed the commented-out `LegacyTasksScreen`; the shipped Tasks screen has one active implementation;
- no app schema, repository schema, runtime behavior, or compatibility path changed;
- full Jest, lint, typecheck, bundle validation, Android debug/release builds, emulator Tasks/Agenda smoke, and phone launch smoke passed;
- historical migration notes remain release history only and do not describe supported runtime behavior.

2026-07-27 task-order pass:

- app data schema 24 adds required per-task `sortOrder`; old app schema 23 data remains rejected because the app has no external users;
- Tasks now sort List mode by Manual, Due date, or Priority, and the All view can move a task Up or Down within its list;
- JSON restore, encrypted backups, SQLite persistence, and current-record validation include strict non-negative per-list sort order;
- focused and full Jest tests, lint, typecheck, bundle validation, Android debug/release builds, emulator Tasks smoke, and phone launch smoke passed;
- Agenda remains a derived device-local 14-day view and is not changed by the list sort control.

2026-07-27 task-dependency pass:

- app data schema 23 adds `taskDependencies` with the `completed` prerequisite condition;
- the Tasks screen can add and remove prerequisite/dependent links, while self-links, duplicate links, and cycles fail before save;
- an incomplete prerequisite keeps its dependent task open; deleting a task removes its dependency edges in the same local save;
- JSON export/restore, encrypted backups, and SQLite persistence include and validate dependency records;
- focused and full Jest tests, lint, typecheck, bundle checks, Android debug/release builds, emulator UI smoke, and phone launch smoke passed;
- projects, richer dependency types, sync, and broader automation remain planned.

2026-07-27 recurring-task reminder policy pass:

- app data schema 22 adds required `notificationSettings.recurringTaskRemindersEnabled`, defaulting fresh workspaces to `true`;
- Tasks now has separate global and recurring-task reminder switches; turning the recurring switch off clears native alarms only for tasks linked to recurring rules, keeps their logical reminder times, and leaves one-off task alarms active;
- reminder creation, snooze, task reopen, startup, restore, and recurrence expansion all use the same deterministic category rule;
- JSON import, encrypted backup validation, SQLite persistence, and strict current-record checks require the new setting; old schemas remain rejected because the app has no public users;
- focused policy tests, full unit tests, lint, typecheck, bundle checks, Android debug/release builds, emulator UI smoke, and phone launch smoke passed;
- broader notification automation, iOS reminders, and sync remain planned.

2026-07-27 latest-only data-boundary pass:

- the unreleased build accepts app schema 23, export schema 1 with app schema 23 data, encrypted backup schema 2, and SQLite repository schema 2 only;
- old app JSON, old encrypted backup envelopes, old SQLite repository schema 1, and incomplete current records are rejected with explicit errors instead of receiving guessed defaults;
- the legacy AsyncStorage product-data store, migration chain, and unused package dependency were removed; fresh SQLite startup seeds current empty data directly;
- focused and full Jest tests, lint, typecheck, and bundle checks passed before Android build and smoke verification;
- a public upgrade policy and future migrations remain intentionally deferred until the app has an external release.

2026-07-27 recurring task-reminder pass:

- app data schema 21 adds nullable `taskRecurrenceRule.reminderLocalTime` with strict local `HH:mm` validation; schema 20 rules migrate to no automatic reminder time;
- generated task occurrences copy the rule time into `reminderAtMillis`, and future generated reminders synchronize immediately through the existing Task reminders category and quiet-hours projection;
- past generated reminder timestamps are retained as logical task values but are not added to native schedules;
- JSON, encrypted backup, SQLite, and legacy AsyncStorage paths validate or default the new rule field;
- recurring-rule reminder tests, full unit tests, lint, typecheck, bundle checks, Android debug/release builds, emulator UI/scheduling smoke, and phone launch smoke passed;
- rule-level notifications, recurring notification summaries, iOS reminders, and sync remain planned.

2026-07-27 Android task-reminder category-pause pass:

- app data schema 20 adds required `notificationSettings.taskRemindersEnabled`, defaulting existing schema 19 data and legacy SQLite settings to `true`;
- Tasks notification settings can pause the local Task reminders category; pausing removes native alarms without deleting logical task reminder times, and re-enabling rebuilds future alarms;
- setting a reminder while paused stores the logical timestamp without requesting permission or scheduling native work; stale `Snooze` actions while paused are no-ops;
- JSON import, encrypted backup validation, SQLite persistence, and local-store keys accept schema 20; focused migration and AppStore tests cover the pause contract;
- recurring-rule notifications, broader category policy, iOS reminders, and sync remain planned.

2026-07-27 Android snooze-duration policy pass:

- app data schema 19 adds `notificationSettings.snoozeDurationMinutes` with allowed values 15, 30, 60, and 120; existing schema 18 data defaults to 60;
- Tasks notification settings let the user choose the local snooze duration, while the Android notification action remains generic `Snooze`;
- JSON, encrypted backup, SQLite, and legacy AsyncStorage paths migrate and persist the setting; native scheduling still applies quiet-hours projection;
- focused persistence and duration tests, full unit tests, lint, typecheck, bundle checks, debug/release builds, emulator setting/action/alarm smoke, and phone launch smoke passed;
- recurring-rule notifications, broader category policy, iOS reminders, and sync remain planned.

2026-07-27 Android notification Snooze 1h pass:

- the Android reminder notification now offers `Snooze 1h` alongside `Open` and `Complete`;
- the action stores exactly one hour after the action time as the task's logical reminder, applies the existing quiet-hours projection to the native alarm, and replaces the old native schedule before committing;
- missing and completed task targets are ignored; the notification is dismissed after handling; no app-data schema, permission, or minimum-OS change was made;
- focused snooze/bridge tests, full unit tests, lint, typecheck, bundle checks, debug/release builds, emulator action/alarm smoke, and phone launch smoke passed;
- user-selected snooze durations, recurring-rule notifications, iOS reminders, and sync remain planned.

2026-07-27 Android notification Complete-action pass:

- the Android reminder notification now offers `Open` through its content tap and `Complete` through an explicit action button;
- `Complete` routes through the stable task ID and the local AppStore, completes an existing open task once, preserves its logical reminder timestamp, and ignores missing or already-completed tasks;
- the notification is explicitly dismissed after either action; no app-data schema, permission, or minimum-OS change was made;
- focused bridge and AppStore tests, full unit tests, lint, typecheck, bundle checks, debug/release builds, emulator action/dismissal smoke, and phone launch smoke passed;
- snooze, recurring-rule notifications, iOS reminders, and sync remain planned.

2026-07-27 local quiet-hours pass:

- app data schema 18 adds nullable `notificationSettings.quietHoursStartLocalTime` and `quietHoursEndLocalTime`;
- Tasks can save or disable a daily local quiet-hours window using strict `HH:mm` validation;
- reminders inside same-day or overnight quiet hours are projected to the window end for Android scheduling, while the logical task timestamp remains unchanged;
- SQLite repository metadata, JSON import/export, encrypted backups, and legacy schema 17 migration persist or validate the settings;
- full unit, lint, typecheck, bundle, debug/release build, emulator UI/alarm, and phone launch checks passed;
- snooze, notification actions, recurring-rule notifications, iOS reminders, and sync remain planned.

2026-07-27 task-reminder deep-link pass:

- notification content intents carry the stable task ID;
- cold starts read and consume the initial task ID, while warm Android launches emit the task ID to JavaScript;
- tapping a task reminder opens the matching task in the Tasks edit form;
- no schema, permission, or minimum-OS change;
- iOS notification intents, snooze, action buttons, recurring-rule notifications, and sync remain planned.

2026-07-27 task-reminder pass:

- app data schema 17 adds nullable task `reminderAtMillis`, with schema 16 tasks migrating to no reminder;
- open tasks can set one future local Android reminder using strict `YYYY-MM-DDTHH:mm` input;
- Android uses explicit `POST_NOTIFICATIONS` permission, stable task IDs, `AlarmManager`, a privacy-safe notification, and boot rescheduling;
- startup and confirmed restore synchronize future open-task reminders; completing, deleting, clearing, or replacing a reminder cancels the old schedule;
- JSON, encrypted backup, SQLite, and legacy AsyncStorage paths validate and persist the new field;
- native release metadata now includes `POST_NOTIFICATIONS` and `RECEIVE_BOOT_COMPLETED`; minimum OS is unchanged;
- snooze, notification actions, recurring-rule notifications, and sync remain planned.

2026-07-27 recurring-task pass:

- app data schema 16 adds task recurrence rules and nullable task `recurrenceRuleId` links;
- Tasks can create, pause/resume, and delete local day/week/month rules with intervals from 1 to 365;
- rule creation and startup expand due rules with deterministic local dates and explicit All, One, or Skip missed-occurrence behavior;
- schema 15 data receives an empty rule collection and `recurrenceRuleId: null`; JSON, encrypted backup, and SQLite paths validate and persist the new records;
- task-list deletion rejects lists referenced by a recurring rule;
- no permission, native, or minimum-OS change; notifications and background scheduling remain planned.

2026-07-27 task-list management pass:

- Tasks can create, rename, archive/restore, and delete custom lists locally;
- list names are trimmed, case-insensitive unique, and limited to 60 characters;
- Inbox cannot be archived or deleted, and lists with tasks cannot be deleted;
- JSON restore and SQLite persistence keep task-list records and validate task references;
- no schema, permission, or minimum-OS change;
- known limits remain notifications, background scheduling, account recovery, and remote sync.

2026-07-27 task-lifecycle pass:

- app data schema 15 adds task priority and required task-list links, with the seeded `Inbox` list;
- Tasks support create, edit, complete/reopen, delete after confirmation, and All/Overdue/Today/Upcoming/Completed views;
- schema 14 tasks migrate with `normal` priority and the `Inbox` list; SQLite and all portable data paths validate the new fields;
- no permission or minimum-OS change;
- known limits remain recurring task rules, reminders, synced notes, account recovery, and remote sync.

2026-07-27 note-to-task pass:

- app data schema 14 adds an optional `sourceNoteId` to tasks and migrates schema 13 tasks with `null`;
- Notes can create a new open task from the note title/body without changing the note;
- Tasks show the source note title, or `Deleted note` when the source no longer exists;
- JSON restore, encrypted backups, SQLite persistence, and local migration validation include the new task link;
- no permission or minimum-OS change;
- known limits remain task editing, recurring task rules, reminders, synced notes, account recovery, and remote sync.

2026-07-27 global-search pass:

- Home opens a local Search screen that searches supported money, notes, tasks, saved searches, account/category, transfer/split/budget, recurrence, time-goal, and app-time metadata records;
- archived records stay hidden unless the user enables archived results;
- app-time results require granted Usage Access and an included snapshot;
- no schema, permission, or minimum-OS change;
- known limits remain synced search, command actions, and account/device recovery.

2026-07-27 saved-search pass:

- app data schema 13 adds local saved-search records and migrates schema 12 with an empty saved-search collection;
- Notes can save the current trimmed query and archived-note visibility, then Apply or Delete a saved search;
- saved searches are included in JSON exports, encrypted backups, SQLite persistence, and confirmed restore validation;
- no permission or minimum-OS change;
- known limits remain global search, synced notes, account recovery, and remote sync.

2026-07-27 note lifecycle pass:

- app data schema 12 adds `isArchived`, with schema 11 notes migrating to `false`;
- Notes now supports edit, pin/unpin, archive/restore, and confirmed delete;
- archived notes are hidden by default and pinned notes sort first;
- confirmed note deletion removes related attachment metadata and private files;
- no permission or minimum-OS change;
- known limits remain attachment filename search, saved searches, global search, synced notes, account recovery, and remote sync.

2026-07-27 attachment filename search pass:

- local Notes search now matches validated attachment file names case-insensitively;
- search uses metadata only and never reads attachment bytes;
- no schema, permission, or minimum-OS change;
- known limits remain saved searches, global search, synced notes, account recovery, and remote sync.

## Release types

### JavaScript bundle release

Use for UI and business-logic changes that do not require native changes.

1. Run lint, unit, integration, and bundle checks.
2. Build Android and iOS bundles from the pinned toolchain.
3. Record the app version, runtime, native minimum, file size, SHA-256, and signature.
4. Upload immutable bundle files.
5. Publish matching metadata only after the file is available.
6. Run an online update, offline launch, and invalid-bundle test.
7. Monitor activation and startup failures.

### Native release

Use when changing permissions, native APIs, the embedded bundle, cache behavior, database encryption, or the minimum OS version.

1. Update native version and migration notes.
2. Test upgrade from the previous production build.
3. Verify the embedded bundle starts without network access.
4. Verify the installer can move from embedded to remote and back to last-known-good.
5. Build signed artifacts in CI.
6. Complete privacy, security, accessibility, and store metadata review.
7. Publish staged rollout and keep rollback artifacts available.

## Pre-release checklist

- [ ] Product requirements for the release are accepted.
- [ ] `README.md`, `AGENTS.md`, and affected `docs/` files are updated.
- [ ] `npm run lint` passes.
- [ ] Jest and integration tests pass.
- [ ] `npm run check-bundle` passes against release metadata.
- [ ] Android debug and release builds pass.
- [ ] Clean install, upgrade, offline, and process-death tests pass.
- [ ] Installer signature, hash, size, compatibility, and rollback tests pass.
- [ ] Database migration and export/delete tests pass.
- [ ] No P0/P1 defects are open.
- [ ] Permissions and privacy text match the shipped behavior.
- [ ] Release notes name known limits and data changes.

## Rollback

For a bad JavaScript bundle, stop publishing its metadata, mark it bad in the release system, and point new launches to the last-known-good version. Existing clients follow the installer rollback rule in `installer.md`. Do not delete the previous verified bundle until the incident is closed.

For a native release, stop the staged rollout and publish the previous native artifact if the store allows it. If native rollback is not possible, release a patch with the smallest safe change and keep the embedded bundle usable.

## Release notes must include

- user-visible changes;
- data schema or migration changes;
- permission changes;
- minimum native version;
- JavaScript bundle version and hash;
- known limits and rollback status.

## Developer note: startup changes

Any release that changes the bundle gate, cache, metadata schema, activation, or startup order must include installer test evidence. A normal UI release may still be blocked if it fails to start from the verified bundle.

## Full-product release tracks

### Data release

Use when adding or changing schema, migrations, exports, encrypted backup parameters, restore validation, sync encoding, conflict records, or deletion. The release record includes old/new schema versions, migration fixtures, export compatibility, crypto parameters, rollback limits, and a restore test. For local JSON or encrypted restore, record the export schema, supported app-schema migrations, validation rules, preview/confirmation behavior, password handling, and proof that a failed restore keeps the current workspace.

### Sync release

Use when changing encryption, key wrapping, device enrollment, API cursors, conflict rules, tombstones, or account deletion. Require a security review, two-device test, offline test, recovery test, service rollout plan, and a client rollback plan.

### Integration release

Use when adding permissions, widgets, share actions, calendar, shortcuts, providers, or background execution. Require a capability matrix, permission/revoke test, store disclosure review, locked-screen privacy test, and platform-specific release notes.

### Localization/accessibility release

Use when adding languages, layout systems, charts, gestures, or large feature areas. Require translation completeness, pseudo-localization, RTL, screen reader, large text, contrast, reduced motion, and locale/date/currency tests.

## Public rollout stages

1. Internal build: trusted devices, debug diagnostics, test data only.
2. Closed beta: staged native or bundle rollout with explicit feedback and rollback owner.
3. Open beta: monitor startup, migration, sync, export, and crash metrics; keep known limits public.
4. General release: publish support, privacy, data portability, and incident contacts.
5. Maintenance: patch supported native versions, bundle versions, schema versions, and security dependencies according to the support policy.

Full-product phases may ship independently, but a later phase cannot silently change the meaning of existing money totals, task recurrence, reminders, or exported data.
