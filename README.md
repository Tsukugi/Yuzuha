# Yuzuha

Yuzuha is a private, local-first personal tracker for Android. It brings four kinds of information into one calm place:

- money and spending
- time spent in other apps
- notes
- tasks

The app has an Android-first product plan and a native shell that can also support iOS. The shell checks for a newer JavaScript bundle before it presents `MainApp`.

## Repository status

Phase 3 core is implemented. The repository contains the TypeScript app shell, local persistence, an embedded-bundle launch gate, Android/iOS native projects, Home/Money/Notes/Tasks flows, Android app-time reads, package exclusions, time goals, money editing/deletion, and archive controls. SQLite, reports, sync, and later full-product phases remain planned.

## Technology baseline

- React Native `0.86.0` (current implementation baseline, verified July 2026)
- React `19.2.8`
- TypeScript with strict checking
- Metro and the React Native CLI
- AsyncStorage `3.1.x` for small installer metadata and preferences only
- A SQLite-backed repository for product data, to be added during implementation

Use locked dependency versions in implementation branches. The current baseline is the newer React Native 0.86 line requested for this project.

## Planned first release

The Android MVP will provide a dashboard, manual money entries, daily app-time summaries, searchable notes, and task lists. It will work without an account or network after the initial app install. Cloud sync is out of scope for the MVP.

See [docs/README.md](docs/README.md) for the complete documentation set and reading order.

The documentation covers both the local-first MVP and the later full product. The implementation plan is phased so the first release stays small without losing the long-term design.

## Local setup

The package scripts cover the current app and quality gates:

```bash
npm install
npm run start
npm run android
npm run lint
npm run typecheck
npm run test
npm run check-bundle
```

The Android build needs Android Studio, an Android SDK, Java 17, and a configured emulator or device. iOS development needs Xcode on macOS.

## Installer rule

Every startup follows the installer contract in [docs/installer.md](docs/installer.md): check signed metadata, download a newer bundle if available, verify it, activate it atomically, and only then render the main app. If the network is unavailable, use the newest verified local bundle. Never activate an unverified or partially downloaded bundle.
