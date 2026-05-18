import { describe, expect, it } from "vitest";
import { parseSheetSchema, SheetSchemaZ } from "@/lib/sheets/parser";

function minimalSchema() {
  return {
    systemSlug: "demo",
    schemaVersion: 1,
    sections: [
      {
        id: "s1",
        title: "Section",
        fields: [{ id: "name", type: "text" }],
      },
    ],
    injuryPresets: [],
  };
}

describe("parseSheetSchema", () => {
  it("accepts a minimal valid schema and returns a typed SheetSchema", () => {
    const result = parseSheetSchema(minimalSchema());
    expect(result.systemSlug).toBe("demo");
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].fields[0].id).toBe("name");
    expect(result.injuryPresets).toEqual([]);
  });

  it("rejects unknown keys at the schema root via .strict()", () => {
    const raw = { ...minimalSchema(), extraneous: true };
    expect(() => parseSheetSchema(raw)).toThrow();
  });

  it("rejects unknown keys on a field via .strict()", () => {
    const raw = minimalSchema();
    (raw.sections[0].fields[0] as Record<string, unknown>).bogus = 1;
    expect(() => parseSheetSchema(raw)).toThrow();
  });

  it("rejects a select field with empty options", () => {
    const raw = minimalSchema();
    raw.sections[0].fields[0] = {
      id: "color",
      type: "select",
      options: [],
    } as unknown as (typeof raw.sections)[0]["fields"][0];
    expect(() => parseSheetSchema(raw)).toThrow(/options/);
  });

  it("rejects a select field with missing options", () => {
    const raw = minimalSchema();
    raw.sections[0].fields[0] = {
      id: "color",
      type: "select",
    } as unknown as (typeof raw.sections)[0]["fields"][0];
    expect(() => parseSheetSchema(raw)).toThrow(/options/);
  });

  it("rejects a derived field with empty formula", () => {
    const raw = minimalSchema();
    raw.sections[0].fields[0] = {
      id: "result",
      type: "derived",
      formula: "",
    } as unknown as (typeof raw.sections)[0]["fields"][0];
    expect(() => parseSheetSchema(raw)).toThrow(/formula/);
  });

  it("rejects a repeating-list field with empty itemSchema", () => {
    const raw = minimalSchema();
    raw.sections[0].fields[0] = {
      id: "items",
      type: "repeating-list",
      itemSchema: [],
    } as unknown as (typeof raw.sections)[0]["fields"][0];
    expect(() => parseSheetSchema(raw)).toThrow(/itemSchema/);
  });

  it("accepts a repeating-list field whose inner items are valid", () => {
    const raw = minimalSchema();
    raw.sections[0].fields[0] = {
      id: "items",
      type: "repeating-list",
      itemSchema: [
        { id: "name", type: "text" },
        { id: "qty", type: "number", default: 1 },
      ],
    } as unknown as (typeof raw.sections)[0]["fields"][0];
    const result = parseSheetSchema(raw);
    expect(result.sections[0].fields[0].itemSchema).toHaveLength(2);
  });

  it("rejects an InjuryPreset with an unknown region", () => {
    const raw = minimalSchema();
    raw.injuryPresets = [
      {
        region: "TAIL" as unknown as "HEAD",
        severity: "SEVERE",
        modifiers: [{ field: "speed", delta: -1 }],
      },
    ];
    expect(() => parseSheetSchema(raw)).toThrow();
  });

  it("rejects an InjuryPreset with an unknown severity", () => {
    const raw = minimalSchema();
    raw.injuryPresets = [
      {
        region: "HEAD",
        severity: "FATAL" as unknown as "SEVERE",
        modifiers: [{ field: "wis", delta: -1 }],
      },
    ];
    expect(() => parseSheetSchema(raw)).toThrow();
  });

  it("rejects a schema with zero sections", () => {
    const raw = minimalSchema();
    raw.sections = [];
    expect(() => parseSheetSchema(raw)).toThrow();
  });

  it("exposes the underlying Zod schema as SheetSchemaZ", () => {
    expect(SheetSchemaZ.safeParse(minimalSchema()).success).toBe(true);
  });
});
