---
status: completed
title: Extend conditions PATCH to accept modifiersJson
type: backend
complexity: low
dependencies:
  - task_02
---

# Task 11: Extend conditions PATCH to accept modifiersJson

## Overview
Augment `PATCH /api/characters/[projectId]/[characterId]/conditions/[conditionId]` to accept an optional `modifiersJson` payload of `{ field, delta, reason? }` entries, validate it with Zod, and persist as a JSON string on the existing column. POST creation is unchanged (modifiers start empty by default and are added later via the UI).

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST extend the inline Zod `PatchSchema` in `app/api/characters/[projectId]/[characterId]/conditions/[conditionId]/route.ts:12-18` with `modifiersJson: z.array(z.object({ field: z.string().min(1), delta: z.number(), reason: z.string().max(200).optional() })).optional().nullable()`.
- MUST stringify `modifiersJson` before writing to the DB (the column type is `String?`).
- MUST allow clearing the field by sending `modifiersJson: null`.
- MUST keep the existing region/severity/description updates working unchanged.
- MUST NOT touch the POST endpoint in `conditions/route.ts` for this task (creation continues to start with `modifiersJson = null`).
- SHOULD return the updated condition (or `{ ok: true }` if matching the existing convention).
</requirements>

## Subtasks
- [x] 11.1 Extend the PATCH Zod schema with the new optional field.
- [x] 11.2 Serialise the value to a JSON string before `prisma.characterCondition.update`.
- [x] 11.3 Accept `null` to clear the column.
- [x] 11.4 Cover the new branch in tests.

## Implementation Details
See TechSpec section "API Endpoints" row 4. The current route file is `app/api/characters/[projectId]/[characterId]/conditions/[conditionId]/route.ts` with the schema at lines 12-18 and the handler at lines 31-51. Reuse the existing ownership chain that resolves character → project → owner.

### Relevant Files
- `app/api/characters/[projectId]/[characterId]/conditions/[conditionId]/route.ts` — current PATCH at lines 31-51, schema at 12-18.
- `prisma/schema.prisma` — `CharacterCondition.modifiersJson` column added in task 02.

### Dependent Files
- `src/components/characters/BodyMap.tsx` (task 17) — UI sends the new payload.
- `src/lib/sheets/applyModifiers.ts` (task 06) — server-side consumer of the persisted value via `derive`.

### Related ADRs
- [ADR-001: Separate `CharacterSheet` Entity](adrs/adr-001.md) — Drives the separation between sheet base data and condition-driven modifiers.

## Deliverables
- Updated `conditions/[conditionId]/route.ts` PATCH handler and Zod schema.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for round-trip persistence **(REQUIRED)**

## Tests
- Unit tests:
  - [x] PATCH accepts a valid `modifiersJson` array and returns 200.
  - [x] PATCH rejects a `modifiersJson` entry missing `field` or `delta` with 400.
  - [x] PATCH accepts `modifiersJson: null` and clears the column.
  - [x] PATCH leaves `region`, `severity`, and `description` unchanged when those fields are omitted.
- Integration tests:
  - [x] `tests/api/conditions-patch.test.ts` PATCHes a seeded condition with `modifiersJson`, reads back, and asserts the deserialised JSON matches the request.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- No regression on existing region/severity/description PATCH behaviour
- `modifiersJson` round-trips as a parseable JSON array
