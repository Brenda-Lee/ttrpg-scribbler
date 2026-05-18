import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { parseSheetSchema } from "@/lib/sheets/parser";
import {
  buildPatchSchema,
  buildResolverSchema,
  clearZodSchemaCache,
} from "@/lib/sheets/zodFromSchema";

const DND5E_PATH = path.resolve("prisma/sheets/dnd-5e.json");

function loadDnd5e() {
  const raw = JSON.parse(fs.readFileSync(DND5E_PATH, "utf-8"));
  return parseSheetSchema(raw);
}

beforeEach(() => {
  clearZodSchemaCache();
});

describe("zodFromSchema (integration) — D&D 5e bundled catalog", () => {
  it("accepts a realistic patch covering nested attacks[], spells[], and equipment[]", () => {
    const schema = buildPatchSchema(loadDnd5e());

    const patch = {
      class_level: "Mago 5",
      race: "Elfo",
      background: "Sábio",
      alignment: "Neutro",
      xp: 6500,
      str: 8,
      dex: 14,
      con: 12,
      int: 18,
      wis: 12,
      cha: 10,
      proficiency: 3,
      inspiration: true,
      ca: 12,
      hp_max: 26,
      hp_current: 21,
      hit_die: "d6",
      speed: 9,
      save_int: true,
      save_wis: true,
      skills: [
        { name: "Arcanismo", proficient: true },
        { name: "História", proficient: true },
      ],
      attacks: [
        { name: "Adaga", bonus: 4, damage: "1d4+2" },
        { name: "Cajado de combate", bonus: 1, damage: "1d6-1" },
      ],
      spells: [
        { name: "Bola de Fogo", level: "3" },
        { name: "Mãos Mágicas", level: "truque" },
      ],
      items: [
        { name: "Componentes mágicos", qty: 1 },
        { name: "Mochila", qty: 1 },
        { name: "Tochas", qty: 10 },
      ],
      traits: "Curioso e metódico.",
      ideals: "Conhecimento acima de tudo.",
      bonds: "Devo lealdade à torre.",
      flaws: "Subestima quem não estuda.",
      proficiencies: "Cajados, adagas, livros arcanos",
      languages: "Comum, Élfico, Draconiano",
    };

    const parsed = schema.safeParse(patch);
    if (!parsed.success) {
      throw new Error(JSON.stringify(parsed.error.issues, null, 2));
    }
    expect(parsed.success).toBe(true);
  });

  it("rejects a derived field (e.g., str_mod) sent in the patch body", () => {
    const schema = buildPatchSchema(loadDnd5e());

    const parsed = schema.safeParse({ str_mod: 99 });
    expect(parsed.success).toBe(false);
  });

  it("rejects an unknown nested key inside an attacks item", () => {
    const schema = buildPatchSchema(loadDnd5e());

    const parsed = schema.safeParse({
      attacks: [{ name: "Adaga", bonus: 4, damage: "1d4+2", crit: "19-20" }],
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects an invalid select value for spell level", () => {
    const schema = buildPatchSchema(loadDnd5e());

    const parsed = schema.safeParse({
      spells: [{ name: "Magia inválida", level: "11" }],
    });
    expect(parsed.success).toBe(false);
  });

  it("buildResolverSchema accepts string-typed numbers for nested item.qty", () => {
    const schema = buildResolverSchema(loadDnd5e());

    const defaults = {
      class_level: "",
      race: "",
      background: "",
      alignment: "Neutro",
      xp: 0,
      str: 10,
      dex: 10,
      con: 10,
      int: 10,
      wis: 10,
      cha: 10,
      proficiency: 2,
      inspiration: false,
      ca: 10,
      hp_max: 8,
      hp_current: 8,
      hit_die: "d8",
      speed: 9,
      save_str: false,
      save_dex: false,
      save_con: false,
      save_int: false,
      save_wis: false,
      save_cha: false,
      skills: [],
      attacks: [],
      spells: [],
      items: [{ name: "Mochila", qty: "1" }],
      traits: "",
      ideals: "",
      bonds: "",
      flaws: "",
      proficiencies: "",
      languages: "",
    };

    const parsed = schema.safeParse(defaults);
    if (!parsed.success) {
      throw new Error(JSON.stringify(parsed.error.issues, null, 2));
    }
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      const data = parsed.data as { items: { qty: number }[] };
      expect(data.items[0].qty).toBe(1);
    }
  });
});
