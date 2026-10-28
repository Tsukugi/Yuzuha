# Progressive disclosure — 28.10.2026

YZ-025 is implemented in the unpublished workspace. Before this pass, period
alternatives, money choices, search naming and configuration forms competed
with the content being viewed. The rule is now: show the main action and
current value; reveal secondary choices and follow-up forms on request.

## Implemented scope

- Home, Review and App Time show one Period menu with the current choice.
- Money capture uses Type, Category and multi-account menus. Repeat operation
  starts closed for normal capture; the periodic entry point reveals it.
- Notes uses one Notes view menu. Save this search appears for a nonempty query
  and keeps its naming field inside a closed section; matching notes stay visible.
- Money supporting-record forms, task organization forms, app-group editing and
  time-goal creation open on demand. Existing saved records stay visible.
- A new edit target opens its matching form. Folding preserves parent-owned
  drafts; validation messages sit outside the new deferred forms.
- Task reminders uses two labeled checkbox controls and a closed Delivery
  options section with the current quiet-hours/snooze summary. Save stays visible.
- Focus controls remain available inside Focus sessions; Recent sessions starts
  closed. Android Back closes the open menu or deferred section first.

`src/app/ProgressiveControls.tsx` owns the shared menu and deferred section.
Menus show selected checks and expose selection/expansion accessibility state.
Expandable sections and menus are used for these flows; no new modal or tooltip
is required. Essential controls remain labeled and reachable by touch.
No schema, dependency, installer, version, release-feed or background-work
change is part of YZ-025.

## Validation

- `npm test`: 64 suites / 324 tests passed; see
  `artifacts/progressive-disclosure-2026-10-28/jest-final.log`.
- `npm run typecheck` and `npm run lint`: passed.
- `:app:assembleLocalTest -PreactNativeArchitectures=x86_64 --max-workers=2`:
  passed; see `build-final.log` in the same evidence directory.
- Focused assertions cover hidden choices/forms, selected period changes,
  preserved recurrence/search drafts, edit-target reveal, Back collapse and
  errors remaining visible after folding.
- API 35 emulator `emulator-5556`, 320×640 dp: replacement install of
  `dev.yuzuha.localtest` preserved the smoke workspace. Production and physical
  devices were not used for this pass.

Final APK SHA-256:
`DEC6A57FF9957663254C1B719D0B218F98A5C4885A42690EEFADC9393D118690`.
This identifies a local test APK, not a published release.

## Screen evidence

PNG and XML pairs plus `journey.jsonl` are under
`artifacts/progressive-disclosure-2026-10-28/`; the named TypeScript journey is
`tests/usability.smoke.ts` in that directory, using the copied Joy ADB driver.
Yuzuha has no `smoke:check` script or `docs/bluestacks-smoke-tests.md`; the driver
runs `checkDevice()` before each action instead.

| Expected state | Observed evidence |
| --- | --- |
| One current period control; alternatives only when opened | `01-overview`, `02-period-menu`, `03-month`; final layout `31-final-overview` |
| Money capture keeps essentials visible; recurrence folds | `05-capture` through `09-collapse-repeat` |
| Account and project forms start closed and fold with Back | `13-money-settings` through `20-fold-project` |
| Reminder detail remains optional and selected marks are visible | `24-delivery-options`, `25-delivery-fold`, final `39-final-reminders` |
| Search naming opens on request; folding retains query/results | final `33-final-search` through `35-fold-save-search` |
| App Time keeps one period selector; saved focus history starts closed, opens and folds with Back | final `42-app-time`, `45-focus-controls`, `46-focus-history`, `47-fold-history` |

Captures 01–30 are intermediate-build evidence; 31 onward use the final APK,
which includes control spacing and explicit checkbox contrast. The earlier
reminder checkbox visibility issue was corrected before the final build.
Exploratory step `30-search-keyboard` failed its expected search-screen check:
Android Back with the handwriting toolbar visible returned to the launcher.
It is retained in the log, not counted as a passing assertion. Subsequent
search checks reopened the app and validated explicit section controls.

The final launch returned to Overview (`48-final-home`); the final-process
AndroidRuntime/ReactNativeJS error capture is empty (`final-process-errors.log`).

This is targeted Android smoke, not exhaustive flow, screen-reader, physical
keyboard, physical-device or iOS coverage. Review shares the tested period
component; its updated control was checked in tests rather than a new live
Review journey.

Publication update (28.10.2026): these UI changes are included in the verified
[0.3.0 native baseline](releases/v0.3.0.md). Earlier unpublished/intermediate
notes above retain their original test context. Latest delivery includes the
complete signed APK and 0.3 bundle, with both earlier bundle feeds preserved.
