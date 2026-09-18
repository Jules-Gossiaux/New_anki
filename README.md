# Vocabulary

Vocabulary is a mobile-first vocabulary learning app aiming to combine Anki's technical effectiveness and FSRS scheduling with a more accessible, pleasant review experience.

## Status

The MVP is complete for the supported Android-first scope. The Expo shell, project rules, architecture, test/tooling setup, SQLite foundation, global revision settings, FSRS scheduling, review history, study/review flow, deck/card management, bidirectional cards, normalized tags, local text-card Anki import and Android phone-use review interventions are in place. Android is the current validation platform; iOS validation and broader compatibility work remain outside the MVP acceptance criteria.

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

Full Anki compatibility is not claimed. The supported import slice reads text-card `.apkg` collections and preserves supported scheduling/history data, but complex templates and media are not supported. `.apkg` export and CSV convenience import/export are not available. Android interventions use an opt-in foreground service, Usage Access and configurable notification/overlay/direct-opening delivery; a force-stop requires reopening Vocabulary to reactivate the service. Android is the current validation platform; iOS remains a target but is outside the MVP acceptance criteria.

## Import Anki

L’écran d’accueil propose un import local de paquets `.apkg`. Les collections classiques et modernes sont lues avant confirmation, puis les decks hiérarchiques, notes, tags, cartes directes/inversées et les états FSRS interprétables sont importés dans une transaction. Les événements d’historique importés sont conservés séparément afin de ne pas fausser les compteurs de révision.

Les templates complexes, images et audio ne sont pas pris en charge. L’import est interrompu avec une modale explicite lorsqu’un paquet contient des médias. L’export Anki n’est pas encore disponible.
