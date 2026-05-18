import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { parseSheetSchema } from "@/lib/sheets/parser";
import type { SheetField } from "@/lib/sheets/types";

const CATALOG_DIR = path.resolve("prisma/sheets");

function loadCatalog(slug: string) {
  const raw = fs.readFileSync(path.join(CATALOG_DIR, `${slug}.json`), "utf-8");
  return parseSheetSchema(JSON.parse(raw));
}

function findFieldsOfType(fields: SheetField[], type: string, acc: SheetField[] = []) {
  for (const field of fields) {
    if (field.type === type) acc.push(field);
    if (field.itemSchema) findFieldsOfType(field.itemSchema, type, acc);
  }
  return acc;
}

describe("bundled sheet catalogs", () => {
  it("parses prisma/sheets/generic.json without errors", () => {
    const schema = loadCatalog("generic");
    expect(schema.systemSlug).toBe("generic");
    expect(schema.schemaVersion).toBe(1);
    expect(schema.sections.length).toBeGreaterThan(0);
  });

  it("parses prisma/sheets/dnd-5e.json without errors", () => {
    const schema = loadCatalog("dnd-5e");
    expect(schema.systemSlug).toBe("dnd-5e");
    expect(schema.schemaVersion).toBe(1);
    expect(schema.sections.length).toBeGreaterThan(0);
  });

  it("parses prisma/sheets/tormenta20.json without errors", () => {
    const schema = loadCatalog("tormenta20");
    expect(schema.systemSlug).toBe("tormenta20");
    expect(schema.schemaVersion).toBe(1);
    expect(schema.sections.length).toBeGreaterThan(0);
  });

  it("the dnd-5e catalog declares at least one derived field", () => {
    const schema = loadCatalog("dnd-5e");
    const derived = schema.sections.flatMap((s) => findFieldsOfType(s.fields, "derived"));
    expect(derived.length).toBeGreaterThan(0);
  });

  it("the tormenta20 catalog declares at least one derived field", () => {
    const schema = loadCatalog("tormenta20");
    const derived = schema.sections.flatMap((s) => findFieldsOfType(s.fields, "derived"));
    expect(derived.length).toBeGreaterThan(0);
  });

  it("the dnd-5e catalog covers HEAD and LEG injury presets at SEVERE+CRITICAL", () => {
    const schema = loadCatalog("dnd-5e");
    const keys = new Set(schema.injuryPresets.map((p) => `${p.region}:${p.severity}`));
    expect(keys.has("HEAD:SEVERE")).toBe(true);
    expect(keys.has("HEAD:CRITICAL")).toBe(true);
    expect(keys.has("LEFT_LEG:SEVERE")).toBe(true);
    expect(keys.has("LEFT_LEG:CRITICAL")).toBe(true);
    expect(keys.has("RIGHT_LEG:SEVERE")).toBe(true);
    expect(keys.has("RIGHT_LEG:CRITICAL")).toBe(true);
  });

  it("the tormenta20 catalog covers HEAD and LEG injury presets at SEVERE+CRITICAL", () => {
    const schema = loadCatalog("tormenta20");
    const keys = new Set(schema.injuryPresets.map((p) => `${p.region}:${p.severity}`));
    expect(keys.has("HEAD:SEVERE")).toBe(true);
    expect(keys.has("HEAD:CRITICAL")).toBe(true);
    expect(keys.has("LEFT_LEG:SEVERE")).toBe(true);
    expect(keys.has("LEFT_LEG:CRITICAL")).toBe(true);
    expect(keys.has("RIGHT_LEG:SEVERE")).toBe(true);
    expect(keys.has("RIGHT_LEG:CRITICAL")).toBe(true);
  });
});
