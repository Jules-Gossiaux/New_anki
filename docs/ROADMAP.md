# Roadmap

## Phase 0 — foundation (complete)

Documentation, Expo shell, TypeScript, navigation, quality scripts, agent workflow and platform feasibility investigation.

## Phase A — Anki-compatible foundation (complete for the supported MVP scope)

Schema/migrations, repositories, nested decks, notes/cards, validation, global revision settings, pinned FSRS integration, review history and the first study use case are implemented. The settings slice is complete: daily new-card and review limits are global, persist locally, reset by UTC day, and learning/relearning steps are configurable with validation and contextual help. The current editing slice is also complete for the existing fields: front, back, example and extra can be changed; history is retained and only a front/back change resets both direction cards' current FSRS state. New notes and migrated existing notes support independent forward and reverse cards, with an editor choice between both directions, forward only or reverse only. Tag assignment is complete in the editor: tags are note-level, normalized, shared by both directions and excluded from FSRS and counters. The supported text-card `.apkg` import slice is implemented, including deck hierarchy, tags, supported directions, interpretable scheduling state and imported review history. Complex templates and media are explicitly deferred. `.apkg` export is also deferred.

## Next slice: Anki compatibility beyond the MVP

The supported import slice is implemented and documented in [ANKI_IMPORT.md](ANKI_IMPORT.md) and ADR-0009. Future work is limited to broader Anki compatibility: media import, more complex template types, stronger repeat-import/replacement coverage, export, and additional real-device fixtures. Preserving progress remains required; FSRS compatibility and legacy-state conversion must continue to be validated per source format.

## Phase B — first product innovations

Accessible mobile study UX, restrained motion, progress and review friction reduction. Build a native capability spike for notifications, Android usage access and iOS Device Activity before selecting an intervention product shape.

## Phase A completion audit

Implemented in the current slice: SQLite schema and migrations, repositories and transactional writes, nested decks with recursive soft deletion, bidirectional note/card creation, editing and deletion, pinned FSRS scheduling per direction, append-only review history, study queues across sub-decks, due-time previews, same-day early review, refreshed counters, consistent blue/new, red/today and green/future card categories, and supported text-card `.apkg` import with preserved imported history and scheduling state.

Phase A is complete for the accepted MVP scope. The explicit limitations are image/audio media import, complex Anki templates, `.apkg` export and broader compatibility validation. Editing preserves review history and resets both direction cards' current FSRS state only when the normalized front or back changes. iOS device validation is deliberately outside the current MVP acceptance criteria.

## Later versions

Contextual phrases, fill-in-the-blank and challenges using the same learning engine where appropriate; AI examples/explanations; accounts, sync and conflict resolution.

## Feasibility gates

Unlock and three-minute usage interventions must demonstrate platform behavior, permissions, background delivery, battery impact and store-policy acceptability on real devices. No cross-platform guarantee is made before that evidence exists.
