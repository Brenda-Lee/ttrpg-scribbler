# TechSpec — Character Sheet Rework

## Executive Summary

Introduce a per-system character sheet driven by a JSON schema stored on `System.rulesJson` (with bundled fallbacks under `prisma/sheets/`) and rendered by a dynamic React form built on React Hook Form. A new `CharacterSheet` model carries base values 1:1 with `Character`, while pure isomorphic modules under `src/lib/sheets/` perform Zod validation, dynamic patch-schema generation, modifier merging from `CharacterCondition`, and recursive-descent formula evaluation for derived fields. The redesigned `BodyMap` keeps its 12-region data model but swaps the SVG for an anatomical silhouette and wires its conditions into the same derivation pipeline so wounds visibly modify sheet values.

The primary technical trade-off is **investing in a small infrastructure expansion (RHF, a custom formula parser, dynamic Zod, RTL + jsdom test env) in exchange for a single, isomorphic, type-safe derivation pipeline that the server and client share** — accepting one new form library and ~150 LOC of parser code as the cost of avoiding ongoing client/server drift, runtime evaluator surprises, and brittle hand-rolled form plumbing.

## System Architecture

### Component Overview

Server-side:

- **`prisma/schema.prisma`** — adds `CharacterSheet` (1:1 with `Character`) and `CharacterCondition.modifiersJson` (nullable string).
- **`prisma/sheets/{dnd5e,tormenta20,generic}.json`** — authored sheet schemas; the seed reads them and writes to `System.rulesJson`.
- **`prisma/seed.ts`** — extended to populate `System.rulesJson`, create `CharacterSheet` for every seeded character, and idempotently backfill missing sheets.
- **`src/lib/sheets/loadSchema.ts`** — DB-first resolver with bundled fallback (ADR-004); caches per `(systemSlug, schemaVersion)`.
- **`src/lib/sheets/parser.ts`** — Zod schema definitions for `SheetSchema` and validation entry point for both DB and bundled sources.
- **`src/lib/sheets/zodFromSchema.ts`** — generates request-scoped Zod validators for sheet patches (ADR-006).
- **`src/lib/sheets/formula.ts`** — recursive-descent parser + evaluator (ADR-002).
- **`src/lib/sheets/applyModifiers.ts`** — merges preset modifiers (from schema) and condition `modifiersJson` overrides; emits per-field breakdown entries.
- **`src/lib/sheets/derive.ts`** — orchestrates `applyModifiers` then formula evaluation, returning `{ effective, breakdown }` (ADR-005).
- **`app/api/characters/[projectId]/route.ts`** — `POST` extended to create `CharacterSheet` in the same transaction.
- **`app/api/characters/[projectId]/[characterId]/sheet/route.ts`** — new: `GET` returns `{ schema, base, effective, breakdown }`; `PATCH` accepts a validated partial patch.
- **`app/api/characters/[projectId]/[characterId]/conditions/[conditionId]/route.ts`** — `PATCH` schema extended to accept `modifiersJson`.

Client-side:

- **`src/components/characters/CharacterDetailClient.tsx`** — switches its body to a three-tab layout (Resumo / Ficha / Condições) using the existing ShadCN `Tabs` primitive.
- **`src/components/characters/sheet/SheetRenderer.tsx`** — RHF-backed renderer; consumes `SheetSchema` + initial `{ base, effective, breakdown }` from GET; uses `Controller` and `useFieldArray` for inputs; recomputes derivations in `useMemo` on every `watch()` tick.
- **`src/components/characters/sheet/fields/*.tsx`** — one component per field type (`TextField`, `TextareaField`, `NumberField`, `CheckboxField`, `SelectField`, `RepeatingListField`, `DerivedField`).
- **`src/components/characters/BodyMap.tsx`** — redesigned anatomical SVG (front + back) with the same 12-region enum; emits change callbacks so the parent re-derives.
- **`src/hooks/useDebouncedAutosave.ts`** — extracted from `TiptapEditor.tsx`'s inline `setTimeout` pattern; reused by `SheetRenderer`.

### Data Flow

1. Page load (`/projects/[id]/characters/[characterId]`): RSC fetches character + sheet + conditions via Prisma → calls `loadSheetSchema` → calls `derive` → passes `{ schema, base, effective, breakdown, conditions }` as initial props to `CharacterDetailClient`.
2. Edit in Ficha tab: RHF updates form state → `watch()` triggers `useMemo` recomputation of `derive(base, conditions, schema)` for live UI → `useDebouncedAutosave` PATCHes `/sheet` with the changed fields after 800 ms.
3. Edit in Condições tab: `BodyMap` POST/PATCH/DELETE to existing conditions endpoints; on success, hoists the new conditions to `CharacterDetailClient`, which re-feeds the Ficha tab's derivation.
4. Server PATCH `/sheet`: loads schema via `loadSheetSchema` → builds Zod via `zodFromSchema` (cached) → validates → merges patch into `dataJson` → returns the new effective snapshot.

## Implementation Design

### Core Interfaces

`src/lib/sheets/types.ts`:

```typescript
export type FieldValue = string | number | boolean | FieldValue[] | { [k: string]: FieldValue };

export type FieldType = "text" | "textarea" | "number" | "checkbox" | "select" | "repeating-list" | "derived";

export interface SheetField {
  id: string;
  label?: string;
  type: FieldType;
  default?: FieldValue;
  options?: string[];          // for select
  unit?: string;               // display-only
  formula?: string;            // for derived
  itemSchema?: SheetField[];   // for repeating-list
}

export interface InjuryPreset {
  region: BodyRegion;
  severity: ConditionSeverity;
  modifiers: Modifier[];
}

export interface SheetSchema {
  systemSlug: string;
  schemaVersion: number;
  sections: { id: string; title: string; fields: SheetField[] }[];
  injuryPresets: InjuryPreset[];
}
```

`src/lib/sheets/derive.ts`:

```typescript
export interface BreakdownEntry {
  source: "preset" | "override" | "formula";
  delta?: number;
  reason?: string;
  conditionId?: string;
}

export interface DeriveResult {
  effective: Record<string, FieldValue>;
  breakdown: Record<string, BreakdownEntry[]>;
}

export function derive(
  base: Record<string, FieldValue>,
  conditions: CharacterCondition[],
  schema: SheetSchema,
): DeriveResult;
```

`src/lib/sheets/formula.ts`:

```typescript
export type FormulaNode =
  | { kind: "num"; value: number }
  | { kind: "ref"; name: string }
  | { kind: "bin"; op: "+" | "-" | "*" | "/"; left: FormulaNode; right: FormulaNode }
  | { kind: "call"; fn: "floor" | "min" | "max" | "mod"; args: FormulaNode[] };

export function parse(expr: string): FormulaNode;
export function evaluate(node: FormulaNode, scope: Record<string, number>): number;
```

### Data Models

`prisma/schema.prisma` additions:

```prisma
model CharacterSheet {
  id            String   @id @default(cuid())
  characterId   String   @unique
  systemSlug    String
  schemaVersion Int      @default(1)
  dataJson      String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  character     Character @relation(fields: [characterId], references: [id], onDelete: Cascade)

  @@index([systemSlug])
}

model Character {
  // existing fields unchanged
  sheet         CharacterSheet?
}

model CharacterCondition {
  // existing fields unchanged
  modifiersJson String?
}
```

`SheetSchema` JSON (stored in `System.rulesJson` and committed under `prisma/sheets/`) follows the contract in `src/lib/sheets/types.ts`. The seed reads each file via Node `fs.readFileSync` (the seed already runs under `tsx`) and writes it as the string body of `rulesJson`.

### API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/characters/[projectId]` | Creates `Character` and `CharacterSheet` in a `prisma.$transaction`. Sheet defaults come from `loadSheetSchema(project.system?.slug ?? null)`. Existing request body unchanged. Response unchanged. |
| `GET` | `/api/characters/[projectId]/[characterId]/sheet` | Returns `{ schema: SheetSchema, base: Record<string,FieldValue>, effective: Record<string,FieldValue>, breakdown: Record<string,BreakdownEntry[]>, conditions: CharacterCondition[] }`. 404 if owner/character/sheet mismatch. |
| `PATCH` | `/api/characters/[projectId]/[characterId]/sheet` | Body: `{ patch: Record<string, FieldValue> }`. Validates with the dynamic schema (cache key `${systemSlug}:${schemaVersion}`). Merges into `dataJson` (shallow override; nested arrays replaced wholesale). Returns the new effective snapshot. |
| `PATCH` | `/api/characters/[projectId]/[characterId]/conditions/[conditionId]` | Body extended with optional `modifiersJson: { field: string; delta: number; reason?: string }[]`. Server serialises to string before writing. |

All routes follow the existing project pattern: `getCurrentUser` from `src/lib/auth.ts`, ownership check via `assertProjectOwner`, Zod `safeParse` with 400 on invalid input.

## Integration Points

None outside the codebase. The PDF source material in `sourceMaterial/` is used only as a reference during schema authoring; it is not parsed or imported at runtime.

## Impact Analysis

| Component | Impact Type | Description and Risk | Required Action |
|---|---|---|---|
| `prisma/schema.prisma` | modified | New model + new column. Low risk on SQLite via `db push`. | Run `npm run db:push`. |
| `prisma/seed.ts` | modified | Populates `rulesJson`; backfills `CharacterSheet` for existing demo characters. Medium risk if idempotency check is wrong. | Add `existsSheet` guard before insert. |
| `app/api/characters/[projectId]/route.ts` | modified | `POST` adds a sheet creation step inside a transaction. Low risk. | Update tests for `POST`. |
| `app/api/characters/[projectId]/[characterId]/conditions/[conditionId]/route.ts` | modified | Patch schema extended. Low risk. | Update Zod schema. |
| `app/api/characters/[projectId]/[characterId]/sheet/route.ts` | new | New endpoint pair. Medium risk because of dynamic validator. | Unit-test `zodFromSchema` and route. |
| `src/components/characters/CharacterDetailClient.tsx` | modified | Body becomes tabbed; existing controls move into "Resumo" tab. Medium risk to existing UX. | Manual QA on the existing save flow. |
| `src/components/characters/BodyMap.tsx` | modified | Visual redesign + emits onConditionsChange. Low data risk (no enum change). | Snapshot QA, smoke test. |
| `src/components/editor/TiptapEditor.tsx` | modified | Inline debounce extracted into `useDebouncedAutosave`. Low risk. | Regression-test scene autosave. |
| `vitest.config.ts` | modified | Splits envs (`node` + `jsdom`). Low risk. | Verify both test surfaces run in CI. |
| `package.json` | modified | Adds `react-hook-form`, `@hookform/resolvers`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`. | `npm install`. |

## Testing Approach

### Unit Tests

Coverage targets `src/lib/sheets/**` and the new route. Existing thresholds (60% lines, 50% branches) apply.

- `tests/lib/formula.test.ts` — tokenizer + parser + evaluator. Cases: operator precedence, parenthesisation, function calls (`floor`, `min`, `max`, `mod`), division by zero, unknown identifier, malformed input.
- `tests/lib/applyModifiers.test.ts` — preset application, override merging, multiple conditions stacking on the same field, deltas with zero base values.
- `tests/lib/derive.test.ts` — end-to-end derivation given a fixture schema and conditions; asserts both `effective` and `breakdown` shapes.
- `tests/lib/zodFromSchema.test.ts` — happy paths per field type; rejects unknown keys with strict mode; nested validation for `repeating-list`.
- `tests/lib/loadSchema.test.ts` — DB-first path, fallback path on null/invalid `rulesJson`, cache hit on repeated calls.

### Integration Tests

API tests follow the pattern of `tests/api/world.test.ts`.

- `tests/api/sheet.test.ts` — `POST /api/characters/[projectId]` creates both records; `GET /sheet` returns derived snapshot; `PATCH /sheet` rejects extraneous keys; `PATCH /sheet` accepts a typed update and reflects it on the next GET.
- `tests/api/conditions.test.ts` — `PATCH conditions/[id]` accepts `modifiersJson`, persists it, and surfaces it via the next sheet GET's `breakdown`.

### Component Smoke Tests (jsdom)

- `tests/components/SheetRenderer.test.tsx` — renders all field types from a fixture schema; typing in a base field triggers exactly one PATCH after 800 ms (fake timers); editing a base attribute updates the derived field's displayed value before any network call.
- `tests/components/BodyMap.test.tsx` — renders 12 regions; clicking a region opens the new condition dialog; setting `SEVERE` colours the region; passing `modifiersJson` shows the badge count.

## Development Sequencing

### Build Order

1. **Add new dependencies** — `npm install react-hook-form @hookform/resolvers @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom`. No deps.
2. **Schema and database** — update `prisma/schema.prisma` with `CharacterSheet` and `CharacterCondition.modifiersJson`; run `db push`. Depends on step 1 only for tooling presence.
3. **Sheet types and parser** — create `src/lib/sheets/types.ts` and `src/lib/sheets/parser.ts`. Depends on nothing.
4. **Bundled catalogs** — author `prisma/sheets/{generic,dnd5e,tormenta20}.json`; validate at module load with the parser from step 3. Depends on step 3.
5. **Schema resolver** — `src/lib/sheets/loadSchema.ts` with DB + bundled fallback. Depends on steps 2, 3, 4.
6. **Formula evaluator** — `src/lib/sheets/formula.ts` and its tests. Depends on nothing functionally; written here so the next steps can use it.
7. **Modifier merger and derivation** — `applyModifiers.ts` and `derive.ts`. Depends on steps 3 and 6.
8. **Dynamic Zod generator** — `zodFromSchema.ts`. Depends on step 3.
9. **Seed updates** — `prisma/seed.ts` writes `rulesJson`, creates sheets for demo characters, idempotently backfills. Depends on steps 2, 4.
10. **`POST /api/characters/[projectId]` extension** — wrap sheet creation in transaction. Depends on steps 2, 5.
11. **New `/sheet` route** — GET (using `derive`) and PATCH (using `zodFromSchema`). Depends on steps 5, 7, 8.
12. **`conditions/[conditionId]` PATCH extension** — accept `modifiersJson`. Depends on step 2.
13. **`useDebouncedAutosave` hook extraction** — refactor `TiptapEditor.tsx` to use it; export from `src/hooks/`. Depends on nothing functionally; isolated to keep the refactor reviewable.
14. **`SheetRenderer` and field components** — RHF integration with `Controller`, `useFieldArray`, `zodResolver(buildResolverSchema(schema))`. Depends on steps 1, 3, 7, 8, 13.
15. **`CharacterDetailClient` three-tab layout** — uses ShadCN `Tabs`; passes `sheet`/`schema`/`conditions` to `SheetRenderer` and `BodyMap`. Depends on step 14.
16. **`BodyMap` redesign** — new SVG, emits `onConditionsChange`. Depends on step 12 (server contract for `modifiersJson`).
17. **Unit and integration tests** — author all `tests/lib/**` and `tests/api/**` files. Depends on the modules they cover (steps 5–12).
18. **Component smoke tests** — `vitest.config.ts` env split first, then RTL tests for `SheetRenderer` and `BodyMap`. Depends on steps 14–16.
19. **Manual E2E pass** — run through the PRD's nine verification steps. Depends on all previous steps.

### Technical Dependencies

- Node 20+ (already required by Next 15).
- Existing SQLite dev database; no infra additions.
- `tsx` (already a devDep) for `prisma/seed.ts` JSON loading.

## Monitoring and Observability

- **Server logs** — `loadSchema` emits `console.warn` on fallback ("rulesJson invalid for system X, using bundled v Y") so operators can spot drift between DB and code.
- **Save status** — reuse `useWorkspace.saveStatus`/`setSaveStatus` so the existing top-bar indicator covers sheet edits with no UI work.
- **Schema version surfacing** — the GET response includes `schema.schemaVersion`; the UI displays it (subtle footer) so users can verify they're editing the version they expect.

No metrics or alerting pipeline exists in the project; if one is added later, the new endpoints' status codes and `loadSchema` fallback rate are the first signals worth tracking.

## Technical Considerations

### Key Decisions

- **Separate `CharacterSheet` table over a `Character.sheetJson` column** (ADR-001) — keeps catalog queries lean and provides a natural place for `schemaVersion`.
- **Custom formula parser instead of a library** (ADR-002) — eliminates a runtime dependency and limits the attack surface to the four operators and three functions we actually use.
- **React Hook Form for the sheet renderer** (ADR-003) — field-level subscriptions and `useFieldArray` outweigh the cost of being the first form lib in the codebase.
- **DB-first schema with bundled fallback** (ADR-004) — keeps fresh clones runnable and leaves room for the future "DM customises the schema" workflow.
- **Isomorphic derivation pipeline** (ADR-005) — one source of truth for effective values; pure functions are trivial to test.
- **Dynamic Zod generation per request** (ADR-006) — strict-mode validation catches type errors and unknown keys at the API boundary.
- **Vitest stack expansion to RTL + jsdom** (ADR-007) — the renderer is the highest-risk surface; smoke tests cost less than the regressions they prevent.

### Known Risks

- **Client/server derivation drift** — the same `derive()` function runs on both sides, but build-time bundling differences could surface (e.g., differing `Math.floor` semantics — none expected with standard ES). Mitigation: a shared snapshot test that runs `derive` over a fixture on Node and through jsdom and asserts identical results.
- **Cache invalidation on schema edits** — the schema is cached per `(systemSlug, schemaVersion)`; bumping `schemaVersion` in the bundled JSON forces fresh parsing. Operators editing `System.rulesJson` directly must bump the version too; if they don't, cached older schema sticks until process restart. Mitigation: document the contract in `prisma/sheets/README.md` (one-line note alongside the JSON files).
- **Sheet size on the wire** — D&D 5e + full skill list + spell rows can produce a payload large enough to make the autosave PATCH chunky. Mitigation: PATCH carries only changed top-level field ids, not the entire `dataJson`.
- **Existing characters without sheets** — backfill must run on every environment; the seed handles this idempotently, but a production system would need a one-off script. Out of scope for the MVP (single-user local).

## Architecture Decision Records

- [ADR-001: Separate `CharacterSheet` Entity for System-Specific Game Data](adrs/adr-001.md) — Adds a 1:1 `CharacterSheet` table instead of inflating `Character` with sheet JSON.
- [ADR-002: Custom Recursive-Descent Formula Evaluator (Zero Dependencies)](adrs/adr-002.md) — Hand-rolled parser for `derived` field formulas in place of a library.
- [ADR-003: Adopt React Hook Form for Dynamic Sheet Rendering](adrs/adr-003.md) — RHF + resolvers as the form layer for `SheetRenderer`.
- [ADR-004: DB-First Sheet Schema with Bundled JSON Fallback](adrs/adr-004.md) — `System.rulesJson` is canonical; bundled `prisma/sheets/*.json` fills gaps.
- [ADR-005: Isomorphic Derivation Library with Server-Canonical GET](adrs/adr-005.md) — One pure derivation module used by both server and client.
- [ADR-006: Dynamically-Generated Zod Validator for Sheet PATCH](adrs/adr-006.md) — Runtime-built strict Zod schema from the active sheet schema.
- [ADR-007: Expand Vitest Stack with React Testing Library and jsdom](adrs/adr-007.md) — Adds component smoke testing for the new renderer and BodyMap.
