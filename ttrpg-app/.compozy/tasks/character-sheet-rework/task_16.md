---
status: completed
title: Refactor CharacterDetailClient into three-tab layout
type: frontend
complexity: medium
dependencies:
  - task_10
  - task_15
---

# Task 16: Refactor CharacterDetailClient into three-tab layout

## Overview
Reorganise the character detail page into three tabs — **Resumo**, **Ficha**, **Condições** — using the existing ShadCN `Tabs` primitive. The current header (name, role, avatar) stays at the top of the layout; the existing controls move into "Resumo"; the new `SheetRenderer` mounts in "Ficha"; the existing `BodyMap` (still in its current visual form until task 17 ships) lives in "Condições".

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST modify `src/components/characters/CharacterDetailClient.tsx` to wrap the body in `<Tabs defaultValue="resumo">` with three `<TabsContent>` panels.
- MUST keep the existing header (name, role) plus delete button outside the tabs.
- MUST move the existing "Biografia" textarea and "Atributos (JSON livre)" textarea into the "Resumo" tab without behavioural changes.
- MUST mount `<SheetRenderer projectId characterId schema base effective breakdown conditions />` inside the "Ficha" tab, hydrating from the data fetched at page load.
- MUST mount the existing `BodyMap` inside the "Condições" tab (no visual changes here; task 17 redesigns).
- MUST fetch the sheet data via the server page (`app/projects/[projectId]/characters/[characterId]/page.tsx`) using Prisma + `loadSheetSchema` + `derive` so the initial render is server-canonical; pass it as a prop to `CharacterDetailClient`.
- MUST surface a small badge near the "Ficha" tab title indicating `schema.systemSlug` and `schema.schemaVersion` (e.g., `Tormenta 20 · v1`).
- MUST keep "Salvar" semantics for the "Resumo" tab (it persists `bio` and `attributesJson` via the existing PATCH).
- SHOULD lazy-mount the "Ficha" tab content with `React.useState` / `Tabs.onValueChange` if necessary to avoid running heavy derivation work for users who never open it (low priority — only if perf is observable).
</requirements>

## Subtasks
- [x] 16.1 Update the server page to fetch sheet + schema + derive once and pass to the client.
- [x] 16.2 Wrap the existing client body with `<Tabs>` and three `<TabsContent>` panels.
- [x] 16.3 Move existing Resumo controls into the "Resumo" panel.
- [x] 16.4 Mount `SheetRenderer` in the "Ficha" panel.
- [x] 16.5 Mount `BodyMap` in the "Condições" panel.
- [x] 16.6 Cover the tab switching and prop passing in tests.

## Implementation Details
See TechSpec section "Client-side → `CharacterDetailClient`" and the user flow F2 in the PRD. The ShadCN `Tabs` primitive already exists at `src/components/ui/tabs.tsx`. The existing inline form state for `name`, `role`, `bio`, `attrsText` stays inside the "Resumo" tab and continues to PATCH the same endpoint at `/api/characters/[projectId]/[characterId]`.

### Relevant Files
- `src/components/characters/CharacterDetailClient.tsx` — current form layout.
- `app/projects/[projectId]/characters/[characterId]/page.tsx` — server page; extends Prisma reads to include sheet + conditions + schema.
- `src/components/characters/sheet/SheetRenderer.tsx` (task 15).
- `src/components/characters/BodyMap.tsx` — existing (redesigned in task 17).
- `src/components/ui/tabs.tsx` — primitive.
- `src/lib/sheets/loadSchema.ts` (task 04) and `src/lib/sheets/derive.ts` (task 06).

### Dependent Files
- None directly downstream; tasks 17 swaps the BodyMap's visual layer underneath this composition.

### Related ADRs
- [ADR-005: Isomorphic Derivation Library with Server-Canonical GET](adrs/adr-005.md) — Drives the server-side initial derive.

## Deliverables
- Updated `CharacterDetailClient.tsx` and server page.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests covering tab navigation and Resumo persistence **(REQUIRED)**

## Tests
- Unit tests (jsdom):
  - [x] Renders three tabs with the correct labels.
  - [x] "Resumo" tab is selected by default.
  - [x] Clicking "Ficha" mounts `SheetRenderer` (assert by section heading from a fixture schema).
  - [x] Clicking "Condições" mounts `BodyMap` (assert by region count).
  - [x] Editing bio in "Resumo" and clicking save calls the existing character PATCH endpoint.
- Integration tests:
  - [x] `tests/components/CharacterDetail.test.tsx` mounts with full props (schema + base + conditions), switches tabs in sequence, and asserts no console errors and correct content per tab.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- The existing "Resumo" controls behave identically to today
- Switching tabs preserves form state within each tab
- The Ficha tab badge accurately reflects the active schema version
