# Character Sheet Rework — Task List

## Tasks

| # | Title | Status | Complexity | Dependencies |
|---|-------|--------|------------|--------------|
| 01 | Install dependencies and configure Vitest jsdom env | completed | low | — |
| 02 | Add CharacterSheet model and CharacterCondition.modifiersJson | completed | low | task_01 |
| 03 | Define sheet types, Zod parser, and bundled catalog JSON | completed | medium | task_01 |
| 04 | DB-first schema resolver with bundled fallback | completed | medium | task_02, task_03 |
| 05 | Recursive-descent formula evaluator | completed | medium | task_01 |
| 06 | Modifier merger and derivation orchestrator | completed | medium | task_03, task_05 |
| 07 | Dynamic Zod patch-schema generator | completed | medium | task_03 |
| 08 | Update seed: populate rulesJson and backfill sheets | completed | medium | task_02, task_03 |
| 09 | Extend POST /api/characters to create sheet in transaction | completed | low | task_02, task_04 |
| 10 | New GET/PATCH /api/characters/[..]/sheet routes | completed | medium | task_04, task_06, task_07 |
| 11 | Extend conditions PATCH to accept modifiersJson | completed | low | task_02 |
| 12 | Extract useDebouncedAutosave hook from TiptapEditor | completed | low | task_01 |
| 13 | Sheet primitive field components | completed | medium | task_01, task_03 |
| 14 | RepeatingListField with useFieldArray | completed | medium | task_01, task_03 |
| 15 | SheetRenderer with RHF, autosave, and live derivation | completed | high | task_06, task_07, task_12, task_13, task_14 |
| 16 | Refactor CharacterDetailClient into three-tab layout | completed | medium | task_10, task_15 |
| 17 | Redesign BodyMap with anatomical SVG and modifier display | completed | medium | task_11 |
