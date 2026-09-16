# Vocabulary

Vocabulary is a mobile-first vocabulary learning app aiming to combine Anki's technical effectiveness and FSRS scheduling with a more accessible, pleasant review experience.

## Status

Phase A is in progress. The Expo shell, project rules, architecture, test/tooling setup, platform feasibility investigation, SQLite foundation, global revision settings, FSRS scheduling, review history and the first study/review flow are in place. Decks, notes and basic cards can be created, persisted, displayed and deleted through Android-tested management flows. The remaining Phase A work includes full note editing, tags/templates UX, staged import/export and broader compatibility validation.

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

`src/app` contains Expo Router routes. `src/domain` contains platform-independent vocabulary and scheduler contracts. `src/application` orchestrates use cases. `src/infrastructure` contains SQLite, repositories, and the FSRS and import/export adapters. `src/ui` will contain reusable UI and design-system code. Tests should live beside modules or under `tests/` when cross-module.

Read [AGENTS.md](AGENTS.md) before coding. The architecture and staged plan are in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), with workflow and testing guidance in [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) and [docs/TESTING.md](docs/TESTING.md).

## Important limitations

Full note editing, tags/templates UX and full Anki `.apkg` import/export are not implemented yet. CSV convenience import/export is not available either, so no Anki compatibility claim is made. Unlock and phone-use interventions require platform-specific feasibility work; the current product direction is notification- or supported-extension-based rather than an assumed universal unlock hook. Android is the current validation platform; iOS remains a target but is outside the MVP acceptance criteria.
