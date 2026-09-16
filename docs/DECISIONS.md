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

Revision settings are global application settings rather than per-deck settings for the first implementation. The initial card-model iteration will provide two fixed templates: front-to-back and back-to-front. Editing a note preserves its append-only review history; changing a primary field deeply may reset the card's current FSRS state while retaining all historical review logs. `.apkg` export is explicitly deferred until after the import and core editing work.
