# Yuzuha

Yuzuha is a private, local-first personal tracker for Android. It brings four kinds of information into one calm place:

- money and spending
- time spent in other apps
- notes
- tasks

The app has an Android-first product plan and a native shell that can also support iOS. The shell checks for a newer JavaScript bundle before it presents `MainApp`.

## Repository status

This repository is currently a starter scaffold. It contains the React Native and Metro configuration, but it does not yet contain the `src/` app or native Android/iOS projects. The target behavior and build order are documented before implementation begins.

## Technology baseline

- React Native `0.83.0` (the project baseline recorded for January 2026)
- React `19.2.0`
- TypeScript with strict checking
- Metro and the React Native CLI
- AsyncStorage for small installer metadata only
- A SQLite-backed repository for product data, to be added during implementation

Use locked dependency versions in implementation branches. Do not upgrade the React Native baseline without a documented decision and a release check.

## Planned first release

The Android MVP will provide a dashboard, manual money entries, daily app-time summaries, searchable notes, and task lists. It will work without an account or network after the initial app install. Cloud sync is out of scope for the MVP.

See [docs/README.md](docs/README.md) for the complete documentation set and reading order.

The documentation covers both the local-first MVP and the later full product. The implementation plan is phased so the first release stays small without losing the long-term design.

## Local setup

The current package scripts are a scaffold for the future app:

```bash
npm install
npm run start
npm run android
npm run lint
npm run test
```

The Android build also needs Android Studio, an Android SDK, and a configured emulator or device. iOS development needs Xcode on macOS.

## Installer rule

Every startup follows the installer contract in [docs/installer.md](docs/installer.md): check signed metadata, download a newer bundle if available, verify it, activate it atomically, and only then render the main app. If the network is unavailable, use the newest verified local bundle. Never activate an unverified or partially downloaded bundle.
