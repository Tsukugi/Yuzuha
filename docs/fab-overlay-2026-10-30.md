# Floating add buttons — 30.10.2026

YZ-027 fixes the blank 88 dp row occupied by add buttons in normal layout.
Home, Money, Notes and Tasks now position their FAB absolutely over the full
list viewport. Home uses an absolute pass-through layer for quick capture.
Only scroll-end content receives 96 dp clearance; opening capture forms removes
that list clearance. Money Save/Cancel retain their keyboard-safe separate row.

The regression test failed before the fix and passed after it. Existing Money,
Settings and usability checks pass: 3 suites / 32 tests. Evidence logs:
`artifacts/fab-before.log` and `artifacts/fab-after.log`.
The full run passes: 65 suites / 327 tests (`artifacts/fab-jest.log`).
TypeScript and lint pass. Android visual verification follows below.
No version, dependency, schema, installer or native behavior changes. Published in 0.3.1.


Android verification: API 35 emulator at 320×640 dp, embedded localTest build
passed and installed without clearing data. `01-home` shows content behind the
FAB down to bottom navigation; `02-quick-menu` and `03-close-menu` prove capture
menu positioning and Back; `05-home-bottom` shows the last Home card accessible
above the button. Money/Notes/Tasks list captures are 06–08. PNG/XML and the named
TypeScript journey are under `artifacts/fab-overlay-2026-10-30/`.
Exploratory step 04 expected Recent notes, but the selected Today period had no
recent note updates. Its failed assertion remains in journey.jsonl; the final
Notes summary card was visible and the corrected step 05 checks that actual state.
Physical-device and iOS repeat checks were not run.


Publication: [0.3.1](releases/v0.3.1.md) includes verified live OTA activation,
next-launch promotion and note preservation on native 0.3.0.
