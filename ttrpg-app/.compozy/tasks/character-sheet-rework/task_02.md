---
status: completed
title: Add CharacterSheet model and CharacterCondition.modifiersJson
type: backend
complexity: low
dependencies:
  - task_01
---

# Task 02: Add CharacterSheet model and CharacterCondition.modifiersJson

## Overview
Extend the Prisma schema with the `CharacterSheet` 1:1 model defined in the TechSpec and add the nullable `modifiersJson` string column to `CharacterCondition`. Apply the change to the local SQLite database via `prisma db push` so subsequent backend tasks can query and mutate the new shapes.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST add a `CharacterSheet` model to `prisma/schema.prisma` matching the shape defined in TechSpec "Data Models".
- MUST add the inverse relation `sheet CharacterSheet?` to the existing `Character` model.
- MUST add a nullable `modifiersJson String?` column to `CharacterCondition`.
- MUST run `prisma db push` against the dev SQLite DB so the local schema reflects the change.
- MUST regenerate the Prisma client (`prisma generate`) so TypeScript sees the new types.
- MUST NOT rename or remove existing fields on `Character` (preserving `bio`, `attributesJson`, `avatarAssetId`).
- SHOULD keep the schema idempotent under repeat `db push` runs.
</requirements>

## Subtasks
- [x] 2.1 Add the `CharacterSheet` model with id, characterId (unique), systemSlug, schemaVersion, dataJson, timestamps, and back-relation.
- [x] 2.2 Add `sheet CharacterSheet?` to `Character`.
- [x] 2.3 Add `modifiersJson String?` to `CharacterCondition`.
- [x] 2.4 Run `npm run db:push` and confirm no errors against the dev DB.
- [x] 2.5 Run `npx prisma generate` to refresh the client.
- [x] 2.6 Verify the resulting `@prisma/client` types expose `CharacterSheet` and the new column.

## Implementation Details
See TechSpec section "Implementation Design → Data Models" for the exact Prisma model shape. The project does not maintain migration files for SQLite (no `prisma migrate dev` in scripts); `db push` is the established workflow. The new model uses `@unique` on `characterId` to enforce the 1:1 contract called out in ADR-001.

### Relevant Files
- `prisma/schema.prisma` — Character at lines 194-210, CharacterCondition at lines 212-224, System at lines 66-73; add new model and field here.
- `package.json` — has `db:push`, `db:generate`-equivalent, `db:reset`, `db:studio` scripts.
- `src/lib/db.ts` — Prisma client singleton; no change but consumers depend on regenerated types.

### Dependent Files
- `prisma/seed.ts` — task 08 will populate `rulesJson` and create `CharacterSheet` rows.
- `app/api/characters/[projectId]/route.ts` — task 09 will write to the new model.
- `app/api/characters/[projectId]/[characterId]/conditions/[conditionId]/route.ts` — task 11 will read/write the new column.

### Related ADRs
- [ADR-001: Separate `CharacterSheet` Entity for System-Specific Game Data](adrs/adr-001.md) — Drives the model shape and the `@unique` constraint.

## Deliverables
- Updated `prisma/schema.prisma` containing `CharacterSheet`, the relation on `Character`, and `modifiersJson` on `CharacterCondition`.
- Generated Prisma client reflecting the new types.
- Local SQLite schema updated via `db push`.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for shape conformance **(REQUIRED)**

## Tests
- Unit tests:
  - [x] `tests/lib/prismaShape.test.ts` imports `Prisma.CharacterSheetCreateInput` and asserts the type compiles with the required fields (compile-time check via `expectTypeOf` or `satisfies`).
  - [x] Asserts `Prisma.CharacterConditionUpdateInput` accepts `modifiersJson: string | null`.
- Integration tests:
  - [x] `tests/api/schema.test.ts` creates a Character + CharacterSheet inside a transaction against the test DB, then reads back both rows, then deletes the Character and asserts cascade removes the sheet.
  - [x] Creates a CharacterCondition with `modifiersJson` JSON string, reads it back, and asserts equality.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- `npx prisma format` reports no errors
- `db push` is idempotent (running twice produces no schema drift)
- `Prisma.CharacterSheet` and `CharacterCondition.modifiersJson` accessible via the generated client
