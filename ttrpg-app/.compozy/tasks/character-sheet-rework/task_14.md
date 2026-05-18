---
status: completed
title: RepeatingListField with useFieldArray
type: frontend
complexity: medium
dependencies:
  - task_01
  - task_03
---

# Task 14: RepeatingListField with useFieldArray

## Overview
Implement the `RepeatingListField` component that drives nested lists in the sheet (attacks, spells, equipment, skills). It uses React Hook Form's `useFieldArray` for add/remove/reorder, renders nested fields by reusing the primitive field components from task 13, and persists changes through the same form state the rest of the sheet uses.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST create `src/components/characters/sheet/fields/RepeatingListField.tsx`.
- MUST use `useFieldArray({ control, name })` to manage the array slice.
- MUST render each row by mapping over `field.itemSchema` and reusing the primitive components from task 13.
- MUST provide "Adicionar" and per-row "Remover" controls.
- MUST initialise a new row from defaults derived from `field.itemSchema` (reuse `extractDefaults` from task 08 / `src/lib/sheets/defaults.ts`).
- MUST NOT support drag-reordering in this task (out of scope; deferred per PRD which deferred ordering to follow-ups).
- SHOULD render a friendly empty state when the array is empty.
</requirements>

## Subtasks
- [x] 14.1 Author `RepeatingListField` with `useFieldArray` add/remove.
- [x] 14.2 Map nested items via the primitive components based on `itemSchema[].type`.
- [x] 14.3 Use `extractDefaults(itemSchema)` to construct new row payloads.
- [x] 14.4 Cover add/remove and inner-field edit behaviour in tests.

## Implementation Details
See TechSpec section "Implementation Design → Core Interfaces" (`itemSchema?: SheetField[]`) and ADR-003. The component composes the primitives from task 13; it MUST NOT duplicate their concerns (label, units, controller wiring). Add/remove use the `useFieldArray` API; whole-array replacement on the server is handled by task 10.

### Relevant Files
- `src/components/characters/sheet/fields/RepeatingListField.tsx` (new).
- `src/components/characters/sheet/fields/{TextField,...,DerivedField}.tsx` (task 13).
- `src/lib/sheets/defaults.ts` (task 08) — `extractDefaults` for new rows.
- `src/components/ui/{button,card,scroll-area}.tsx` — primitives for row layout.

### Dependent Files
- `src/components/characters/sheet/SheetRenderer.tsx` (task 15) — instantiates `RepeatingListField` for each `repeating-list` field.

### Related ADRs
- [ADR-003: Adopt React Hook Form for Dynamic Sheet Rendering](adrs/adr-003.md) — Drives the `useFieldArray` adoption.

## Deliverables
- `RepeatingListField.tsx` implementation.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests covering add/remove/edit flows **(REQUIRED)**

## Tests
- Unit tests (jsdom):
  - [x] Renders an empty state when the underlying array is empty.
  - [x] Clicking "Adicionar" appends one row with defaults from `extractDefaults(itemSchema)`.
  - [x] Clicking "Remover" on a row removes only that row.
  - [x] Editing an inner field updates the RHF state at the correct path (e.g., `pericias.0.ta`).
- Integration tests:
  - [x] `tests/components/RepeatingListField.test.tsx` mounts a list with one `select` and one `number` inner field, adds two rows, edits both, removes the first, and asserts the surviving row's values.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Add/remove are O(1) reflected in RHF state
- Inner fields participate in the same form context as top-level fields (no isolated subforms)
