---
status: completed
title: Redesign BodyMap with anatomical SVG and modifier display
type: frontend
complexity: medium
dependencies:
  - task_11
---

# Task 17: Redesign BodyMap with anatomical SVG and modifier display

## Overview
Replace the current geometric `BodyMap` SVG with two anatomical silhouettes (front + back) in the style of `sourceMaterial/BodyMap.png`, keeping the existing 12-region enum and CRUD wiring. Each region colours by aggregated severity, shows a count badge when multiple conditions touch it, and the side panel exposes a modal editor for `modifiersJson` (added to the server contract in task 11).

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST replace the geometric SVG inside `src/components/characters/BodyMap.tsx` with two anatomical silhouettes (front and back views) covering the existing 12 `BODY_REGIONS`.
- MUST keep the `BODY_REGIONS` enum and the existing CRUD endpoints unchanged (no schema migration).
- MUST colour each region using the existing `SEVERITY_COLOR` map in `src/lib/bodyRegions.ts:47-52`, blending toward the most severe active condition.
- MUST display a small numeric badge on regions with >1 active condition.
- MUST expose a "Modificadores" affordance per condition that opens a dialog editing `modifiersJson` ({ field, delta, reason? } list), and PATCH the conditions endpoint extended in task 11.
- MUST emit an `onConditionsChange(conditions: CharacterCondition[])` prop so the parent (`CharacterDetailClient`) can pass the new array to `SheetRenderer` for live re-derivation.
- MUST keep the existing condition create/edit/delete flows working (same dialogs, same endpoints).
- SHOULD use `<path>` per region rather than complex `<polygon>`s to keep the SVG legible and editable.
</requirements>

## Subtasks
- [x] 17.1 Author the two anatomical SVGs (front + back) with one `<path>` per region.
- [x] 17.2 Wire fill colours and hover states from `SEVERITY_COLOR`.
- [x] 17.3 Add the per-region badge for `>1` active conditions.
- [x] 17.4 Add the `Modificadores` dialog (add/remove/edit `{ field, delta, reason }` rows).
- [x] 17.5 PATCH the conditions endpoint with the new `modifiersJson` payload and emit `onConditionsChange`.
- [x] 17.6 Cover SVG region rendering, click-to-create, severity colouring, and modifiers PATCH in tests.

## Implementation Details
See PRD "BodyMap — redesign visual" and TechSpec "BodyMap — redesign visual" subsection. The current component already implements CRUD against `/api/characters/[projectId]/[characterId]/conditions[...]`; preserve those flows and only swap the visual layer plus add the modifiers dialog. The 12 region enum stays the same to avoid any data migration on existing conditions.

### Relevant Files
- `src/components/characters/BodyMap.tsx` — current SVG at lines 206-385, dialogs at 387-533, CRUD at 75-115.
- `src/lib/bodyRegions.ts` — `BODY_REGIONS` (1-14), `SEVERITY_COLOR` (47-52), labels (18-31, 40-45).
- `app/api/characters/[projectId]/[characterId]/conditions/[conditionId]/route.ts` (task 11) — extended PATCH.
- `sourceMaterial/BodyMap.png` — visual reference.
- `src/components/ui/{dialog,button,badge,tooltip,input}.tsx` — primitives.

### Dependent Files
- `src/components/characters/CharacterDetailClient.tsx` (task 16) — consumes `onConditionsChange` to refresh the Ficha tab derivation.

### Related ADRs
- [ADR-001: Separate `CharacterSheet` Entity](adrs/adr-001.md) — Drives the modifier-driven sheet interaction.

## Deliverables
- Redesigned `BodyMap.tsx` with anatomical SVG and modifiers UI.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests covering full create→assign-modifiers→update flow **(REQUIRED)**

## Tests
- Unit tests (jsdom):
  - [x] All 12 regions render on the SVG (front+back combined).
  - [x] Clicking a region without an active condition opens the create dialog.
  - [x] A region with one SEVERE condition is filled with the SEVERE colour.
  - [x] A region with two conditions shows a badge with count "2".
  - [x] Opening the modifiers dialog and adding `{ field: "deslocamento", delta: -3 }` PATCHes the conditions endpoint with the expected payload.
  - [x] `onConditionsChange` is invoked after each successful PATCH.
- Integration tests:
  - [x] `tests/components/BodyMap.test.tsx` mounts with a fixture project/character, creates a condition via the UI, adds a modifier, asserts the network PATCH carries `modifiersJson`, and asserts the parent's `onConditionsChange` callback received the updated array.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- BodyMap renders front+back silhouettes resembling `sourceMaterial/BodyMap.png` in layout
- Adding a modifier from the BodyMap immediately reflects on the Ficha tab's derived values (when wired via task 16)
- No regression in the existing condition CRUD flows
