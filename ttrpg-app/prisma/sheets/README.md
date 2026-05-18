# Sheet schemas — source of truth

The JSON files in this folder (`dnd-5e.json`, `tormenta20.json`, `generic.json`)
are the canonical, version-controlled definitions of each system's character
sheet schema. They are loaded by:

- `prisma/seed.ts` — writes the raw JSON into `System.rulesJson` for each seeded
  system and uses `extractDefaults` from `src/lib/sheets/defaults.ts` to
  initialise every demo character's `CharacterSheet.dataJson`.
- `src/lib/sheets/bundled.ts` — imports them at build time so the runtime can
  fall back when `System.rulesJson` is missing, malformed, or older than the
  bundled `schemaVersion` (see ADR-004).

## Editing rules

- **Bump `schemaVersion` whenever the shape changes** (fields added/removed,
  types changed, options reordered for a `select`). The resolver caches per
  `(systemSlug, schemaVersion)` — without a bump, stale schemas may stick in
  long-running processes.
- Validate edits with `parseSheetSchema` (Zod) — `npm run test` exercises this
  via `tests/lib/sheets-catalogs.test.ts`.
- Keep `injuryPresets` aligned with the `BodyRegion` and `ConditionSeverity`
  enums in `src/lib/bodyRegions.ts`.
- Hand-editing `System.rulesJson` in the DB is allowed but must bump
  `schemaVersion` for the same reason; otherwise the bundled file wins on the
  next process start (see `loadSheetSchema`).
