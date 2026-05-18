---
status: completed
title: Install dependencies and configure Vitest jsdom env
type: chore
complexity: low
dependencies: []
---

# Task 01: Install dependencies and configure Vitest jsdom env

## Overview
Add the runtime and test-time dependencies the sheet rework depends on (React Hook Form, resolvers, Testing Library, jsdom, missing ShadCN primitives) and split the Vitest config so component tests can run in `jsdom` while existing `src/lib/**` and `app/api/**` tests stay in `node`. This task unblocks every later task that needs the new packages or component-level test environment.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST add `react-hook-form` and `@hookform/resolvers` to runtime dependencies.
- MUST add `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, and `jsdom` as devDependencies.
- MUST generate the missing ShadCN primitives `select` and `checkbox` under `src/components/ui/` via the project's existing ShadCN tooling.
- MUST update `vitest.config.ts` so files under `tests/components/**` run in the `jsdom` environment while everything else stays in `node`.
- MUST add a `tests/setup-dom.ts` that registers `@testing-library/jest-dom` matchers for the jsdom environment only.
- MUST keep the existing coverage thresholds and globalSetup behaviour intact.
- SHOULD verify the install is reproducible by running `npm install` cleanly and `npm test` continuing to pass.
</requirements>

## Subtasks
- [x] 1.1 Install RHF + resolvers as runtime deps and Testing Library + jsdom as devDeps.
- [x] 1.2 Generate ShadCN `select` and `checkbox` primitives into `src/components/ui/`.
- [x] 1.3 Update `vitest.config.ts` to split environments using `test.projects` or `environmentMatchGlobs`.
- [x] 1.4 Add `tests/setup-dom.ts` and wire it as the jsdom project's `setupFiles`.
- [x] 1.5 Add a placeholder `tests/components/.gitkeep` (or trivial smoke test) so the jsdom project resolves at least one spec file during CI.
- [x] 1.6 Run the full `npm test` and confirm it exits 0.

## Implementation Details
See TechSpec section "Development Sequencing → Build Order" step 1 and ADR-007 for the rationale. The Vitest split should use the smallest configuration change that keeps lib + API specs in node and routes the new component specs to jsdom. ShadCN primitives are generated via the project's existing `npx shadcn add` workflow (see `components.json` if present, otherwise rely on the existing primitives' import style for parity).

### Relevant Files
- `package.json` — add new deps and devDeps.
- `vitest.config.ts` — current `node` env config (lines 7-18); needs env split.
- `tests/setup.ts` — existing setup for node tests (DATABASE_URL, AUTH_BYPASS).
- `tests/global-setup.ts` — existing global setup; must continue to run for both envs.
- `src/components/ui/input.tsx` — reference for ShadCN primitive style used in the repo.

### Dependent Files
- Every later task that imports `react-hook-form`, `@hookform/resolvers`, `@testing-library/*`, or new ShadCN primitives.
- `tests/components/**` — new directory used by tasks 13, 14, 15, 17 for smoke tests.

### Related ADRs
- [ADR-003: Adopt React Hook Form for Dynamic Sheet Rendering](adrs/adr-003.md) — Drives the RHF and resolvers installs.
- [ADR-007: Expand Vitest Stack with React Testing Library and jsdom](adrs/adr-007.md) — Drives RTL/jsdom installs and the config split.

## Deliverables
- Updated `package.json` and lockfile reflecting the new packages.
- Updated `vitest.config.ts` with environment routing.
- New `tests/setup-dom.ts`.
- New `src/components/ui/select.tsx` and `src/components/ui/checkbox.tsx`.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for env routing **(REQUIRED)**

## Tests
- Unit tests:
  - [x] `tests/components/env.test.tsx` asserts that `document` and `@testing-library/jest-dom` matchers are available (proves jsdom env loaded).
  - [x] A trivial `tests/lib/env.test.ts` asserts `typeof document === "undefined"` (proves node env still routes lib specs).
- Integration tests:
  - [x] `npm test` exits 0 with both env projects running.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- `npm install` completes without errors on a clean clone
- `vitest.config.ts` splits environments without breaking the existing test surface
- ShadCN `select` and `checkbox` primitives importable as `@/components/ui/select` and `@/components/ui/checkbox`
