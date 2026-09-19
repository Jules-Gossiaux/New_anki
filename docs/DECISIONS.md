# Architectural decisions

## ADR-0001 — Expo + React Native + TypeScript (accepted)

Expo provides a productive native app baseline and development-build path while React Native supports Android/iOS sharing. TypeScript is used for domain contracts and safer refactoring.

## ADR-0002 — Local-first SQLite (accepted)

SQLite provides transactional local persistence, migrations, indexes and a relational shape suitable for later synchronization. Backend and account infrastructure are intentionally postponed.

## ADR-0003 — Isolated FSRS scheduler (accepted)

Scheduling is a platform-independent module behind an application port so it can be tested independently and cannot be coupled to screens or SQL. The current implementation uses the pinned `ts-fsrs` 5.4.2 package with deterministic fuzzing disabled; the adapter remains replaceable behind the scheduler contract.

## ADR-0004 — Staged `.apkg` compatibility (accepted)

An `.apkg` file includes more than CSV fields (collection database, templates, scheduling metadata and media). Investigation and fixture-based import will precede compatibility claims.

## ADR-0005 — Intervention feasibility gate (accepted)

Phone unlock and cross-app usage behavior differs substantially by platform and permission model. We will document evidence and use supported notification/extension mechanisms instead of simulating a universal unlock interceptor.

## ADR-0006 - Scope of the first settings and card-model iteration (accepted)

Revision settings are global application settings rather than per-deck settings for the first implementation. The initial card-model iteration will provide two fixed templates: front-to-back and back-to-front. Editing a note preserves its append-only review history; changing the normalized front or back resets only the card's current FSRS state while retaining all historical review logs. Changes to example and extra preserve the current FSRS state. `.apkg` export is explicitly deferred until after the import and core editing work.

## ADR-0007 - Note-level tags (accepted)

Tags belong to notes rather than individual direction cards, so both forward and reverse cards share the same organization metadata. Tags are created from the card editor, normalized by trimming and lowercasing, deduplicated, and removable from the note. Tag assignment does not affect FSRS scheduling, review history or deck counters. Global tag search and orphan cleanup are deferred.

## ADR-0008 - Selectable study directions (accepted)

The card editor lets the user choose `both`, `forward` (`Mot → traduction`) or `reverse` (`Traduction → mot`) directions for a note. The default is both directions. Each selected direction is an independent card with its own FSRS state and review history. Removing a direction soft-deletes only that card, preserving its history; re-enabling it creates a new card with a fresh FSRS state. Changing the direction selection never resets a retained direction card; note-level content editing follows ADR-0006.

## ADR-0009 - Anki import preservation and replacement (accepted; supported text slice implemented)

Import locally from `.apkg`, preserving supported source cards and progress as faithfully as possible. Repeated imports must avoid duplicates. Confirmed replacement makes imported content and valid scheduling authoritative while preserving append-only local review history. Supplementary fields retain their labels in extra information. Reuse decks by full path, explicitly report unsupported templates, and import otherwise valid cards even when a media file fails, with a visible per-card missing-media notice. Export remains deferred.

The [import contract](ANKI_IMPORT.md) records the supported text-card slice and remaining compatibility investigations. Exact FSRS transfer and legacy scheduling conversion are only supported where the source state is interpretable; no automatic reset of imported progress or improvised scheduler conversion is authorized. Media and complex template support remain explicitly deferred.

## ADR-0010 - Recursive soft deletion of decks (accepted)

Deleting a deck marks the selected deck, all descendant decks and all cards assigned to that subtree as deleted in one SQLite transaction. The operation is allowed regardless of contents. Notes and append-only review logs are preserved because notes may be shared by direction cards and review history must remain recoverable.

## ADR-0011 - Phase B phone-use review interventions (Android slice accepted; production hardening pending)

The product vision includes two interventions: prompt three vocabulary reviews after an eligible phone unlock, and prompt five reviews after each eligible three-minute phone-use sequence. These are product intents, not authorization to assume unrestricted unlock interception, background execution or cross-platform support. The first feasibility spike is Android-only and must validate Android APIs, Usage Access, Expo/development-build requirements, background behavior, privacy and Google Play policy constraints. iOS investigation is deferred.

The final mechanism may be a notification or another supported flow. An Android overlay is permitted only as an explicit opt-in prompt requiring the system “display over other apps” permission; it must not be implemented as a hidden AccessibilityService or unrestricted takeover. It must reuse the existing study engine, respect due-card availability and daily limits, provide opt-out/configuration, and explicitly handle sessions with no available cards. Eligible applications, continuous versus cumulative usage and lock/reset semantics remain investigation questions.

The Android implementation uses an opt-in visible foreground service. It polls Usage Access events once per second, uses the observed `KEYGUARD_HIDDEN` event for each unlock, and checks eligible foreground usage before sending a reminder after the configured continuous-usage threshold (three minutes by default, with a one-minute testing value). Leaving an eligible app clears its session; reopening it from Android's recent-app list starts a fresh one. Reminder actions target the intervention study route, which reuses the existing FSRS engine. The selected delivery mode is a notification, an Android reminder prompt requiring `SYSTEM_ALERT_WINDOW`, or direct opening of the study route. The reminder has explicit `Fermer` and `Commencer` actions and falls back to a notification when unavailable; direct opening also falls back when Android blocks the background activity launch. Android force-stop remains an explicit limitation: Vocabulary must be reopened to reactivate the service.

The intervention study uses all decks by default, with an optional global priority deck that takes precedence when selected. A trigger starts a session with up to three cards after unlock or up to five cards after eligible app use; if fewer eligible cards are available, it uses the smaller number. Leaving a session abandons that session, and the next trigger starts a new one. The user may choose a notification, a reminder prompt or direct opening. The prompt does not implement study logic; pressing `Commencer` opens the existing study route after an explicit user action. Both prompt and direct-opening modes fall back to a notification when their Android capability is unavailable.

## ADR-0013 - Configurable intervention size and study-note visibility (accepted)

The number of cards in phone-triggered sessions is global and configurable independently for unlocks and eligible application usage. The defaults remain three cards after unlock and five cards after application usage, with bounded values from one to twenty. The normal daily limits and the existing FSRS engine still apply.

Study sessions also expose a global preference to show or hide the note's example and extra-information fields after revealing an answer. Hiding is presentation-only: the values remain persisted, editable and importable. Tags and the front/back answer remain unaffected.

## ADR-0014 - Per-deck daily limits with inheritance (accepted)

Each deck may override the global daily limit for new cards and/or reviews independently. An empty override means inheritance: a root deck inherits the global application setting, while a child deck inherits the effective value of its parent. Limits are resolved from the root toward the selected deck, so a child override only replaces the field it explicitly defines.

The effective limit applies to the selected deck's complete subtree and its daily progress is counted within that same scope. This keeps the limits shown on deck cards consistent with the cards offered when studying that deck. The values affect study availability only; they do not modify FSRS state or review history.

## ADR-0012 - Avoid consecutive cards from the same note (accepted)

When a note has both study directions enabled, its cards must not normally be presented consecutively because the second direction can reveal the answer from the first. After each selection, the study queue prefers a card from a different note while preserving the existing availability and due-order priorities. If every remaining candidate belongs to the previous note, consecutive cards are allowed because no valid separation is possible. This is a queue-ordering policy only; it does not change FSRS state, scheduling or daily counters.
