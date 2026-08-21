# UI standardization

Status: Applied spacing standardization for the current Android UI. Shared
primitive extraction beyond the current screen component remains planned.

This document defines the shared visual and interaction rules for Yuzuha. It
does not add records, schema fields, migrations, network requests, workers, or
background processes. `docs/ux.md` remains the source for product flows and
screen behavior; this document sets the common UI language used by those
flows.

## 1. Current baseline

The current implementation already has useful shared patterns in
`src/app/MainApp.tsx`:

- `System`, `Light`, and `Dark` contrast modes;
- five temporary palettes: Moss, Ocean, Sunset, Plum, and Citrus;
- shared `PrimaryButton`, `TextButton`, `SegmentButton`, `ChipButton`,
  `Disclosure`, `FloatingActionButton`, and bottom-tab controls;
- a 16 dp page inset, 44 dp text inputs, a 56 dp floating action button, and a
  list-first flow for Home, Money, Notes, and Tasks;
- progressive disclosure for optional filters, settings, management tools, and
  destructive actions;
- save, cancel, disabled, error, empty, and loading states in the main forms.

The main remaining gap is ownership, not a missing visual idea. The tokens and
control rules live beside a large screen component, so new controls can drift
in size, spacing, labeling, and accessibility. Some compact visual treatments
also remain smaller than the 44 dp touch-target rule even when their parent
control exposes the full hit area. The rules below are the shipped spacing
contract and the target contract for later primitive extraction.

The typed spacing/radius/target tokens in `src/app/uiTokens.ts` now cover
`App.tsx` and the full `createStyles` screen style set in `MainApp.tsx`.
Every app-level `padding`, `margin`, and `gap` uses `UI_TOKENS.spacing`; the
focused token test rejects new numeric spacing in either file. This includes
Home, Money, Notes, Tasks, Search, App Time, Data tools, Review, Settings,
forms, the FAB/menu, and bottom tabs. Shared primitive extraction remains a
separate future refactor.

## 2. Design principles

1. One screen has one clear primary job.
2. One screen has one primary action. Secondary actions stay visually quieter.
3. Show the current records before showing setup or management tools.
4. Prefer a visible label over an icon-only control.
5. Keep state changes local and explain the result immediately.
6. Do not use color alone for type, priority, status, errors, or selection.
7. Use the same words, order, sizes, and states for the same control everywhere.
8. Preserve the user's context after save, cancel, back, deep link, or validation.

## 3. Shared tokens

Use named tokens instead of new raw values in screen code. The exact color
values still come from the selected theme palette.

### Spacing

| Token | Value | Use |
| --- | ---: | --- |
| `spacing.xs` | 4 dp | icon/text or label/helper gap |
| `spacing.sm` | 8 dp | compact control gap, list metadata gap |
| `spacing.md` | 12 dp | card inner gap, disclosure body padding |
| `spacing.lg` | 16 dp | page inset, standard card padding |
| `spacing.xl` | 24 dp | major section separation |
| `spacing.xxl` | 32 dp | hero separation or empty-state breathing room |
| `spacing.micro` | 2 dp | tight visual separation |
| `spacing.fabClearance` | 96 dp | scroll clearance above the FAB |
| `spacing.menuBottom` | 80 dp | quick-capture menu offset above the FAB |

Rules:

- Use 16 dp horizontal page insets on phones.
- Use 12–16 dp card padding. Use 12 dp for compact nested panels.
- Use 8 dp between sibling controls and 16 dp between unrelated groups.
- Use at least 24 dp before a new primary section.
- Add bottom scroll space for the bottom tab bar or floating action button.
- Use `spacing.fabClearance` and `spacing.menuBottom` for floating capture
  geometry; do not add a new screen-local offset.

### Shape and elevation

| Token | Value | Use |
| --- | ---: | --- |
| `radius.control` | 10 dp | buttons, inputs, header actions |
| `radius.panel` | 14 dp | disclosures, empty states, small panels |
| `radius.card` | 16 dp | feature cards and list cards |
| `radius.hero` | 18 dp | balance and hero cards |
| `radius.fab` | 28 dp | 56 dp circular FAB |
| `border.default` | 1 dp | card, input, and selected-control border |

Use elevation only to separate a floating or raised surface. Borders and
surface color should carry most of the hierarchy. Do not add a new shadow for a
normal list row.

### Type

| Token | Size / line height | Use |
| --- | --- | --- |
| `type.label` | 12 / 16 | field labels, metadata, overlines |
| `type.bodySmall` | 13 / 19 | helper text, secondary metadata |
| `type.body` | 14 / 21 | normal body and note text |
| `type.control` | 15 / 20 | button labels and list titles |
| `type.section` | 17 / 22 | section headings |
| `type.card` | 18–20 / 24 | card values and card headings |
| `type.page` | 26 / 32 | page titles |
| `type.hero` | 32 / 38 | balance or primary metric |

Use weight 700 for labels and controls, 800 for headings and key values, and
normal weight for body copy. Do not use uppercase for a full sentence. Keep
currency, date, duration, and count units in the visible value or its label.

### Interactive sizes

| Control | Minimum hit area | Visual guidance |
| --- | ---: | --- |
| Standard button | 44 × 44 dp | 48 dp high when it is the primary form action |
| Text button | 44 dp high | visible label; no tiny inline tap target |
| Input | 44 dp high | 48 dp is acceptable for long-form entry |
| Segment / chip | 44 dp high | wrap instead of shrinking below the target |
| Disclosure row | 44 dp high | title, summary, and expanded state |
| Icon button | 44 × 44 dp | label and role are required |
| Checkbox / switch row | 44 dp high | make the row, not only the mark, tappable |
| FAB | 56 × 56 dp | one normal add action per primary list screen |
| Bottom tab | 48 dp high minimum | icon, text label, selected state |

The 44 dp rule is measured on the interactive view, not only on the visible
glyph. Compact visual styling may remain compact inside that hit area.

## 4. Theme contract

The theme supplies semantic roles, not screen-specific colors:

| Role | Meaning |
| --- | --- |
| `background` | page surface |
| `card` | normal content surface |
| `cardRaised` | nested or selected surface |
| `text` | primary content |
| `muted` | secondary content and helper copy |
| `accent` | primary action and selected state |
| `accentText` | text on the accent surface |
| `border` | low-emphasis separation |
| `input` | editable control surface |
| `warning` | attention or non-blocking risk |
| `danger` | destructive action or error |

Every palette must preserve readable contrast for text, controls, focus, and
disabled states in both light and dark modes. A palette may change hue, but it
must not change the meaning of a role.

The current palette and contrast choices are presentation state only and reset
on relaunch. This standard does not make them persistent.

## 5. Control contract

### Buttons

- `PrimaryButton`: one per form or task area. Use for save, confirm, start, or
  the next main action. It has a full 44–48 dp hit area.
- `SecondaryButton`: use when a visible alternative matters but is not the
  main action. It uses the card surface and a border.
- `TextButton`: use for navigation, edit, archive, restore, and low-risk
  secondary actions. Keep destructive text actions visibly dangerous.
- `IconButton`: use only for a repeated, obvious action such as clear or more.
  It must have an accessibility label and state.
- Destructive actions never share the same visual weight as save or continue.
  Confirmation is required for delete and replacement restore.

Every button has these states where relevant: enabled, pressed, disabled, and
busy. Busy buttons keep their layout and ignore repeat taps. The label explains
the result, for example `Saving...`, `Delete note`, or `Open attachment`.

### Segments and chips

- Use segments for one active choice from a short, stable set: period, type,
  view, or sort order.
- Use chips for filters or a small set of independent categories.
- A selected state must use at least two signals: surface/border plus text,
  check, or an accessibility state.
- Do not place a long list of projects, tasks, or records into one horizontal
  segment row. Use a labeled list or picker flow instead.

### Inputs

Every input has a visible label, a useful placeholder only when needed, and
one of: helper text, validation error, or no extra message. Labels do not
disappear when the field has focus or text.

- Validate required fields before save and show the error near the field.
- Keep the primary save action visible after the keyboard opens when practical.
- Use the correct keyboard and input type for amounts, dates, times, and text.
- Preserve entered values after a validation error.
- For multiline content, keep a clear minimum height and allow system font
  scaling.

### Switches and toggles

Use a real switch when the value is a simple on/off setting. Use a labeled row
or `ToggleButton` for a compact multi-choice or weekday selector. The entire
row is the hit area, and the accessibility state exposes `checked` or
`selected`.

Turning on an optional feature reveals its dependent controls immediately.
Turning it off hides them without silently deleting saved data unless the
product rule explicitly says so.

### Disclosures

A disclosure is for optional detail, management, filters, settings, or advanced
options. Its header always contains a title, a short summary when useful, a
visible plus/minus or equivalent state, and `accessibilityState.expanded`.
Do not put the screen's primary action only inside a collapsed disclosure.

Nested disclosures use the compact panel style and must not create more than
two visible nesting levels.

### Lists and cards

- A list row shows the title first, then the most useful metadata, then one
  clear action or affordance.
- Keep complete/reopen visible for tasks; put management and destructive
  actions behind `More`.
- Tapping a card opens its normal detail or edit context only when that is the
  established behavior for that screen.
- Archived, completed, missing, and unavailable records have text labels; do
  not communicate those states by opacity or color alone.

## 6. Screen flow contract

### List screens

1. Page title and short scope or status line.
2. Primary current records or summary.
3. One primary add action.
4. Short local filters or tabs when they are part of the main job.
5. Optional tools in closed disclosures.
6. Empty, error, or unavailable states with a next action.

Home, Money, Notes, and Tasks follow this list-first pattern. The current
progressive-disclosure behavior remains the default.

### Forms

1. Open from the relevant list, quick capture, shortcut, or focused result.
2. Show the smallest required fields first.
3. Reveal optional fields only when they are relevant.
4. Keep one primary save action and one explicit cancel action.
5. Validate inline without clearing valid input.
6. Disable repeat save while the local commit is running.
7. Return to the previous context and show the changed result after success.

### High-impact actions

Delete, replacement restore, archive when it hides data, and permission
changes must state what will happen before the action. Use confirmation for
irreversible actions. If an action can be undone safely, expose undo with a
bounded, explicit lifetime rather than silently guessing.

### Feedback states

Every screen that reads or writes local data defines:

- loading: what is being opened or read;
- empty: why there is no record and what can be done next;
- error: what failed and what remains unchanged;
- success: what changed, without claiming a remote or native effect that did
  not happen;
- unavailable: the missing permission, platform capability, or input.

## 7. Accessibility and UX quality bar

- All interactive controls expose the correct role, label, and selected,
  checked, expanded, or disabled state.
- All interactive hit areas are at least 44 dp/pt, including compact segments,
  chips, weekday buttons, more buttons, and text actions.
- Text can scale without clipping, overlap, or hidden actions.
- Status is not conveyed by color alone. Use text, icons, check marks, or
  structure as a second signal.
- Money shows currency and sign; durations show units; dates are readable;
  charts have a text equivalent.
- Focus remains on a useful control after validation, navigation, and list
  updates.
- TalkBack and VoiceOver can complete add, edit, complete, search, filter,
  archive, delete, export, restore, and permission flows.
- Dark mode, large text, RTL layout, reduced motion, and a non-default
  currency are checked before release.

## 8. Implementation sequence

This is the recommended order for the UI standardization pass:

1. Extract spacing, type, shape, size, and semantic-color tokens from
   `createStyles` into a small typed UI module.
2. Add shared primitives for primary, secondary, text, icon, segment, chip,
   disclosure, input, and feedback states. Keep behavior in the primitive
   only when it is truly shared.
3. Migrate Home, Money, Notes, Tasks, App Time, Settings, Review, Search, and
   Data tools screen by screen.
4. Fix all interactive controls below 44 dp and all missing role/state labels.
5. Remove screen-local duplicates only after the migrated screen has equivalent
   behavior and tests.
6. Run focused component tests, TypeScript, lint, Jest, and Android UI smoke
   checks at each screen boundary.

The refactor must preserve current product behavior, including temporary theme
state, current disclosure defaults, list-first flows, local-only data writes,
and the existing native entry-point rules.

## 9. Acceptance checks

A screen is standardized when:

- it uses named tokens and shared controls for common UI;
- it has one clear primary action and no competing duplicate add action;
- every interactive target is at least 44 dp/pt;
- form save/cancel/busy/error behavior follows the same contract;
- empty, loading, error, and unavailable states are explicit;
- labels, roles, and state announcements pass focused tests;
- large text and dark theme do not clip or remove actions;
- Android smoke evidence confirms the primary flow still works;
- no schema, network, worker, or background behavior changed without a
  separate feature decision.

## 10. Open decisions

- Whether the shared primitives should live under `src/app/ui/` or a different
  existing module boundary.
- Whether the secondary button needs a visible shipped variant, or whether the
  current text-button pattern is sufficient for the first migration.
- Whether the app should add a dedicated success color role, instead of using
  `accent` for success copy in some current screens.
- Which screens require a real native `Switch` instead of the current typed
  pressable toggle row.
