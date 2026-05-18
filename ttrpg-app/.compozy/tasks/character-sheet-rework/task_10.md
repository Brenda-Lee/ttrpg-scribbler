---
status: completed
title: New GET/PATCH /api/characters/[..]/sheet routes
type: backend
complexity: medium
dependencies:
  - task_04
  - task_06
  - task_07
---

# Task 10: New GET/PATCH /api/characters/[..]/sheet routes

## Overview
Expose the sheet as its own HTTP resource: `GET` returns the full editing payload (`schema`, `base`, `effective`, `breakdown`, `conditions`) so the client renders without further round-trips; `PATCH` accepts a partial patch validated by the dynamic Zod schema and persists the merged `dataJson`, returning the new effective snapshot.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST create `app/api/characters/[projectId]/[characterId]/sheet/route.ts` exporting `GET` and `PATCH`.
- MUST authenticate via `getCurrentUser` and authorise via an ownership check that walks `character → project → owner` (mirror the existing pattern in `conditions/route.ts:31-44`).
- MUST respond 404 when the character or sheet is missing, or when the caller does not own the project.
- MUST GET shape: `{ schema, base, effective, breakdown, conditions }` where `base` and `effective` are `Record<string, FieldValue>` and `breakdown` is `Record<string, BreakdownEntry[]>`.
- MUST PATCH body: `{ patch: Record<string, FieldValue> }`. Validate with `buildPatchSchema(schema)` from task 07.
- MUST merge `patch` into the existing `dataJson` at the top level (replacing whole arrays for `repeating-list` fields, replacing scalar values for primitives) and persist.
- MUST recompute `effective` + `breakdown` after the merge and return them in the PATCH response.
- MUST emit Zod issues in 400 responses following the existing pattern.
- SHOULD reuse the schema cache from task 04 (`loadSheetSchema`) and the validator cache from task 07 (`buildPatchSchema`).
</requirements>

## Subtasks
- [x] 10.1 Implement the route file with `GET` and `PATCH` exports.
- [x] 10.2 Wire ownership check; mirror the existing `conditions/route.ts` pattern.
- [x] 10.3 Load schema → load sheet → load conditions → call `derive` for GET.
- [x] 10.4 Build dynamic Zod → validate → merge → save → derive again for PATCH.
- [x] 10.5 Cover happy paths, 404 paths, validation failures, and breakdown shape in tests.

## Implementation Details
See TechSpec section "API Endpoints" rows 2 and 3, and ADR-006 for validator strictness. The route lives under the existing characters API tree; the auth/ownership pattern from `app/api/characters/[projectId]/[characterId]/conditions/route.ts:31-44` is the model. Top-level merge semantics: for each key in `patch`, replace the existing value in `dataJson`. For `repeating-list` fields, the entire array is replaced (matches RHF's `useFieldArray` semantics).

### Relevant Files
- `app/api/characters/[projectId]/[characterId]/sheet/route.ts` (new).
- `app/api/characters/[projectId]/[characterId]/conditions/route.ts` (lines 31-44) — pattern reference.
- `src/lib/sheets/loadSchema.ts` (task 04).
- `src/lib/sheets/derive.ts` (task 06).
- `src/lib/sheets/zodFromSchema.ts` (task 07).
- `src/lib/auth.ts` — `getCurrentUser`.
- `src/lib/db.ts` — Prisma singleton.

### Dependent Files
- `src/components/characters/sheet/SheetRenderer.tsx` (task 15) — primary consumer.
- `app/projects/[projectId]/characters/[characterId]/page.tsx` — server page may fetch the same data inline as RSC; the route is the canonical client API.

### Related ADRs
- [ADR-005: Isomorphic Derivation Library with Server-Canonical GET](adrs/adr-005.md) — GET returns canonical derived snapshot.
- [ADR-006: Dynamically-Generated Zod Validator for Sheet PATCH](adrs/adr-006.md) — PATCH validation policy.

## Deliverables
- `app/api/characters/[projectId]/[characterId]/sheet/route.ts` with GET and PATCH.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests covering full GET→PATCH→GET round-trip **(REQUIRED)**

## Tests
- Unit tests:
  - [x] GET returns 404 for a character not owned by the caller.
  - [x] GET returns 404 when the sheet does not exist.
  - [x] GET response includes non-empty `schema.sections`, `base`, `effective`, `breakdown`, and `conditions`.
  - [x] PATCH with unknown key returns 400 with Zod issues.
  - [x] PATCH with type-mismatched value returns 400.
  - [x] PATCH with valid partial body persists the merge and returns the new effective snapshot.
- Integration tests:
  - [x] `tests/api/sheet.test.ts` GETs a seeded character's sheet, PATCHes a numeric base field, GETs again, and asserts the new `effective` reflects the change including any derived recompute.
  - [x] PATCHes a `repeating-list` array replacement and asserts the stored array matches the patch exactly.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- No keys outside the active schema can be persisted via PATCH
- GET response is enough to render the editor with no further fetches
