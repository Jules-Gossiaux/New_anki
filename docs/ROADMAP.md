# Roadmap

## Phase 0 — foundation (complete)

Documentation, Expo shell, TypeScript, navigation, quality scripts, agent workflow and platform feasibility investigation.

## Phase A — Anki-compatible foundation (current; settings slice complete)

Schema/migrations, repositories, nested decks, notes/cards, validation, global revision settings, pinned FSRS integration, review history and the first study use case are implemented. The settings slice is complete: daily new-card and review limits are global, persist locally, reset by UTC day, and learning/relearning steps are configurable with validation and contextual help. Full note editing, two fixed templates, tag UX and staged `.apkg` import remain open. `.apkg` export is deliberately deferred until after the import and core editing work.

## Phase B — first product innovations

Accessible mobile study UX, restrained motion, progress and review friction reduction. Build a native capability spike for notifications, Android usage access and iOS Device Activity before selecting an intervention product shape.

## Phase A completion audit

Implemented in the current slice: SQLite schema and migrations, repositories and transactional writes, nested decks, basic note/card creation and deletion, pinned FSRS scheduling, append-only review history, study queues across sub-decks, due-time previews, same-day early review, refreshed counters, and consistent blue/new, red/today and green/future card categories.

Still required before declaring Phase A complete: full note/card editing, tags and two fixed template choices, staged `.apkg` import with fixtures and media handling, and broader Android regression validation. Editing will preserve review history and only deeply changed primary fields may reset current FSRS state. `.apkg` export and iOS device validation are deliberately outside the current MVP acceptance criteria.

## Later versions

Contextual phrases, fill-in-the-blank and challenges using the same learning engine where appropriate; AI examples/explanations; accounts, sync and conflict resolution.

## Feasibility gates

Unlock and three-minute usage interventions must demonstrate platform behavior, permissions, background delivery, battery impact and store-policy acceptability on real devices. No cross-platform guarantee is made before that evidence exists.
