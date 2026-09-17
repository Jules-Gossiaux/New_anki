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

The final mechanism may be a notification, widget, extension or another supported flow rather than an overlay. It must reuse the existing study engine, respect due-card availability and daily limits, provide opt-out/configuration, and explicitly handle sessions with no available cards. Eligible applications, continuous versus cumulative usage and lock/reset semantics remain investigation questions.

The Android implementation uses an opt-in visible foreground service. It polls Usage Access events once per second, uses the observed `KEYGUARD_HIDDEN` event for each unlock, and checks eligible foreground usage in test mode before sending a reminder after ten continuous seconds. Leaving an eligible app clears its test session; reopening it from Android's recent-app list starts a fresh one. Reminder intents now target the intervention study route, which reuses the existing FSRS engine. The intended production threshold remains three minutes. This was validated on the OnePlus test device while the app is backgrounded, but force-stop, reboot, OEM restrictions and Google Play foreground-service policy remain feasibility work.

The intervention study uses all decks by default, with an optional global priority deck that takes precedence when selected. A trigger starts a session with up to three cards after unlock or up to five cards after eligible app use; if fewer eligible cards are available, it uses the smaller number. Leaving a session abandons that session, and the next trigger starts a new one. The user may choose a notification-driven flow or an automatic in-app flow. Android background activity-launch restrictions mean the latter is opportunistic and notification fallback remains required.
