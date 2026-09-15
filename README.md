# Vocabulary

Vocabulary is a mobile-first vocabulary learning app aiming to combine Anki's technical effectiveness and FSRS scheduling with a more accessible, pleasant review experience.

## Status

Phase A is in progress. The Expo shell, project rules, architecture, test/tooling setup, platform feasibility investigation and SQLite foundation are in place. Decks, notes and basic cards can be created, persisted, displayed and deleted through the current Android-tested management flows. The study flow, FSRS scheduling, review history, full note editing and import/export are not implemented yet.

## Quick start

Requirements: Node.js LTS, npm, and Expo's Android/iOS development environment. This repository currently uses Expo SDK 57 and React Native 0.86.

```powershell
npm install
npm run start
npm run android
npm run ios # requires macOS/native iOS tooling; Expo Go is an alternative during early work
```

Quality commands:

```powershell
npm test
npm run typecheck
npm run lint
npm run format:check
```

## Structure

`src/app` contains Expo Router routes. `src/domain` contains platform-independent vocabulary logic and will contain scheduling logic. `src/application` orchestrates use cases. `src/infrastructure` contains SQLite, repositories and will contain import/export adapters. `src/ui` will contain reusable UI and design-system code. Tests should live beside modules or under `tests/` when cross-module.

Read [AGENTS.md](AGENTS.md) before coding. The architecture and staged plan are in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), with workflow and testing guidance in [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) and [docs/TESTING.md](docs/TESTING.md).

## Important limitations

Full Anki `.apkg` import/export is planned but not implemented. FSRS scheduling and the study/review flow are also still pending. Unlock and phone-use interventions require platform-specific feasibility work; the current product direction is notification- or supported-extension-based rather than an assumed universal unlock hook. Android is the current validation platform; iOS remains a target but has not yet been validated on a real device.
