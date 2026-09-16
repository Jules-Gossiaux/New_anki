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

## ADR-0009 - Anki import preservation and replacement (accepted; implementation pending)

Import locally from `.apkg`, preserving supported source cards and progress as faithfully as possible. Repeated imports must avoid duplicates. Confirmed replacement makes imported content and valid scheduling authoritative while preserving append-only local review history. Supplementary fields retain their labels in extra information. Reuse decks by full path, explicitly report unsupported templates, and import otherwise valid cards even when a media file fails, with a visible per-card missing-media notice. Export remains deferred.

The [import contract](ANKI_IMPORT.md) records the accepted requirements and the remaining technical investigations. Exact FSRS transfer and legacy scheduling conversion are not yet validated; no automatic reset of imported progress or improvised scheduler conversion is authorized.
