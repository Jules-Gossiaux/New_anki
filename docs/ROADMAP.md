# Roadmap

## Phase 0 — foundation (complete)

Documentation, Expo shell, TypeScript, navigation, quality scripts, agent workflow and platform feasibility investigation.

## Phase A — Anki-compatible foundation (current)

Schema/migrations, repositories, nested decks, notes/cards/templates, validation, settings, pinned FSRS integration, review history and the first study use case are implemented. Full note editing and staged `.apkg` compatibility remain open.

## Phase B — first product innovations

Accessible mobile study UX, restrained motion, progress and review friction reduction. Build a native capability spike for notifications, Android usage access and iOS Device Activity before selecting an intervention product shape.

## Phase A completion audit

Implemented in the current slice: SQLite schema and migrations, repositories and transactional writes, nested decks, basic note/card creation and deletion, pinned FSRS scheduling, append-only review history, study queues across sub-decks, due-time previews, same-day early review, refreshed counters, and consistent blue/new, red/today and green/future card categories.

Still required before declaring Phase A complete: revision settings, full note/card editing, tags and template management UX, staged Anki import/export with fixtures and media handling, and broader Android regression validation. iOS device validation is deliberately outside the MVP acceptance criteria.

## Later versions

Contextual phrases, fill-in-the-blank and challenges using the same learning engine where appropriate; AI examples/explanations; accounts, sync and conflict resolution.

## Feasibility gates

Unlock and three-minute usage interventions must demonstrate platform behavior, permissions, background delivery, battery impact and store-policy acceptability on real devices. No cross-platform guarantee is made before that evidence exists.
