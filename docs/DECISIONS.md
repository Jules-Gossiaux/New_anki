# Architectural decisions

## ADR-0001 — Expo + React Native + TypeScript (accepted)

Expo provides a productive native app baseline and development-build path while React Native supports Android/iOS sharing. TypeScript is used for domain contracts and safer refactoring.

## ADR-0002 — Local-first SQLite (proposed)

SQLite is proposed for transactional local persistence, migrations, indexes and a relational shape suitable for later synchronization. Backend and account infrastructure are intentionally postponed.

## ADR-0003 — Isolated FSRS scheduler (proposed)

Scheduling is a platform-independent module behind an application port so it can be tested independently and cannot be coupled to screens or SQL. Use a pinned mature implementation rather than inventing an algorithm.

## ADR-0004 — Staged `.apkg` compatibility (accepted)

An `.apkg` file includes more than CSV fields (collection database, templates, scheduling metadata and media). Investigation and fixture-based import will precede compatibility claims.

## ADR-0005 — Intervention feasibility gate (accepted)

Phone unlock and cross-app usage behavior differs substantially by platform and permission model. We will document evidence and use supported notification/extension mechanisms instead of simulating a universal unlock interceptor.
