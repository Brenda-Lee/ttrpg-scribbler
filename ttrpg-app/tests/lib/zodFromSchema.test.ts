import { beforeEach, describe, expect, it } from "vitest";
import {
  buildPatchSchema,
  buildResolverSchema,
  clearZodSchemaCache,
} from "@/lib/sheets/zodFromSchema";
import type { SheetSchema } from "@/lib/sheets/types";

function makeSchema(): SheetSchema {
  return {
    systemSlug: "demo",
    schemaVersion: 1,
    sections: [
      {
        id: "identity",
        title: "Identidade",
        fields: [
          { id: "nome", label: "Nome", type: "text" },
          { id: "notas", label: "Notas", type: "textarea" },
          { id: "nivel", label: "Nível", type: "number", default: 1 },
          { id: "inspirado", label: "Inspirado", type: "checkbox", default: false },
          {
            id: "alinhamento",
            label: "Alinhamento",
            type: "select",
            options: ["Bom", "Neutro", "Mau"],
          },
          {
            id: "ataques",
            label: "Ataques",
            type: "repeating-list",
            itemSchema: [
              { id: "nome", label: "Nome", type: "text" },
              { id: "dano", label: "Dano", type: "number", default: 0 },
            ],
          },
          {
            id: "mod_nivel",
            label: "Mod nível",
            type: "derived",
            formula: "nivel + 1",
          },
        ],
      },
    ],
    injuryPresets: [],
  };
}

beforeEach(() => {
  clearZodSchemaCache();
});

describe("buildPatchSchema — server flavour", () => {
  it("accepts a partial patch with a single valid text field", () => {
    const schema = buildPatchSchema(makeSchema());
    const parsed = schema.safeParse({ nome: "Aria" });

    expect(parsed.success).toBe(true);
  });

  it("rejects an unknown top-level key under .strict()", () => {
    const schema = buildPatchSchema(makeSchema());
    const parsed = schema.safeParse({ nome: "Aria", unknown_key: 42 });

    expect(parsed.success).toBe(false);
  });

  it("rejects a string sent where a number is expected", () => {
    const schema = buildPatchSchema(makeSchema());
    const parsed = schema.safeParse({ nivel: "5" });

    expect(parsed.success).toBe(false);
  });

  it("rejects a select value that is not in the declared options", () => {
    const schema = buildPatchSchema(makeSchema());
    const parsed = schema.safeParse({ alinhamento: "Caotico Bom" });

    expect(parsed.success).toBe(false);
  });

  it("validates a repeating-list item and rejects unknown keys inside the item", () => {
    const schema = buildPatchSchema(makeSchema());

    const ok = schema.safeParse({
      ataques: [{ nome: "Espada longa", dano: 8 }],
    });
    expect(ok.success).toBe(true);

    const bad = schema.safeParse({
      ataques: [{ nome: "Espada", dano: 8, alcance: "5m" }],
    });
    expect(bad.success).toBe(false);
  });

  it("rejects a derived field id as an unknown key (read-only)", () => {
    const schema = buildPatchSchema(makeSchema());
    const parsed = schema.safeParse({ mod_nivel: 5 });

    expect(parsed.success).toBe(false);
  });

  it("accepts an empty patch (all top-level keys optional)", () => {
    const schema = buildPatchSchema(makeSchema());
    const parsed = schema.safeParse({});

    expect(parsed.success).toBe(true);
  });

  it("accepts mixed valid fields in a single patch", () => {
    const schema = buildPatchSchema(makeSchema());
    const parsed = schema.safeParse({
      nome: "Aria",
      nivel: 3,
      inspirado: true,
      alinhamento: "Neutro",
      notas: "Texto livre",
    });

    expect(parsed.success).toBe(true);
  });
});

describe("buildResolverSchema — form flavour", () => {
  function fullValues() {
    return {
      nome: "Aria",
      notas: "",
      nivel: 1,
      inspirado: false,
      alinhamento: "Bom",
      ataques: [],
    };
  }

  it("accepts a fully-populated default form payload", () => {
    const schema = buildResolverSchema(makeSchema());
    const parsed = schema.safeParse(fullValues());

    expect(parsed.success).toBe(true);
  });

  it("coerces strings to numbers for number fields", () => {
    const schema = buildResolverSchema(makeSchema());
    const parsed = schema.safeParse({ ...fullValues(), nivel: "7" });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect((parsed.data as { nivel: number }).nivel).toBe(7);
    }
  });

  it("coerces strings to numbers in nested repeating-list items", () => {
    const schema = buildResolverSchema(makeSchema());
    const parsed = schema.safeParse({
      ...fullValues(),
      ataques: [{ nome: "Espada", dano: "10" }],
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      const data = parsed.data as {
        ataques: { dano: number }[];
      };
      expect(data.ataques[0].dano).toBe(10);
    }
  });

  it("requires all top-level keys (no .optional() in resolver)", () => {
    const schema = buildResolverSchema(makeSchema());
    const parsed = schema.safeParse({});

    expect(parsed.success).toBe(false);
  });

  it("rejects unknown top-level keys under .strict()", () => {
    const schema = buildResolverSchema(makeSchema());
    const parsed = schema.safeParse({ ...fullValues(), extra: 1 });

    expect(parsed.success).toBe(false);
  });

  it("excludes derived fields from the resolver shape", () => {
    const schema = buildResolverSchema(makeSchema());
    const parsed = schema.safeParse({ ...fullValues(), mod_nivel: 99 });

    expect(parsed.success).toBe(false);
  });
});

describe("cache behaviour", () => {
  it("returns the same Zod instance for repeated calls with the same (slug, version)", () => {
    const a = buildPatchSchema(makeSchema());
    const b = buildPatchSchema(makeSchema());

    expect(b).toBe(a);

    const ra = buildResolverSchema(makeSchema());
    const rb = buildResolverSchema(makeSchema());
    expect(rb).toBe(ra);
  });

  it("returns distinct instances for patch vs resolver schemas", () => {
    const patch = buildPatchSchema(makeSchema());
    const resolver = buildResolverSchema(makeSchema());

    expect(resolver).not.toBe(patch as unknown);
  });

  it("clearZodSchemaCache forces a fresh compilation on the next call", () => {
    const first = buildPatchSchema(makeSchema());
    clearZodSchemaCache();
    const second = buildPatchSchema(makeSchema());

    expect(second).not.toBe(first);
  });

  it("returns distinct instances when schemaVersion bumps", () => {
    const v1 = buildPatchSchema(makeSchema());
    const bumped = { ...makeSchema(), schemaVersion: 2 };
    const v2 = buildPatchSchema(bumped);

    expect(v2).not.toBe(v1);
  });
});
