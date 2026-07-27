# Integrations and platform entry points

Status: Android text share capture is current; broader integration capability remains planned.

## Integration rule

An integration is useful only when it makes capture or review faster without weakening privacy. Each integration has a permission, a data scope, a revoke path, and an offline behavior.

## Android and iOS entry points

| Entry point | Use | MVP/full-product phase |
| --- | --- | --- |
| App icon | Open Home. | MVP. |
| Global add action | Create money entry, note, or task. | Full product. |
| Share sheet | Android `text/plain`: preview shared subject/body, then save as a note or Inbox task. | Current Android slice. |
| Widgets | Show selected cards and quick capture. | Full product. |
| Shortcuts/app actions | Open a feature or start a focus session. | Full product. |
| Deep links | Open a safe local object or settings page. | Full product. |
| Notification actions | Android MVP: `Open`, `Complete`, and `Snooze` using the local duration setting; broader review actions are full product. | Android MVP; broader full product. |
| Calendar | Read or create user-approved task events. | Full product, optional. |
| File picker | Import/export backups and attachments. | MVP export; full import/backup. |

## Share capture

Current Android behavior accepts an `ACTION_SEND` `text/plain` intent, plus a missing MIME type when the sender still provides text. The native activity bridge accepts `EXTRA_TEXT` and optional `EXTRA_SUBJECT`, rejects empty or over-20,000-character payloads before the React Native bridge, clears consumed extras, and emits warm launches to `MainApp`. The app shows a review screen; the user can save the bounded text as a note or as an Inbox task, or dismiss it. Nothing is written before confirmation, and no network request is made.

File and URI shares, remote page fetching, widgets, shortcuts, iOS share handling, and a persisted draft type remain planned. A shared URL must not be fetched or stored as remote content without a separate network policy.

## Widgets

Widgets expose only user-selected, low-risk summaries. Sensitive note bodies and transaction descriptions are not shown on a locked screen by default. A widget has a tap action, an update policy, and a placeholder state when the app database is locked or unavailable.

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
