# Roadmap

## Phase 0 — foundation (complete)

Documentation, Expo shell, TypeScript, navigation, quality scripts, agent workflow and platform feasibility investigation.

## Phase A — Anki-compatible foundation (complete for the supported MVP scope)

Schema/migrations, repositories, nested decks, notes/cards, validation, global revision settings, pinned FSRS integration, review history and the first study use case are implemented. The settings slice is complete: daily new-card and review limits are global, persist locally, reset by UTC day, and learning/relearning steps are configurable with validation and contextual help. The current editing slice is also complete for the existing fields: front, back, example and extra can be changed; history is retained and only a front/back change resets both direction cards' current FSRS state. New notes and migrated existing notes support independent forward and reverse cards, with an editor choice between both directions, forward only or reverse only. Tag assignment is complete in the editor: tags are note-level, normalized, shared by both directions and excluded from FSRS and counters. The supported text-card `.apkg` import slice is implemented, including deck hierarchy, tags, supported directions, interpretable scheduling state and imported review history. Complex templates and media are explicitly deferred. `.apkg` export is also deferred.

## Next slice: Anki compatibility beyond the MVP

The supported import slice is implemented and documented in [ANKI_IMPORT.md](ANKI_IMPORT.md) and ADR-0009. Future work is limited to broader Anki compatibility: media import, more complex template types, stronger repeat-import/replacement coverage, export, and additional real-device fixtures. Preserving progress remains required; FSRS compatibility and legacy-state conversion must continue to be validated per source format.

## Phase B — phone-use review interventions (investigation first)

Phase B is primarily focused on two product intents:

1. After an eligible phone unlock, prompt the user to complete three vocabulary reviews.
2. After each eligible three-minute phone-use sequence, prompt the user to complete five vocabulary reviews.

These are product goals, not yet implementation promises. Work starts with an Android-only feasibility spike; iOS is intentionally deferred. The spike must validate Android capabilities, the Usage Access permission, Expo/development-build requirements, background behavior, battery impact, privacy and Google Play policy constraints. The implementation may need to use notifications or another supported mechanism instead of intercepting unlocks or displaying an unrestricted overlay. The behavior must also define due-card exhaustion, completed daily reviews, opt-out/configuration and eligible-app selection.

Current status: the Android development-build diagnostic and an opt-in notification prototype have been validated on the OnePlus test device while Vocabulary is backgrounded. In test mode, a visible foreground service polls Usage Access once per second, detects `KEYGUARD_HIDDEN` for each unlock, and detects ten seconds of continuous eligible usage. Reopening an app from Android's recent-app list starts a fresh test sequence. Notification taps open the application home screen; no study screen is opened automatically. This is not yet accepted as production behavior: force-stop, reboot, battery restrictions, selected-app configuration, Google Play foreground-service policy and the card-snapshot policy still require validation. The intended production usage threshold remains three minutes.

The existing study engine remains the only scheduling engine. Any intervention must launch or offer the existing review flow and must not create a separate FSRS path.

## Phase A completion audit

Implemented in the current slice: SQLite schema and migrations, repositories and transactional writes, nested decks with recursive soft deletion, bidirectional note/card creation, editing and deletion, pinned FSRS scheduling per direction, append-only review history, study queues across sub-decks, due-time previews, same-day early review, refreshed counters, consistent blue/new, red/today and green/future card categories, and supported text-card `.apkg` import with preserved imported history and scheduling state.

Phase A is complete for the accepted MVP scope. The explicit limitations are image/audio media import, complex Anki templates, `.apkg` export and broader compatibility validation. Editing preserves review history and resets both direction cards' current FSRS state only when the normalized front or back changes. iOS device validation is deliberately outside the current MVP acceptance criteria.

## Later versions

Contextual phrases, fill-in-the-blank and challenges using the same learning engine where appropriate; AI examples/explanations; accounts, sync and conflict resolution.

## Feasibility gates

Unlock and three-minute usage interventions must demonstrate platform behavior, permissions, background delivery, battery impact, privacy implications and store-policy acceptability on real devices. No cross-platform guarantee is made before that evidence exists. See [FEASIBILITY.md](FEASIBILITY.md) for the current platform investigation.
