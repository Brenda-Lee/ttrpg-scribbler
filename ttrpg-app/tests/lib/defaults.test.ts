import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { extractDefaults } from "@/lib/sheets/defaults";
import { parseSheetSchema } from "@/lib/sheets/parser";
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
          { id: "bio", label: "Bio", type: "textarea" },
          { id: "nivel", label: "Nível", type: "number", default: 1 },
          { id: "xp", label: "XP", type: "number" },
          { id: "inspirado", label: "Inspirado", type: "checkbox", default: true },
          { id: "ativo", label: "Ativo", type: "checkbox" },
          {
            id: "alinhamento",
            label: "Alinhamento",
            type: "select",
            options: ["Bom", "Neutro", "Mau"],
            default: "Neutro",
          },
          {
            id: "raca",
            label: "Raça",
            type: "select",
            options: ["Humano", "Elfo", "Anão"],
          },
          {
            id: "ataques",
            label: "Ataques",
            type: "repeating-list",
            itemSchema: [
              { id: "nome", type: "text" },
              { id: "dano", type: "number", default: 0 },
            ],
          },
          {
            id: "mod_nivel",
            label: "Mod",
            type: "derived",
            formula: "nivel + 1",
          },
        ],
      },
    ],
    injuryPresets: [],
  };
}

describe("extractDefaults", () => {
  it("returns a map keyed by field id", () => {
    const defaults = extractDefaults(makeSchema());
    expect(defaults).toEqual({
      nome: "",
      bio: "",
      nivel: 1,
      xp: 0,
      inspirado: true,
      ativo: false,
      alinhamento: "Neutro",
      raca: "Humano",
      ataques: [],
    });
  });

  it("skips derived fields entirely", () => {
    const defaults = extractDefaults(makeSchema());
    expect(defaults).not.toHaveProperty("mod_nivel");
  });

  it("defaults repeating-list to [] when no `default` is declared", () => {
    const defaults = extractDefaults(makeSchema());
    expect(defaults.ataques).toEqual([]);
  });

  it("preserves an explicit `default` value when one is supplied", () => {
    const defaults = extractDefaults(makeSchema());
    expect(defaults.nivel).toBe(1);
    expect(defaults.inspirado).toBe(true);
    expect(defaults.alinhamento).toBe("Neutro");
  });

  it("falls back to type-sensible defaults when none is supplied", () => {
    const defaults = extractDefaults(makeSchema());
    expect(defaults.nome).toBe("");
    expect(defaults.bio).toBe("");
    expect(defaults.xp).toBe(0);
    expect(defaults.ativo).toBe(false);
    expect(defaults.raca).toBe("Humano");
  });

  it("handles the bundled tormenta20 schema without error", () => {
    const raw = JSON.parse(
      fs.readFileSync(path.resolve("prisma/sheets/tormenta20.json"), "utf-8"),
    );
    const schema = parseSheetSchema(raw);

    const defaults = extractDefaults(schema);

    expect(defaults.for).toBe(0);
    expect(defaults.defesa_base).toBe(10);
    expect(defaults.tamanho).toBe("Médio");
    expect(defaults.pericias).toEqual([]);
    expect(defaults).not.toHaveProperty("defesa_efetiva");
  });

  it("handles the bundled dnd-5e schema without error", () => {
    const raw = JSON.parse(
      fs.readFileSync(path.resolve("prisma/sheets/dnd-5e.json"), "utf-8"),
    );
    const schema = parseSheetSchema(raw);

    const defaults = extractDefaults(schema);

    expect(defaults.str).toBe(10);
    expect(defaults.ca).toBe(10);
    expect(defaults.hit_die).toBe("d8");
    expect(defaults.attacks).toEqual([]);
    expect(defaults).not.toHaveProperty("str_mod");
    expect(defaults).not.toHaveProperty("passive_wisdom");
  });
});
