# Integrations and platform entry points

Status: Android text/file share capture, static launcher shortcuts, the summary widget, and strict local deep links are current; broader integration capability remains planned.

## Integration rule

An integration is useful only when it makes capture or review faster without weakening privacy. Each integration has a permission, a data scope, a revoke path, and an offline behavior.

## Android and iOS entry points

| Entry point | Use | MVP/full-product phase |
| --- | --- | --- |
| App icon | Open Home. | MVP. |
| Global add action | Create money entry, note, or task. | Full product. |
| Share sheet | Android text: preview and save as note/task; supported image/PDF/plain-text files: preview and save as note attachment. | Current Android slice. |
| Widgets | Android summary of open tasks and active notes; tap opens Yuzuha. | Current Android slice. |
| Shortcuts/app actions | Android static shortcuts open Money, Notes, Tasks, or App Time. | Current Android slice. |
| Deep links | Open one of four existing Android tabs through a strict local `yuzuha://open/...` route. | Current Android slice. |
| Notification actions | Android MVP: `Open`, `Complete`, and `Snooze` using the local duration setting; broader review actions are full product. | Android MVP; broader full product. |
| Calendar | Read or create user-approved task events. | Full product, optional. |
| File picker | Import/export backups and attachments. | MVP export; full import/backup. |

## Share capture

Current Android behavior accepts an `ACTION_SEND` text intent or a supported `EXTRA_STREAM` file. Text accepts optional subject, rejects over-20,000-character content, clears consumed extras, and shows a review before saving as a note or Inbox task. Files must be image/jpeg, image/png, image/gif, image/webp, application/pdf, or text/plain; native metadata rejects missing names and known sizes over 10 MiB, and the JS/private-file path verifies the final size and SHA-256 checksum. A file share shows a review and saves only as a note attachment after confirmation. Warm launches emit to `MainApp`; cold launches use the initial getter. Nothing is written before confirmation, and no network request is made.

Remote page fetching, unsupported file types, dynamic shortcuts, iOS share handling, and a persisted draft type remain planned. A shared URL must not be fetched or stored as remote content without a separate network policy. The sending app must grant read access to the shared URI for the review/save window.

## Android launcher shortcuts

The Android manifest exposes four static launcher shortcuts: Add money, Add note, Add task, and App time. They open the current blank form or screen through the same `singleTask` activity used by reminders and share capture. Cold starts use the typed initial-action getter; warm launches use the native event. Shortcut actions carry no record data, do not require a new permission, and do not start background work. Dynamic, user-configured, and iOS shortcuts remain planned.

## Widgets

The current Android widget exposes only two low-risk counts: open tasks and active notes. It has a fixed `Yuzuha` layout, shows `0 open tasks · 0 active notes` before any workspace records exist, updates only after the app loads or commits workspace data, and opens `MainActivity` when tapped. `updatePeriodMillis=0` means Android does not poll it. Sensitive note bodies, task text, money values, app-time rows, and transaction descriptions are not placed in the widget. Dynamic widgets, user-selected cards, lock-screen policy controls, and iOS widgets remain planned.

## Android deep links

The Android manifest accepts `ACTION_VIEW` for the custom `yuzuha` scheme and `open` host. The only routes are `yuzuha://open/money`, `yuzuha://open/notes`, `yuzuha://open/tasks`, and `yuzuha://open/app-time`; each opens the matching existing tab through the same single-task activity. Cold starts use the native initial getter and warm launches use the native event. Query strings, fragments, extra path segments, IDs, remote URLs, and link content are rejected. Deep links create no record, require no permission, and make no network request.

## Calendar

Calendar integration is opt-in and scoped. The app can create a calendar event from a task or focus session and may read events only when needed for a calendar view. Imported events are not tasks unless the user converts them. Revoking permission stops future reads but does not delete already-created Yuzuha tasks.

## Import formats

Supported import formats should be versioned:

- Yuzuha encrypted backup;
- Yuzuha JSON export;
- Markdown/plain text notes;
- CSV money entries;
- QIF money entries when the parser is stable;
- task JSON/CSV with a mapping preview.

Imports are staged and undoable. Unsupported fields are shown in the preview rather than silently dropped.

## Deep links

Deep links must validate scheme, host, object ID, and action. A link can open a record only after the app checks that the record exists and the current user/device may access it. Do not place note text, amounts, or tokens in URLs.

## External financial providers

Bank or card connections are not required for the full personal core and must remain behind a separate security and regional review. If added, provider credentials belong in a protected native store, provider data is mapped into the same transaction model, and disconnection clearly states what historical data remains.

## Integration lifecycle

Every integration must support:

1. explanation before permission;
2. grant, deny, and revoke states;
3. test connection or preview;
4. last successful read/write time;
5. error and retry state;
6. data deletion or disconnect behavior;
7. platform capability differences.
