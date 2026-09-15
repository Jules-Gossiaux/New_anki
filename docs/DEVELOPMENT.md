# Development workflow

## Branches and commits

`main` is protected and should remain releasable. Use `feat/<area>-<name>`, `fix/<area>-<name>`, `test/<area>-<name>`, `docs/<name>`, `refactor/<area>-<name>`, or `chore/<name>`. Use focused Conventional Commits such as `feat(database): add deck migration`.

Before work: read `AGENTS.md`, inspect status and branch, identify ownership. Before handoff: run tests, typecheck, lint and format check; update docs/changelog; report known limitations.

## Parallel agents

Use one worktree per agent when changes may overlap. Agree on file ownership and dependency order. Shared domain contracts and migrations are coordination points. Never silently overwrite or reset another agent's work.

## Feature flow

Define acceptance criteria, record uncertain choices, implement a small vertical slice, add unit/integration/UI tests appropriate to risk, validate persistence and accessibility, then document and commit. Core scheduler and schema changes require review before UI integration.

## Commands

`npm run start`, `npm test`, `npm run typecheck`, `npm run lint`, `npm run format`, and `npm run format:check` are the standard local commands. Native platform work should use an Expo development build once a config plugin or native module is introduced.
